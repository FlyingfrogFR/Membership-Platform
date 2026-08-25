import { describe, expect, it } from 'vitest'
import { COORDINATION_TEAMS, kpisForQuarter, median, monthlyTicketSeries, quarterMonths } from './kpi'
import type { Need, TicketLogEntry } from './schemas'

const Q3 = { year: 2026, q: 3 } as const

function ticket(over: Partial<TicketLogEntry> & Pick<TicketLogEntry, 'id' | 'opened'>): TicketLogEntry {
  return { department: 'Membership', ...over }
}

function need(over: Partial<Need> & Pick<Need, 'id' | 'posted'>): Need {
  return {
    type: 'ponctuel',
    title: 'x',
    department: 'Ops & Nav',
    description: 'x',
    skills: [],
    contact: 'x',
    status: 'open',
    ...over,
  }
}

describe('median', () => {
  it('handles empty, odd and even inputs', () => {
    expect(median([])).toBeNull()
    expect(median([5])).toBe(5)
    expect(median([1, 100, 3])).toBe(3)
    expect(median([1, 2, 3, 100])).toBe(2.5)
  })
})

describe('kpisForQuarter', () => {
  it('buckets tickets, needs and coordination into the quarter', () => {
    const kpis = kpisForQuarter(Q3, {
      tickets: [
        ticket({ id: 'a', opened: new Date('2026-07-01T10:00:00Z'), first_response: new Date('2026-07-01T11:00:00Z'), closed: new Date('2026-07-02T10:00:00Z') }),
        ticket({ id: 'b', opened: new Date('2026-08-01T10:00:00Z'), first_response: new Date('2026-08-01T13:00:00Z') }),
        ticket({ id: 'old', opened: new Date('2026-05-01T10:00:00Z'), closed: new Date('2026-07-03T10:00:00Z') }),
      ],
      needs: [
        need({ id: 'n1', posted: new Date('2026-07-05'), status: 'filled', filled_at: new Date('2026-07-25') }),
        need({ id: 'n2', posted: new Date('2026-06-01') }),
      ],
      editions: [],
      coordination: [
        { month: '2026-07', received: COORDINATION_TEAMS.slice(0, 3) },
        { month: '2026-06', received: COORDINATION_TEAMS },
      ],
    })
    expect(kpis.received).toBe(2)
    // Closed in Q3 counts even if opened before Q3.
    expect(kpis.resolved).toBe(2)
    // Medians of 1h and 3h.
    expect(kpis.medianFirstResponseMs).toBe(2 * 3_600_000)
    expect(kpis.needsOpened).toBe(1)
    expect(kpis.needsFilled).toBe(1)
    expect(kpis.medianTimeToFillMs).toBe(20 * 86_400_000)
    expect(kpis.participationRate).toBeNull()
    // Only the July entry is in Q3: 3 of the coordination teams.
    expect(kpis.coordinationRate).toBeCloseTo(3 / COORDINATION_TEAMS.length)
  })

  it('returns nulls for medians and rates with no data', () => {
    const kpis = kpisForQuarter(Q3, { tickets: [], needs: [], editions: [], coordination: [] })
    expect(kpis.received).toBe(0)
    expect(kpis.medianFirstResponseMs).toBeNull()
    expect(kpis.participationRate).toBeNull()
    expect(kpis.coordinationRate).toBeNull()
  })

  it('lists the three months of a quarter', () => {
    expect(quarterMonths(Q3)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(quarterMonths({ year: 2027, q: 1 })).toEqual(['2027-01', '2027-02', '2027-03'])
  })
})

describe('monthlyTicketSeries', () => {
  it('produces one point per month, oldest first', () => {
    const series = monthlyTicketSeries(new Date('2026-07-22T12:00:00Z'), [
      ticket({ id: 'a', opened: new Date('2026-07-01T10:00:00Z'), first_response: new Date('2026-07-01T10:30:00Z') }),
      ticket({ id: 'b', opened: new Date('2026-05-10T10:00:00Z'), closed: new Date('2026-06-02T10:00:00Z') }),
    ])
    expect(series).toHaveLength(6)
    expect(series[0].month).toBe('2026-02')
    expect(series[5]).toMatchObject({ month: '2026-07', received: 1, medianFirstResponseMs: 30 * 60_000 })
    expect(series[4]).toMatchObject({ month: '2026-06', received: 0, resolved: 1 })
  })
})
