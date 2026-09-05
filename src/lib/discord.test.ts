import { describe, expect, it } from 'vitest'
import { DISCORD_MESSAGE_LIMIT, formatEditionForDiscord, formatNeedAnnouncement, formatNeedsForDiscord } from './discord'
import type { Edition, Need } from './schemas'

function makeEdition(overrides: Partial<Edition> = {}): Edition {
  return {
    title: 'Point vACC — T2 2026',
    slug: '2026-q2',
    published: new Date('2026-06-30'),
    intro: 'Un trimestre bien rempli.',
    body: '',
    departments: [
      { name: 'Events', done: ['Real Ops Paris'], in_progress: [], next: [], help_wanted: [], images: [] },
      { name: 'Ops & Nav', done: ['Cartes LFPG publiées'], in_progress: ['Doc LFLL'], next: [], help_wanted: [], images: [] },
    ],
    ...overrides,
  }
}

describe('formatEditionForDiscord — images', () => {
  it('embeds repo screenshots as absolute URLs, encoding special characters', () => {
    const edition = makeEdition()
    edition.departments[1].images = [
      { src: '/images/point-vacc/2026-q3/CCA NICE.png', caption: 'Vue de Nice' },
      { src: 'https://exemple.org/externe.png' },
    ]
    const joined = formatEditionForDiscord(edition, 'https://membership-vaccfr.vercel.app').join('\n')
    expect(joined).toContain('🖼️ Vue de Nice — https://membership-vaccfr.vercel.app/images/point-vacc/2026-q3/CCA%20NICE.png')
    expect(joined).toContain('🖼️ https://exemple.org/externe.png')
  })

  it('keeps only https images when no origin is provided', () => {
    const edition = makeEdition()
    edition.departments[1].images = [
      { src: '/images/point-vacc/2026-q3/a.png', caption: 'Locale' },
      { src: 'https://exemple.org/externe.png' },
    ]
    const joined = formatEditionForDiscord(edition).join('\n')
    expect(joined).not.toContain('a.png')
    expect(joined).toContain('https://exemple.org/externe.png')
  })
})

describe('formatEditionForDiscord', () => {
  it('produces a single unnumbered chunk for a short edition', () => {
    const chunks = formatEditionForDiscord(makeEdition())
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).not.toContain('(message')
    expect(chunks[0]).toContain('**📍 Point vACC — T2 2026**')
    expect(chunks[0]).toContain('**Ops & Nav**')
    expect(chunks[0]).toContain('🟢 Fait :')
    expect(chunks[0]).toContain('- Cartes LFPG publiées')
  })

  it('orders departments by the configured display order, not file order', () => {
    const [chunk] = formatEditionForDiscord(makeEdition())
    expect(chunk.indexOf('**Ops & Nav**')).toBeLessThan(chunk.indexOf('**Events**'))
  })

  it('omits empty sections and empty departments', () => {
    const chunks = formatEditionForDiscord(
      makeEdition({
        departments: [
          { name: 'Ops & Nav', done: ['Une seule chose'], in_progress: [], next: [], help_wanted: [], images: [] },
          { name: 'Training Department', done: [], in_progress: [], next: [], help_wanted: [], images: [] },
        ],
      }),
    )
    expect(chunks[0]).not.toContain('🔵 À venir')
    expect(chunks[0]).not.toContain('🙋')
    expect(chunks[0]).not.toContain('**Training Department**')
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
            name: 'Ops & Nav',
            notes: 'Gros trimestre pour Ops & Nav.',
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
    expect(chunk).toContain('Gros trimestre pour Ops & Nav.')
    expect(chunk.indexOf('**Ops & Nav**')).toBeLessThan(chunk.indexOf('Gros trimestre'))
    expect(chunk.indexOf('Gros trimestre')).toBeLessThan(chunk.indexOf('🟢 Fait :'))
  })

  it('splits long editions into numbered chunks under the Discord limit', () => {
    const longItems = Array.from({ length: 30 }, (_, i) => `Élément numéro ${i} — ${'x'.repeat(80)}`)
    const edition = makeEdition({
      departments: (['Ops & Nav', 'Training Department', 'Events', 'Digital'] as const).map((name) => ({
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

  it('repeats the team header with (suite) when one section exceeds a full message', () => {
    const items = Array.from({ length: 30 }, (_, i) => `Élément ${i} — ${'x'.repeat(90)}`)
    const edition = makeEdition({
      departments: [{ name: 'Ops & Nav', done: items, in_progress: [], next: [], help_wanted: [], images: [] }],
    })
    const chunks = formatEditionForDiscord(edition)
    expect(chunks.length).toBeGreaterThan(1)
    const joined = chunks.join('\n')
    expect(joined).toContain('**Ops & Nav** *(suite)*')
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT))
    for (const item of items) expect(joined).toContain(item)
  })

  it('keeps every line of a long edition', () => {
    const items = Array.from({ length: 60 }, (_, i) => `Ligne ${i}`)
    const edition = makeEdition({
      departments: [{ name: 'Ops & Nav', done: items, in_progress: [], next: [], help_wanted: [], images: [] }],
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
      department: 'Ops & Nav',
      description: 'Relire la doc avant publication.',
      skills: ['Rigueur', 'Connaissance IFR'],
      time_estimate: '2–3 h',
      contact: 'Ticket Membership',
      status: 'open',
      posted: new Date('2026-07-01'),
    },
    {
      id: 'event-affiche',
      type: 'ponctuel',
      title: 'Affiche de rentrée',
      department: 'Events',
      description: 'Créer l’affiche.',
      skills: [],
      contact: 'Référent Events',
      status: 'open',
      posted: new Date('2026-07-02'),
    },
    {
      id: 'doc-pourvu',
      type: 'poste',
      title: 'Relecteur SOP',
      department: 'Training Department',
      description: 'x',
      skills: [],
      contact: 'x',
      status: 'filled',
      posted: new Date('2026-05-01'),
    },
  ]

  it('groups open needs by team in config order with a footer link', () => {
    const [chunk] = formatNeedsForDiscord(needs, 'https://exemple.fr')
    expect(chunk).toContain('**Ops & Nav**')
    expect(chunk).toContain('- **Relecture LFPG** · Ponctuel · ⏱️ 2–3 h')
    expect(chunk).toContain('📩 Ticket Membership')
    expect(chunk.indexOf('**Ops & Nav**')).toBeLessThan(chunk.indexOf('**Events**'))
    expect(chunk).toContain('https://exemple.fr/contribuer')
  })

  it('lists skills on each need and omits the line when a need has none', () => {
    const [chunk] = formatNeedsForDiscord(needs)
    expect(chunk).toContain('🧰 Compétences : Rigueur · Connaissance IFR')
    const eventsEntry = chunk.slice(chunk.indexOf('Affiche de rentrée'))
    expect(eventsEntry).not.toContain('🧰')
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

describe('formatNeedAnnouncement', () => {
  const need: Need = {
    id: 'nav-relecture',
    type: 'ponctuel',
    title: 'Relecture LFPG',
    department: 'Ops & Nav',
    description: 'Relire la doc avant publication.',
    skills: ['Rigueur', 'Connaissance IFR'],
    time_estimate: '2–3 h',
    contact: 'Ticket Membership',
    status: 'open',
    posted: new Date('2026-07-01'),
  }

  it('builds a standalone announcement with every field and a footer link', () => {
    const message = formatNeedAnnouncement(need, 'https://exemple.fr')
    expect(message).toContain('**🙌 Relecture LFPG**')
    expect(message).toContain('Ops & Nav · Ponctuel · ⏱️ 2–3 h')
    expect(message).toContain('Relire la doc avant publication.')
    expect(message).toContain('🧰 Compétences : Rigueur · Connaissance IFR')
    expect(message).toContain('📩 Ticket Membership')
    expect(message).toContain('https://exemple.fr/contribuer')
  })

  it('omits the skills and time lines when they are empty', () => {
    const message = formatNeedAnnouncement({ ...need, skills: [], time_estimate: undefined })
    expect(message).not.toContain('🧰')
    expect(message).not.toContain('⏱️')
    expect(message).toContain('Ops & Nav · Ponctuel\n')
  })

  it('shortens an oversized description at a word boundary to fit one message', () => {
    const message = formatNeedAnnouncement(
      { ...need, description: Array.from({ length: 400 }, (_, i) => `mot${i}fin`).join(' ') },
      'https://exemple.fr',
    )
    expect(message.length).toBeLessThanOrEqual(DISCORD_MESSAGE_LIMIT)
    const truncated = /(\S+)…/.exec(message)
    expect(truncated?.[1]).toMatch(/^mot\d+fin$/)
    expect(message).toContain('📩 Ticket Membership')
    expect(message).toContain('https://exemple.fr/contribuer')
  })
})
