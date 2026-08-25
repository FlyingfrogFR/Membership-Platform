// Single source of truth for the team list and its display order, aligned with
// the official page « Organisation et rôles dans la vACC » (doc.vatsim.fr,
// section Général). Ops & Nav covers both operations (LOAs, SOPs, controller
// documentation) and navigation (sector files, external tools such as CDM or
// vSID); Digital owns the web platforms, infrastructure and internal tools
// (CoFrance v2, Ramp Agent…); Membership is part of the official organization
// (quarterly visibility, Discord tickets, member conflict resolution). Update
// only when the official page changes.
export const DEPARTMENTS = [
  'vACC Directors',
  'Ops & Nav',
  'Training Department',
  'Digital',
  'Events',
  'Membership',
] as const

export type Department = (typeof DEPARTMENTS)[number]

export function sortByDepartmentOrder<T>(items: readonly T[], name: (item: T) => Department): T[] {
  return [...items].sort((a, b) => DEPARTMENTS.indexOf(name(a)) - DEPARTMENTS.indexOf(name(b)))
}
