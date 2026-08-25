import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import {
  composeEditionFile,
  composeEditionFromSections,
  composeNeedYaml,
  composeSectionYaml,
  composeTicketYaml,
  editionSectionDraftPath,
  githubNewFileUrl,
  slugify,
  type EditionDraft,
} from './compose'
import { parseFrontmatter } from './frontmatter'
import { editionSchema, editionSectionFileSchema, needSchema, ticketLogEntrySchema, type DepartmentEntry } from './schemas'

const editionDraft: EditionDraft = {
  title: 'Point vACC — T3 2026',
  slug: '2026-q3',
  published: '2026-09-30',
  intro: "Un trimestre bien rempli, merci à tous d'être là.",
  body: 'Merci de votre lecture — **à bientôt**.',
  departments: [
    {
      name: 'Ops & Nav',
      notes: 'Un trimestre **chargé** pour Ops & Nav.',
      done: ['  Cartes LFPG publiées  ', ''],
      in_progress: ['Doc LFLL'],
      next: [],
      help_wanted: [],
      images: [{ name: 'secteurs LFMM.png', caption: 'Nouveau découpage' }, { name: 'brouillon.png', caption: '' }],
    },
    { name: 'Events', notes: '   ', done: [], in_progress: [], next: [], help_wanted: [], images: [] },
  ],
}

describe('composeEditionFile', () => {
  it('round-trips through the real parser and schema', () => {
    const file = composeEditionFile(editionDraft)
    const { data, body } = parseFrontmatter(file, 'generated')
    const edition = editionSchema.parse(data)
    expect(edition.title).toBe('Point vACC — T3 2026')
    expect(edition.slug).toBe('2026-q3')
    expect(edition.published.getUTCFullYear()).toBe(2026)
    expect(edition.departments).toHaveLength(1)
    expect(edition.departments[0].done).toEqual(['Cartes LFPG publiées'])
    expect(body).toContain('à bientôt')
  })

  it('drops departments with no items and trims list entries', () => {
    const file = composeEditionFile(editionDraft)
    expect(file).not.toContain('Events')
    expect(file).not.toContain('  Cartes')
  })

  it('keeps team notes and drops whitespace-only ones', () => {
    const file = composeEditionFile(editionDraft)
    const { data } = parseFrontmatter(file, 'generated')
    const edition = editionSchema.parse(data)
    expect(edition.departments[0].notes).toBe('Un trimestre **chargé** pour Ops & Nav.')
    // The Events entry had only whitespace notes and no items: dropped entirely.
    expect(edition.departments).toHaveLength(1)
  })

  it('references images under the edition slug and validates against the schema', () => {
    const file = composeEditionFile(editionDraft)
    const { data } = parseFrontmatter(file, 'generated')
    const edition = editionSchema.parse(data)
    expect(edition.departments[0].images).toEqual([
      { src: '/images/point-vacc/2026-q3/secteurs LFMM.png', caption: 'Nouveau découpage' },
      { src: '/images/point-vacc/2026-q3/brouillon.png' },
    ])
  })
})

describe('composeSectionYaml', () => {
  it('round-trips one team section through the draft file schema', () => {
    const yaml = composeSectionYaml('2026-q3', {
      name: 'Ops & Nav',
      notes: '  Un mot du trimestre.  ',
      done: [' Cartes LFPG ', ''],
      in_progress: [],
      next: ['Doc LFLL'],
      help_wanted: [],
      images: [{ name: 'secteurs.png', caption: 'Découpage' }, { name: 'brut.png', caption: '' }],
    })
    const section = editionSectionFileSchema.parse(load(yaml))
    expect(section.name).toBe('Ops & Nav')
    expect(section.notes).toBe('Un mot du trimestre.')
    expect(section.done).toEqual(['Cartes LFPG'])
    expect(section.in_progress).toEqual([])
    expect(section.images).toEqual([
      { src: '/images/point-vacc/2026-q3/secteurs.png', caption: 'Découpage' },
      { src: '/images/point-vacc/2026-q3/brut.png' },
    ])
    expect(yaml).not.toContain('help_wanted')
  })

  it('builds the draft path from the edition slug and team name', () => {
    expect(editionSectionDraftPath('2026-q3', 'Ops & Nav')).toBe('content/point-vacc/drafts/2026-q3/ops-nav.yaml')
    expect(editionSectionDraftPath('2026-q4', 'Training Department')).toBe(
      'content/point-vacc/drafts/2026-q4/training-department.yaml',
    )
  })
})

describe('composeEditionFromSections', () => {
  const sections: DepartmentEntry[] = [
    {
      name: 'Ops & Nav',
      notes: 'Le mot de la Ops & Nav.',
      done: ['Cartes LFPG publiées'],
      in_progress: [],
      next: [],
      help_wanted: [],
      images: [{ src: 'https://exemple.org/capture.png', caption: 'Externe' }, { src: '/images/point-vacc/2026-q3/a.png' }],
    },
    { name: 'Events', done: [], in_progress: [], next: [], help_wanted: [], images: [] },
  ]

  it('assembles received sections into a valid edition file', () => {
    const file = composeEditionFromSections(
      { title: 'Point vACC — T3 2026', slug: '2026-q3', published: '2026-09-30', intro: 'Intro.', body: 'Fin.' },
      sections,
    )
    const { data, body } = parseFrontmatter(file, 'generated')
    const edition = editionSchema.parse(data)
    expect(edition.slug).toBe('2026-q3')
    expect(edition.departments).toHaveLength(1)
    expect(edition.departments[0].name).toBe('Ops & Nav')
    // Sections keep their srcs verbatim — including https ones.
    expect(edition.departments[0].images).toEqual([
      { src: 'https://exemple.org/capture.png', caption: 'Externe' },
      { src: '/images/point-vacc/2026-q3/a.png' },
    ])
    expect(body).toBe('Fin.')
  })

  it('omits the body block when empty', () => {
    const file = composeEditionFromSections(
      { title: 'T', slug: '2026-q3', published: '2026-09-30', intro: 'I', body: '   ' },
      sections,
    )
    expect(file.trimEnd().endsWith('---')).toBe(true)
  })
})

describe('composeNeedYaml', () => {
  it('round-trips through the need schema', () => {
    const yaml = composeNeedYaml({
      id: 'nav-relecture-lfpg',
      type: 'ponctuel',
      title: 'Relecture LFPG',
      department: 'Ops & Nav',
      description: 'Relire la doc.',
      skills: [' Rigueur ', ''],
      time_estimate: '2–3 h',
      contact: 'Ticket Membership',
      status: 'open',
      posted: '2026-08-01',
    })
    const [item] = load(yaml) as unknown[]
    const need = needSchema.parse(item)
    expect(need.id).toBe('nav-relecture-lfpg')
    expect(need.skills).toEqual(['Rigueur'])
    expect(need.posted.getUTCMonth()).toBe(7)
  })

  it('omits empty optional fields', () => {
    const yaml = composeNeedYaml({
      id: 'x-y',
      type: 'poste',
      title: 'T',
      department: 'Digital',
      description: 'D',
      skills: [],
      time_estimate: '',
      contact: 'C',
      status: 'open',
      posted: '2026-08-01',
    })
    expect(yaml).not.toContain('skills')
    expect(yaml).not.toContain('time_estimate')
  })
})

describe('composeTicketYaml', () => {
  it('round-trips through the ticket log schema', () => {
    const yaml = composeTicketYaml({
      id: '2026-07-22-ops-nav',
      department: 'Ops & Nav',
      opened: '2026-07-22T18:00:00.000Z',
      first_response: '2026-07-22T18:30:00.000Z',
      closed: '',
      outcome: '',
    })
    const [item] = load(yaml) as unknown[]
    const entry = ticketLogEntrySchema.parse(item)
    expect(entry.department).toBe('Ops & Nav')
    expect(entry.first_response!.getTime()).toBeGreaterThan(entry.opened.getTime())
    expect(yaml).not.toContain('closed')
    expect(yaml).not.toContain('outcome')
  })
})

describe('helpers', () => {
  it('slugifies accented French text', () => {
    expect(slugify('Révision des lettres d’accord — Été 2026')).toBe('revision-des-lettres-d-accord-ete-2026')
  })

  it('drops the value param from GitHub URLs when the content is too large', () => {
    const small = githubNewFileUrl('content/point-vacc/x.md', 'hello')
    expect(small).toContain('&value=hello')
    const big = githubNewFileUrl('content/point-vacc/x.md', 'x'.repeat(20000))
    expect(big).not.toContain('&value=')
    expect(big).toContain('filename=')
  })
})
