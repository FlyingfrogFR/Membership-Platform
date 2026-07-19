import { load } from 'js-yaml'

export interface FrontmatterResult {
  data: unknown
  body: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function parseFrontmatter(raw: string, source = 'content file'): FrontmatterResult {
  const match = FRONTMATTER_RE.exec(raw)
  if (!match) {
    throw new Error(`${source}: missing YAML frontmatter (expected a leading "---" block)`)
  }
  return { data: load(match[1]), body: raw.slice(match[0].length).trim() }
}
