// Build-time validation of everything under /content. A malformed edition or
// needs file must fail the build (npm run build), never the live site.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { ZodError } from 'zod'
import { loadYamlDocument, parseFrontmatter } from '../src/lib/frontmatter'
import { editionSchema, needsFileSchema } from '../src/lib/schemas'

const root = path.resolve(import.meta.dirname, '..')
const editionsDir = path.join(root, 'content', 'point-vacc')
const needsFile = path.join(root, 'content', 'contribuer', 'needs.yaml')

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
  } catch (error) {
    errors.push(...describeError(error))
  }
  report(fullPath, errors)
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

if (failed) {
  console.error('\nContent validation failed.')
  process.exit(1)
}
console.log('\nAll content files are valid.')
