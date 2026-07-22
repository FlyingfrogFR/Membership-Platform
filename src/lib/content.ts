// All content is parsed and schema-validated at build time by the vacc-content
// Vite plugin; this module only revives ISO date strings into Date objects and
// applies display ordering. See src/content-data.d.ts for the wire shape.
import content from 'virtual:vacc-content'
import type { Department } from '../config/departments'
import type { CoordinationEntry, Edition, Need, TicketLogEntry } from './schemas'

const STATUS_ORDER: Record<Need['status'], number> = { open: 0, filled: 1, closed: 2 }

const editions: Edition[] = content.editions
  .map((edition) => ({
    ...edition,
    published: new Date(edition.published),
    departments: edition.departments.map((dept) => ({ ...dept, name: dept.name as Department })),
  }))
  .sort((a, b) => b.published.getTime() - a.published.getTime())

const needs: Need[] = content.needs
  .map((need) => ({
    ...need,
    department: need.department as Department,
    posted: new Date(need.posted),
    filled_at: need.filled_at ? new Date(need.filled_at) : undefined,
  }))
  .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.posted.getTime() - a.posted.getTime())

const tickets: TicketLogEntry[] = content.tickets
  .map((ticket) => ({
    ...ticket,
    department: ticket.department as Department,
    opened: new Date(ticket.opened),
    first_response: ticket.first_response ? new Date(ticket.first_response) : undefined,
    closed: ticket.closed ? new Date(ticket.closed) : undefined,
  }))
  .sort((a, b) => a.opened.getTime() - b.opened.getTime())

const coordination: CoordinationEntry[] = content.coordination
  .map((entry) => ({ ...entry, received: entry.received as Department[] }))
  .sort((a, b) => b.month.localeCompare(a.month))

export function getEditions(): Edition[] {
  return editions
}

export function getEdition(slug: string): Edition | undefined {
  return editions.find((edition) => edition.slug === slug)
}

export function getNeeds(): Need[] {
  return needs
}

export function getTicketLog(): TicketLogEntry[] {
  return tickets
}

export function getCoordination(): CoordinationEntry[] {
  return coordination
}
