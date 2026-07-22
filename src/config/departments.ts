// Single source of truth for the team list and its display order, aligned with
// the official vACC document "Fonctionnement des équipes". CDM/CPDLC tooling
// sits under the Digital Team and ATC training under the Training Department —
// they are not separate teams. "Membership" is not in that document: it is
// added here at the HoM's request so Membership-addressed tickets and content
// can be categorized. Update only when the official document changes.
export const DEPARTMENTS = [
  'Nav Team',
  'Doc Team',
  'Event Team',
  'Digital Team',
  'Training Department',
  'vACC Directors',
  'Membership',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export function sortByDepartmentOrder<T>(items: readonly T[], name: (item: T) => Department): T[] {
  return [...items].sort((a, b) => DEPARTMENTS.indexOf(name(a)) - DEPARTMENTS.indexOf(name(b)))
}
