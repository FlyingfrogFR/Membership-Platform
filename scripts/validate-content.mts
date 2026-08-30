// Build-time validation of everything under /content. A malformed edition or
// needs file must fail the build (npm run build), never the live site.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { ZodError } from 'zod'
import { slugify } from '../src/lib/compose'
import { loadYamlDocument, parseFrontmatter } from '../src/lib/frontmatter'
import {
  coordinationFileSchema,
  editionSchema,
  editionSectionFileSchema,
  needsFileSchema,
  ticketLogFileSchema,
} from '../src/lib/schemas'

const root = path.resolve(import.meta.dirname, '..')
const editionsDir = path.join(root, 'content', 'point-vacc')
const needsFile = path.join(root, 'content', 'contribuer', 'needs.yaml')
const ticketLogFile = path.join(root, 'content', 'membership', 'tickets-log.yaml')

let failed = false

function report(file: string, errors: string[]) {
  const relative = path.relative(root, file)
  if (errors.length === 0) {
    console.log(`OK    ${relative}`)
  } else {
    failed = true
    console.error(`ERROR ${relative}`)
    for (const error of errors) console.error(`      - ${error}`)
  }
}

function describeError(error: unknown): string[] {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
  }
  return [error instanceof Error ? error.message : String(error)]
}

const editionFiles = existsSync(editionsDir)
  ? readdirSync(editionsDir).filter((name) => name.endsWith('.md')).sort()
  : []
if (editionFiles.length === 0) console.log('note  no Point vACC editions found (that is a valid state)')

const seenSlugs = new Map<string, string>()
for (const file of editionFiles) {
  const fullPath = path.join(editionsDir, file)
  const errors: string[] = []
  try {
    const { data } = parseFrontmatter(readFileSync(fullPath, 'utf8'), file)
    const edition = editionSchema.parse(data)
    const expectedSlug = path.basename(file, '.md').toLowerCase()
    if (edition.slug !== expectedSlug) {
      errors.push(`slug "${edition.slug}" does not match file name (expected "${expectedSlug}")`)
    }
    const duplicate = seenSlugs.get(edition.slug)
    if (duplicate) errors.push(`slug "${edition.slug}" already used by ${duplicate}`)
    seenSlugs.set(edition.slug, file)
    const names = edition.departments.map((d) => d.name)
    for (const name of new Set(names.filter((n, i) => names.indexOf(n) !== i))) {
      errors.push(`department "${name}" appears more than once`)
    }
    // A referenced repo image that was never uploaded must fail the build here,
    // not 404 on the live site.
    for (const dept of edition.departments) {
      for (const image of dept.images) {
        if (!image.src.startsWith('/')) continue
        const imagePath = path.join(root, 'public', decodeURIComponent(image.src))
        if (!existsSync(imagePath)) {
          errors.push(`${dept.name}: image "${image.src}" not found (expected at public${image.src})`)
        }
      }
    }
  } catch (error) {
    errors.push(...describeError(error))
  }
  report(fullPath, errors)
}

// Per-team draft sections: one YAML object per file, named after the team,
// grouped under the target edition's slug. Same image rule as editions.
const draftsRoot = path.join(editionsDir, 'drafts')
if (existsSync(draftsRoot)) {
  const slugDirs = readdirSync(draftsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  for (const slugDir of slugDirs) {
    const dirErrors: string[] = []
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugDir)) {
      dirErrors.push(`draft directory "${slugDir}" must be a kebab-case edition slug (e.g. 2026-q3)`)
      report(path.join(draftsRoot, slugDir), dirErrors)
      continue
    }
    const files = readdirSync(path.join(draftsRoot, slugDir)).filter((name) => name.endsWith('.yaml')).sort()
    if (files.length === 0) report(path.join(draftsRoot, slugDir), ['no .yaml draft section in this directory'])
    for (const file of files) {
      const fullPath = path.join(draftsRoot, slugDir, file)
      const errors: string[] = []
      try {
        const section = editionSectionFileSchema.parse(loadYamlDocument(readFileSync(fullPath, 'utf8')))
        const expected = `${slugify(section.name)}.yaml`
        if (file !== expected) errors.push(`file name should be "${expected}" for team "${section.name}"`)
        for (const image of section.images) {
          if (!image.src.startsWith('/')) continue
          const imagePath = path.join(root, 'public', decodeURIComponent(image.src))
          if (!existsSync(imagePath)) {
            errors.push(`image "${image.src}" not found (expected at public${image.src}) — upload images before merging the draft`)
          }
        }
      } catch (error) {
        errors.push(...describeError(error))
      }
      report(fullPath, errors)
    }
  }
}

{
  const errors: string[] = []
  try {
    // The app imports this file statically, so its absence must fail loudly here
    // with a clear message rather than as an opaque bundler error.
    if (!existsSync(needsFile)) throw new Error('file is missing (an empty board is fine, but the file must exist)')
    const needs = needsFileSchema.parse(loadYamlDocument(readFileSync(needsFile, 'utf8')))
    const ids = needs.map((need) => need.id)
    for (const id of new Set(ids.filter((n, i) => ids.indexOf(n) !== i))) {
      errors.push(`id "${id}" appears more than once`)
    }
  } catch (error) {
    errors.push(...describeError(error))
  }
  report(needsFile, errors)
}

const coordinationFile = path.join(root, 'content', 'membership', 'coordination.yaml')
if (existsSync(coordinationFile)) {
  const errors: string[] = []
  try {
    const entries = coordinationFileSchema.parse(loadYamlDocument(readFileSync(coordinationFile, 'utf8')))
    const months = entries.map((entry) => entry.month)
    for (const month of new Set(months.filter((m, i) => months.indexOf(m) !== i))) {
      errors.push(`month "${month}" appears more than once`)
    }
  } catch (error) {
    errors.push(...describeError(error))
  }
  report(coordinationFile, errors)
}

if (existsSync(ticketLogFile)) {
  const errors: string[] = []
  try {
    const log = ticketLogFileSchema.parse(loadYamlDocument(readFileSync(ticketLogFile, 'utf8')))
    const ids = log.map((entry) => entry.id)
    for (const id of new Set(ids.filter((n, i) => ids.indexOf(n) !== i))) {
      errors.push(`id "${id}" appears more than once`)
    }
  } catch (error) {
    errors.push(...describeError(error))
  }
  report(ticketLogFile, errors)
} else {
  console.log('note  no Membership ticket log found (that is a valid state)')
}

if (failed) {
  console.error('\nContent validation failed.')
  process.exit(1)
}
console.log('\nAll content files are valid.')
