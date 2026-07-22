import { describe, expect, it } from 'vitest'
import { DISCORD_MESSAGE_LIMIT, formatEditionForDiscord } from './discord'
import type { Edition } from './schemas'

function makeEdition(overrides: Partial<Edition> = {}): Edition {
  return {
    title: 'Point vACC — T2 2026',
    slug: '2026-q2',
    published: new Date('2026-06-30'),
    intro: 'Un trimestre bien rempli.',
    body: '',
    departments: [
      { name: 'Event Team', done: ['Real Ops Paris'], in_progress: [], next: [], help_wanted: [], images: [] },
      { name: 'Nav Team', done: ['Cartes LFPG publiées'], in_progress: ['Doc LFLL'], next: [], help_wanted: [], images: [] },
    ],
    ...overrides,
  }
}

describe('formatEditionForDiscord', () => {
  it('produces a single unnumbered chunk for a short edition', () => {
    const chunks = formatEditionForDiscord(makeEdition())
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).not.toContain('(message')
    expect(chunks[0]).toContain('**📍 Point vACC — T2 2026**')
    expect(chunks[0]).toContain('**Nav Team**')
    expect(chunks[0]).toContain('✅ Fait :')
    expect(chunks[0]).toContain('- Cartes LFPG publiées')
  })

  it('orders departments by the configured display order, not file order', () => {
    const [chunk] = formatEditionForDiscord(makeEdition())
    expect(chunk.indexOf('**Nav Team**')).toBeLessThan(chunk.indexOf('**Event Team**'))
  })

  it('omits empty sections and empty departments', () => {
    const chunks = formatEditionForDiscord(
      makeEdition({
        departments: [
          { name: 'Nav Team', done: ['Une seule chose'], in_progress: [], next: [], help_wanted: [], images: [] },
          { name: 'Doc Team', done: [], in_progress: [], next: [], help_wanted: [], images: [] },
        ],
      }),
    )
    expect(chunks[0]).not.toContain('🔜')
    expect(chunks[0]).not.toContain('🙋')
    expect(chunks[0]).not.toContain('**Doc Team**')
  })

  it('includes the markdown body when present', () => {
    const chunks = formatEditionForDiscord(makeEdition({ body: 'Merci à tous.' }))
    expect(chunks[0]).toContain('Merci à tous.')
  })

  it('splits long editions into numbered chunks under the Discord limit', () => {
    const longItems = Array.from({ length: 30 }, (_, i) => `Élément numéro ${i} — ${'x'.repeat(80)}`)
    const edition = makeEdition({
      departments: (['Nav Team', 'Doc Team', 'Event Team', 'Digital Team'] as const).map((name) => ({
        name,
        done: longItems,
        in_progress: [],
        next: [],
        help_wanted: [],
        images: [],
      })),
    })
    const chunks = formatEditionForDiscord(edition)
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((chunk, i) => {
      expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT)
      expect(chunk).toContain(`*(message ${i + 1}/${chunks.length})*`)
    })
  })

  it('keeps every line of a long edition', () => {
    const items = Array.from({ length: 60 }, (_, i) => `Ligne ${i}`)
    const edition = makeEdition({
      departments: [{ name: 'Nav Team', done: items, in_progress: [], next: [], help_wanted: [], images: [] }],
    })
    const joined = formatEditionForDiscord(edition).join('\n')
    for (const item of items) expect(joined).toContain(`- ${item}`)
  })
})
