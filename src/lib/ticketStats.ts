import { DEPARTMENTS, type Department } from '../config/departments'
import type { TicketLogEntry } from './schemas'

export interface DepartmentStat {
  department: Department
  received: number
  handled: number
  open: number
  avgFirstResponseMs: number | null
  avgResolutionMs: number | null
}

export interface TicketStats {
  count: number
  isSample: boolean
  range: { from: Date; to: Date } | null
  departments: DepartmentStat[]
  totals: Omit<DepartmentStat, 'department'>
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function summarize(entries: TicketLogEntry[]): Omit<DepartmentStat, 'department'> {
  const firstResponses = entries
    .filter((e) => e.first_response)
    .map((e) => e.first_response!.getTime() - e.opened.getTime())
  const resolutions = entries.filter((e) => e.closed).map((e) => e.closed!.getTime() - e.opened.getTime())
  return {
    received: entries.length,
    handled: entries.filter((e) => e.closed).length,
    open: entries.filter((e) => !e.closed).length,
    avgFirstResponseMs: mean(firstResponses),
    avgResolutionMs: mean(resolutions),
  }
}

export function computeTicketStats(entries: TicketLogEntry[]): TicketStats {
  const departments = DEPARTMENTS.map((department) => ({
    department,
    ...summarize(entries.filter((e) => e.department === department)),
  })).filter((stat) => stat.received > 0)

  let range: TicketStats['range'] = null
  if (entries.length > 0) {
    const opens = entries.map((e) => e.opened.getTime())
    const ends = entries.map((e) => (e.closed ?? e.first_response ?? e.opened).getTime())
    range = { from: new Date(Math.min(...opens)), to: new Date(Math.max(...ends)) }
  }

  return {
    count: entries.length,
    isSample: entries.some((e) => e.id.startsWith('exemple-')),
    range,
    departments,
    totals: summarize(entries),
  }
}
