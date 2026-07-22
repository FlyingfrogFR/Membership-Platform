import { describe, expect, it } from 'vitest'
import { checklistFor, computeCadence, participationMatrix } from './cadence'
import { quarterEnd, quarterLabel, quarterSlug } from './dates'
import type { Edition } from './schemas'

function edition(slug: string, teams: string[]): Edition {
  return {
    title: slug,
    slug,
    published: new Date(`${slug.slice(0, 4)}-01-01`),
    intro: 'x',
    body: '',
    departments: teams.map((name) => ({
      name: name as Edition['departments'][number]['name'],
      done: ['fait'],
      in_progress: [],
      next: [],
      help_wanted: [],
      images: [],
    })),
  }
}

describe('computeCadence', () => {
  it('targets the current quarter when no edition exists', () => {
    const { next, dueDate, daysLeft } = computeCadence(new Date('2026-07-22T12:00:00Z'), [])
    expect(quarterSlug(next)).toBe('2026-q3')
    expect(dueDate.toISOString().slice(0, 10)).toBe('2026-09-30')
    expect(daysLeft).toBeGreaterThan(0)
  })

  it('targets the quarter after the latest edition', () => {
    const cadence = computeCadence(new Date('2026-07-22T12:00:00Z'), [edition('2026-q2', ['Nav Team'])])
    expect(quarterSlug(cadence.next)).toBe('2026-q3')
  })

  it('rolls over the year after Q4', () => {
    const cadence = computeCadence(new Date('2027-01-10T12:00:00Z'), [edition('2026-q4', ['Nav Team'])])
    expect(quarterSlug(cadence.next)).toBe('2027-q1')
  })

  it('catches up to the current quarter after a dormant period', () => {
    const cadence = computeCadence(new Date('2027-08-01T12:00:00Z'), [edition('2026-q2', ['Nav Team'])])
    expect(quarterSlug(cadence.next)).toBe('2027-q3')
  })

  it('skips to the running quarter when the next edition window already closed', () => {
    // Latest edition 2026-q2, now = 5 Oct 2026: q3's window has passed → target q4.
    const cadence = computeCadence(new Date('2026-10-05T12:00:00Z'), [edition('2026-q2', ['Nav Team'])])
    expect(quarterSlug(cadence.next)).toBe('2026-q4')
  })
})

describe('quarter helpers', () => {
  it('computes quarter ends correctly', () => {
    expect(quarterEnd({ year: 2026, q: 1 }).toISOString().slice(0, 10)).toBe('2026-03-31')
    expect(quarterEnd({ year: 2026, q: 4 }).toISOString().slice(0, 10)).toBe('2026-12-31')
  })

  it('labels quarters in French style', () => {
    expect(quarterLabel({ year: 2026, q: 3 })).toBe('T3 2026')
  })
})

describe('checklistFor', () => {
  it('produces the four dated steps ending on the due date', () => {
    const due = new Date('2026-09-30T00:00:00Z')
    const steps = checklistFor(due)
    expect(steps.map((s) => s.key)).toEqual(['call', 'chase', 'assemble', 'publish'])
    expect(steps[0].date.toISOString().slice(0, 10)).toBe('2026-08-31')
    expect(steps[3].date.toISOString().slice(0, 10)).toBe('2026-09-30')
  })
})

describe('participationMatrix', () => {
  it('marks presence and counts absence streaks from the newest edition', () => {
    const editions = [
      edition('2026-q3', ['Nav Team']), // newest
      edition('2026-q2', ['Nav Team', 'Doc Team']),
    ]
    const matrix = participationMatrix(editions)
    const nav = matrix.rows.find((r) => r.team === 'Nav Team')!
    const doc = matrix.rows.find((r) => r.team === 'Doc Team')!
    const event = matrix.rows.find((r) => r.team === 'Event Team')!
    expect(nav.cells).toEqual([true, true])
    expect(nav.absentStreak).toBe(0)
    expect(doc.cells).toEqual([false, true])
    expect(doc.absentStreak).toBe(1)
    expect(event.absentStreak).toBe(2)
  })

  it('handles the empty archive', () => {
    const matrix = participationMatrix([])
    expect(matrix.editions).toEqual([])
    expect(matrix.rows.every((r) => r.absentStreak === 0)).toBe(true)
  })
})
