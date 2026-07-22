// Single source of truth for the team list and its display order, aligned with
// the official vACC document "Fonctionnement des équipes". CDM/CPDLC tooling
// sits under the Digital Team and ATC training under the Training Department —
// they are not separate teams. Update only when the official document changes.
export const DEPARTMENTS = [
  'Nav Team',
  'Doc Team',
  'Event Team',
  'Digital Team',
  'Training Department',
  'vACC Directors',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export function sortByDepartmentOrder<T>(items: readonly T[], name: (item: T) => Department): T[] {
  return [...items].sort((a, b) => DEPARTMENTS.indexOf(name(a)) - DEPARTMENTS.indexOf(name(b)))
}
