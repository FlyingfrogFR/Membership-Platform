import { describe, expect, it } from 'vitest'
import { excerpt } from './format'

describe('excerpt', () => {
  it('keeps a short single paragraph as-is', () => {
    expect(excerpt('Un trimestre bien rempli.')).toBe('Un trimestre bien rempli.')
  })

  it('takes only the first paragraph of a multi-paragraph intro', () => {
    const intro = 'Bonjour à tous,\n\nComme annoncé il y a un mois, voici le premier Point vACC.\n\nMerci !'
    expect(excerpt(intro)).toBe('Bonjour à tous,')
  })

  it('collapses inner line breaks and truncates at a word boundary', () => {
    const paragraph = `${'mot '.repeat(80)}fin`
    const result = excerpt(paragraph.replace('mot mot', 'mot\nmot'))
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(221)
    expect(result).not.toContain('\n')
  })
})
