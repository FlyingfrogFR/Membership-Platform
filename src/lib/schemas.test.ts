import { describe, expect, it } from 'vitest'
import { editionSchema, needSchema } from './schemas'

const validEdition = {
  title: 'Point vACC — T2 2026',
  slug: '2026-q2',
  published: new Date('2026-06-30'),
  intro: 'Intro.',
  departments: [{ name: 'NAV', done: ['Fait quelque chose'] }],
}

const validNeed = {
  id: 'nav-relecture',
  type: 'ponctuel',
  title: 'Relecture',
  department: 'NAV',
  description: 'Relire un document.',
  contact: 'Ticket Membership',
  status: 'open',
  posted: new Date('2026-06-01'),
}

describe('editionSchema', () => {
  it('accepts a valid edition and fills missing lists', () => {
    const edition = editionSchema.parse(validEdition)
    expect(edition.published).toBeInstanceOf(Date)
    expect(edition.departments[0].in_progress).toEqual([])
    expect(edition.departments[0].help_wanted).toEqual([])
  })

  it('coerces YAML date strings', () => {
    const edition = editionSchema.parse({ ...validEdition, published: '2026-06-30' })
    expect(edition.published.getUTCFullYear()).toBe(2026)
  })

  it('rejects an unknown department name', () => {
    expect(() =>
      editionSchema.parse({ ...validEdition, departments: [{ name: 'Département inconnu' }] }),
    ).toThrow()
  })

  it('rejects unknown keys, catching frontmatter typos', () => {
    expect(() =>
      editionSchema.parse({
        ...validEdition,
        departments: [{ name: 'NAV', helped_wanted: ['typo'] }],
      }),
    ).toThrow()
  })

  it('rejects a non-kebab-case slug', () => {
    expect(() => editionSchema.parse({ ...validEdition, slug: '2026 Q2' })).toThrow()
  })
})

describe('needSchema', () => {
  it('accepts a valid need and defaults skills to an empty list', () => {
    const need = needSchema.parse(validNeed)
    expect(need.skills).toEqual([])
    expect(need.time_estimate).toBeUndefined()
  })

  it('rejects a missing contact', () => {
    const { contact: _contact, ...rest } = validNeed
    expect(() => needSchema.parse(rest)).toThrow()
  })

  it('rejects an invalid status', () => {
    expect(() => needSchema.parse({ ...validNeed, status: 'paused' })).toThrow()
  })
})
