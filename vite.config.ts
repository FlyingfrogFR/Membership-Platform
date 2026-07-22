/// <reference types="vitest/config" />
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fr } from './src/i18n/fr'
import { loadYamlDocument, parseFrontmatter } from './src/lib/frontmatter'
import { coordinationFileSchema, editionSchema, needsFileSchema, ticketLogFileSchema } from './src/lib/schemas'

// Parses and validates everything under /content at BUILD time and serves it to
// the app as plain JSON via a virtual module. The browser therefore never ships
// js-yaml or zod for reading content (they remain only in the lazy composer
// chunks that generate YAML). Invalid content fails the build here, mirroring
// scripts/validate-content.ts.
function vaccContent(): Plugin {
  const virtualId = 'virtual:vacc-content'
  const resolvedId = `\0${virtualId}`
  const root = import.meta.dirname

  function build(): string {
    const editionsDir = path.join(root, 'content', 'point-vacc')
    const editions = (existsSync(editionsDir) ? readdirSync(editionsDir).filter((f) => f.endsWith('.md')).sort() : []).map(
      (file) => {
        const { data, body } = parseFrontmatter(readFileSync(path.join(editionsDir, file), 'utf8'), file)
        return { ...editionSchema.parse(data), body }
      },
    )
    const needs = needsFileSchema.parse(loadYamlDocument(readFileSync(path.join(root, 'content/contribuer/needs.yaml'), 'utf8')))
    const tickets = ticketLogFileSchema.parse(
      loadYamlDocument(readFileSync(path.join(root, 'content/membership/tickets-log.yaml'), 'utf8')),
    )
    const coordinationFile = path.join(root, 'content/membership/coordination.yaml')
    const coordination = existsSync(coordinationFile)
      ? coordinationFileSchema.parse(loadYamlDocument(readFileSync(coordinationFile, 'utf8')))
      : []
    return `export default ${JSON.stringify({ editions, needs, tickets, coordination })}`
  }

  return {
    name: 'vacc-content',
    resolveId(id) {
      return id === virtualId ? resolvedId : undefined
    },
    load(id) {
      return id === resolvedId ? build() : undefined
    },
    handleHotUpdate({ file, server }) {
      if (!file.includes(`${path.sep}content${path.sep}`)) return
      const mod = server.moduleGraph.getModuleById(resolvedId)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vaccContent(),
    {
      // Keeps the static HTML shell's user-facing strings in src/i18n/fr.ts.
      name: 'inject-i18n-meta',
      transformIndexHtml(html) {
        return html.replaceAll('%APP_TITLE%', fr.site.name).replaceAll('%APP_DESCRIPTION%', fr.site.metaDescription)
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
