// Single source of truth for the department list and its display order.
// ❓ Exact list, wording and order still to be confirmed with Pierre (see README).
export const DEPARTMENTS = [
  'NAV',
  'Training ATC',
  'Pilot Training',
  'Digital Services',
  'Documentation',
  'CDM',
  'Events',
  'Membership',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export function sortByDepartmentOrder<T>(items: readonly T[], name: (item: T) => Department): T[] {
  return [...items].sort((a, b) => DEPARTMENTS.indexOf(name(a)) - DEPARTMENTS.indexOf(name(b)))
}
