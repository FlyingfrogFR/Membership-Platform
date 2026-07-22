import { describe, expect, it } from 'vitest'
import { DISCORD_MESSAGE_LIMIT, formatEditionForDiscord, formatNeedsForDiscord } from './discord'
import type { Edition, Need } from './schemas'

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

  it('includes team notes under the team header', () => {
    const chunks = formatEditionForDiscord(
      makeEdition({
        departments: [
          {
            name: 'Nav Team',
            notes: 'Gros trimestre pour la Nav Team.',
            done: ['Cartes publiées'],
            in_progress: [],
            next: [],
            help_wanted: [],
            images: [],
          },
        ],
      }),
    )
    const chunk = chunks[0]
    expect(chunk).toContain('Gros trimestre pour la Nav Team.')
    expect(chunk.indexOf('**Nav Team**')).toBeLessThan(chunk.indexOf('Gros trimestre'))
    expect(chunk.indexOf('Gros trimestre')).toBeLessThan(chunk.indexOf('✅ Fait :'))
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

describe('formatNeedsForDiscord', () => {
  const needs: Need[] = [
    {
      id: 'nav-relecture',
      type: 'ponctuel',
      title: 'Relecture LFPG',
      department: 'Nav Team',
      description: 'Relire la doc avant publication.',
      skills: [],
      time_estimate: '2–3 h',
      contact: 'Ticket Membership',
      status: 'open',
      posted: new Date('2026-07-01'),
    },
    {
      id: 'event-affiche',
      type: 'ponctuel',
      title: 'Affiche de rentrée',
      department: 'Event Team',
      description: 'Créer l’affiche.',
      skills: [],
      contact: 'Référent Event Team',
      status: 'open',
      posted: new Date('2026-07-02'),
    },
    {
      id: 'doc-pourvu',
      type: 'poste',
      title: 'Relecteur SOP',
      department: 'Doc Team',
      description: 'x',
      skills: [],
      contact: 'x',
      status: 'filled',
      posted: new Date('2026-05-01'),
    },
  ]

  it('groups open needs by team in config order with a footer link', () => {
    const [chunk] = formatNeedsForDiscord(needs, 'https://exemple.fr')
    expect(chunk).toContain('**Nav Team**')
    expect(chunk).toContain('- **Relecture LFPG** · 2–3 h')
    expect(chunk).toContain('📩 Ticket Membership')
    expect(chunk.indexOf('**Nav Team**')).toBeLessThan(chunk.indexOf('**Event Team**'))
    expect(chunk).toContain('https://exemple.fr/contribuer')
  })

  it('excludes filled needs and returns nothing when no need is open', () => {
    const [chunk] = formatNeedsForDiscord(needs)
    expect(chunk).not.toContain('Relecteur SOP')
    expect(formatNeedsForDiscord(needs.filter((n) => n.status !== 'open'))).toEqual([])
  })

  it('stays under the Discord limit for large boards', () => {
    const many: Need[] = Array.from({ length: 40 }, (_, i) => ({
      ...needs[0],
      id: `n-${i}`,
      title: `Besoin numéro ${i}`,
      description: 'x'.repeat(120),
    }))
    const chunks = formatNeedsForDiscord(many)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT)
  })
})
