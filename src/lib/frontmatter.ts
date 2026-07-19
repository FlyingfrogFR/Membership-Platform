import { loadAll } from 'js-yaml'

export interface FrontmatterResult {
  data: unknown
  body: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

// js-yaml's load() throws on empty or comments-only input; an empty document is
// a legitimate content state (e.g. a cleared needs file), so map it to null.
export function loadYamlDocument(raw: string): unknown {
  const documents = loadAll(stripBom(raw))
  return documents[0] ?? null
}

export function parseFrontmatter(raw: string, source = 'content file'): FrontmatterResult {
  const clean = stripBom(raw)
  const match = FRONTMATTER_RE.exec(clean)
  if (!match) {
    throw new Error(`${source}: missing YAML frontmatter (expected a leading "---" block)`)
  }
  return { data: loadYamlDocument(match[1]), body: clean.slice(match[0].length).trim() }
}

function stripBom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw
}
