/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fr } from './src/i18n/fr'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
