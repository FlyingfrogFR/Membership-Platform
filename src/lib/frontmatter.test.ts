import { describe, expect, it } from 'vitest'
import { loadYamlDocument, parseFrontmatter } from './frontmatter'

describe('parseFrontmatter', () => {
  it('separates YAML data from the markdown body', () => {
    const { data, body } = parseFrontmatter('---\ntitle: "Test"\n---\n\nLe corps.\n')
    expect(data).toEqual({ title: 'Test' })
    expect(body).toBe('Le corps.')
  })

  it('handles CRLF line endings', () => {
    const { data, body } = parseFrontmatter('---\r\ntitle: "Test"\r\n---\r\nCorps.')
    expect(data).toEqual({ title: 'Test' })
    expect(body).toBe('Corps.')
  })

  it('returns an empty body when the file only holds frontmatter', () => {
    const { body } = parseFrontmatter('---\ntitle: "Test"\n---\n')
    expect(body).toBe('')
  })

  it('throws when the frontmatter block is missing', () => {
    expect(() => parseFrontmatter('just some text', 'foo.md')).toThrow(/foo\.md/)
  })

  it('strips a UTF-8 BOM before parsing', () => {
    const { data } = parseFrontmatter('\uFEFF---\ntitle: "Test"\n---\n')
    expect(data).toEqual({ title: 'Test' })
  })
})

describe('loadYamlDocument', () => {
  it('returns null for empty or comments-only input', () => {
    expect(loadYamlDocument('')).toBeNull()
    expect(loadYamlDocument('# rien pour le moment\n')).toBeNull()
  })

  it('parses a regular document', () => {
    expect(loadYamlDocument('a: 1')).toEqual({ a: 1 })
  })
})
