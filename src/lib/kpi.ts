// Mandate-KPI computations: quarter buckets over the ticket log, the Contribuer
// board, editions and the coordination tracker. Medians rather than means so a
// single outlier ticket cannot mask a slow month.
import { DEPARTMENTS } from '../config/departments'
import { departmentHasContent } from './cadence'
import { lastMonthKeys, monthKey, parseQuarterSlug, quarterOf, sameQuarter, type Quarter } from './dates'
import type { CoordinationEntry, Edition, Need, TicketLogEntry } from './schemas'

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Referent monthly updates are expected from every team except Membership
// (the HoM writes those himself).
export const COORDINATION_TEAMS = DEPARTMENTS.filter((team) => team !== 'Membership')

export interface KpiData {
  tickets: TicketLogEntry[]
  needs: Need[]
  editions: Edition[]
  coordination: CoordinationEntry[]
}

export interface QuarterKpis {
  received: number
  resolved: number
  medianFirstResponseMs: number | null
  needsOpened: number
  needsFilled: number
  medianTimeToFillMs: number | null
  participationRate: number | null
  coordinationRate: number | null
}

export function quarterMonths(quarter: Quarter): string[] {
  return [1, 2, 3].map((i) => `${quarter.year}-${String((quarter.q - 1) * 3 + i).padStart(2, '0')}`)
}

export function kpisForQuarter(quarter: Quarter, data: KpiData): QuarterKpis {
  const inQuarter = (date: Date) => sameQuarter(quarterOf(date), quarter)

  const opened = data.tickets.filter((ticket) => inQuarter(ticket.opened))
  const medianFirstResponseMs = median(
    opened
      .filter((ticket) => ticket.first_response)
      .map((ticket) => ticket.first_response!.getTime() - ticket.opened.getTime()),
  )

  const filled = data.needs.filter((need) => need.filled_at && inQuarter(need.filled_at))
  const medianTimeToFillMs = median(filled.map((need) => need.filled_at!.getTime() - need.posted.getTime()))

  const edition = data.editions.find((e) => {
    const parsed = parseQuarterSlug(e.slug)
    return parsed !== null && sameQuarter(parsed, quarter)
  })
  const participationRate = edition
    ? edition.departments.filter(departmentHasContent).length / DEPARTMENTS.length
    : null

  const months = quarterMonths(quarter)
  const coordEntries = data.coordination.filter((entry) => months.includes(entry.month))
  const coordinationRate =
    coordEntries.length > 0
      ? coordEntries.reduce((sum, entry) => sum + entry.received.length, 0) /
        (coordEntries.length * COORDINATION_TEAMS.length)
      : null

  return {
    received: opened.length,
    resolved: data.tickets.filter((ticket) => ticket.closed && inQuarter(ticket.closed)).length,
    medianFirstResponseMs,
    needsOpened: data.needs.filter((need) => inQuarter(need.posted)).length,
    needsFilled: filled.length,
    medianTimeToFillMs,
    participationRate,
    coordinationRate,
  }
}

export interface MonthPoint {
  month: string
  received: number
  resolved: number
  medianFirstResponseMs: number | null
}

export function monthlyTicketSeries(now: Date, tickets: TicketLogEntry[], months = 6): MonthPoint[] {
  return lastMonthKeys(now, months).map((key) => {
    const opened = tickets.filter((ticket) => monthKey(ticket.opened) === key)
    return {
      month: key,
      received: opened.length,
      resolved: tickets.filter((ticket) => ticket.closed && monthKey(ticket.closed) === key).length,
      medianFirstResponseMs: median(
        opened
          .filter((ticket) => ticket.first_response)
          .map((ticket) => ticket.first_response!.getTime() - ticket.opened.getTime()),
      ),
    }
  })
}
