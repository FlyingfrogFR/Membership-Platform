// Point vACC cadence and participation logic for the admin cockpit. Everything
// is computed against a caller-supplied "now" so panels stay correct between
// deploys (the site only rebuilds on merge).
import { DEPARTMENTS, type Department } from '../config/departments'
import { addDays, nextQuarter, parseQuarterSlug, quarterEnd, quarterOf, type Quarter } from './dates'
import type { DepartmentEntry, Edition } from './schemas'

// Shared "does this team entry have anything to show" rule (site, export, admin).
export function departmentHasContent(entry: DepartmentEntry): boolean {
  return (
    entry.done.length + entry.in_progress.length + entry.next.length + entry.help_wanted.length + entry.images.length > 0 ||
    Boolean(entry.notes)
  )
}

export interface Cadence {
  next: Quarter
  dueDate: Date
  daysLeft: number
}

export function computeCadence(now: Date, editions: Edition[]): Cadence {
  const parsed = editions[0] ? parseQuarterSlug(editions[0].slug) : null
  let next = parsed ? nextQuarter(parsed) : quarterOf(now)
  // If the site lay dormant past that quarter's end, catch up to the current one.
  if (quarterEnd(next).getTime() < now.getTime()) next = quarterOf(now)
  const dueDate = quarterEnd(next)
  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86_400_000)
  return { next, dueDate, daysLeft }
}

export type ChecklistStepKey = 'call' | 'chase' | 'assemble' | 'publish'

export interface ChecklistStep {
  key: ChecklistStepKey
  date: Date
}

export function checklistFor(dueDate: Date): ChecklistStep[] {
  return [
    { key: 'call', date: addDays(dueDate, -30) },
    { key: 'chase', date: addDays(dueDate, -7) },
    { key: 'assemble', date: addDays(dueDate, -2) },
    { key: 'publish', date: dueDate },
  ]
}

export interface ParticipationRow {
  team: Department
  // One cell per edition, newest first; true = the team had content.
  cells: boolean[]
  // Consecutive absences counted from the most recent edition.
  absentStreak: number
}

export interface ParticipationMatrix {
  editions: Edition[]
  rows: ParticipationRow[]
}

export function participationMatrix(editions: Edition[], limit = 6): ParticipationMatrix {
  const cols = editions.slice(0, limit)
  const rows = DEPARTMENTS.map((team) => {
    const cells = cols.map((edition) => {
      const entry = edition.departments.find((dept) => dept.name === team)
      return Boolean(entry && departmentHasContent(entry))
    })
    let absentStreak = 0
    for (const present of cells) {
      if (present) break
      absentStreak++
    }
    return { team, cells, absentStreak }
  })
  return { editions: cols, rows }
}
