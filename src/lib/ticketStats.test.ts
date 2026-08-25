import { describe, expect, it } from 'vitest'
import { computeTicketStats } from './ticketStats'
import type { TicketLogEntry } from './schemas'

function entry(over: Partial<TicketLogEntry> & Pick<TicketLogEntry, 'id' | 'department' | 'opened'>): TicketLogEntry {
  return over
}

const d = (iso: string) => new Date(iso)

describe('computeTicketStats', () => {
  it('returns an empty, non-sample result for no entries', () => {
    const stats = computeTicketStats([])
    expect(stats.count).toBe(0)
    expect(stats.isSample).toBe(false)
    expect(stats.range).toBeNull()
    expect(stats.departments).toEqual([])
    expect(stats.totals.avgFirstResponseMs).toBeNull()
  })

  it('averages only over entries that have the relevant timestamp', () => {
    const stats = computeTicketStats([
      entry({
        id: 'a',
        department: 'Ops & Nav',
        opened: d('2026-06-01T10:00:00Z'),
        first_response: d('2026-06-01T10:30:00Z'), // 30 min
        closed: d('2026-06-01T12:00:00Z'), // 2 h
      }),
      entry({
        id: 'b',
        department: 'Ops & Nav',
        opened: d('2026-06-02T10:00:00Z'),
        first_response: d('2026-06-02T11:30:00Z'), // 90 min
        // still open: no closed -> excluded from resolution average
      }),
    ])
    const nav = stats.departments.find((s) => s.department === 'Ops & Nav')!
    expect(nav.received).toBe(2)
    expect(nav.handled).toBe(1)
    expect(nav.open).toBe(1)
    expect(nav.avgFirstResponseMs).toBe(((30 + 90) / 2) * 60_000) // 60 min
    expect(nav.avgResolutionMs).toBe(2 * 3_600_000) // only the closed one
  })

  it('excludes a ticket with no first response from the response average but counts it', () => {
    const stats = computeTicketStats([
      entry({
        id: 'x',
        department: 'Events',
        opened: d('2026-06-01T10:00:00Z'),
        closed: d('2026-06-01T11:00:00Z'),
        outcome: 'no_response',
      }),
    ])
    const events = stats.departments.find((s) => s.department === 'Events')!
    expect(events.received).toBe(1)
    expect(events.avgFirstResponseMs).toBeNull()
    expect(events.avgResolutionMs).toBe(3_600_000)
  })

  it('orders departments by config order and omits empty ones', () => {
    const stats = computeTicketStats([
      entry({ id: 'a', department: 'Events', opened: d('2026-06-01T10:00:00Z') }),
      entry({ id: 'b', department: 'Ops & Nav', opened: d('2026-06-02T10:00:00Z') }),
    ])
    expect(stats.departments.map((s) => s.department)).toEqual(['Ops & Nav', 'Events'])
  })

  it('computes the covered range from earliest open to latest end', () => {
    const stats = computeTicketStats([
      entry({ id: 'a', department: 'Ops & Nav', opened: d('2026-06-01T10:00:00Z'), closed: d('2026-06-05T10:00:00Z') }),
      entry({ id: 'b', department: 'Digital', opened: d('2026-05-20T10:00:00Z') }),
    ])
    expect(stats.range?.from.toISOString()).toBe('2026-05-20T10:00:00.000Z')
    expect(stats.range?.to.toISOString()).toBe('2026-06-05T10:00:00.000Z')
  })

  it('flags sample data when any id starts with "exemple-"', () => {
    expect(computeTicketStats([entry({ id: 'exemple-1', department: 'Ops & Nav', opened: d('2026-06-01T10:00:00Z') })]).isSample).toBe(true)
    expect(computeTicketStats([entry({ id: 'real-1', department: 'Ops & Nav', opened: d('2026-06-01T10:00:00Z') })]).isSample).toBe(false)
  })
})
