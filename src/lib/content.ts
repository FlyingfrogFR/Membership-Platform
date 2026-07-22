import { loadYamlDocument, parseFrontmatter } from './frontmatter'
import {
  editionSchema,
  needsFileSchema,
  ticketLogFileSchema,
  type Edition,
  type Need,
  type TicketLogEntry,
} from './schemas'
import needsRaw from '../../content/contribuer/needs.yaml?raw'
import ticketLogRaw from '../../content/membership/tickets-log.yaml?raw'

const editionFiles = import.meta.glob('/content/point-vacc/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const STATUS_ORDER: Record<Need['status'], number> = { open: 0, filled: 1, closed: 2 }

let editionsCache: Edition[] | undefined
let needsCache: Need[] | undefined
let ticketLogCache: TicketLogEntry[] | undefined

export function getEditions(): Edition[] {
  if (!editionsCache) {
    editionsCache = Object.entries(editionFiles)
      .map(([path, raw]) => {
        const { data, body } = parseFrontmatter(raw, path)
        return { ...editionSchema.parse(data), body }
      })
      .sort((a, b) => b.published.getTime() - a.published.getTime())
  }
  return editionsCache
}

export function getEdition(slug: string): Edition | undefined {
  return getEditions().find((edition) => edition.slug === slug)
}

export function getNeeds(): Need[] {
  if (!needsCache) {
    needsCache = needsFileSchema
      .parse(loadYamlDocument(needsRaw))
      .sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.posted.getTime() - a.posted.getTime(),
      )
  }
  return needsCache
}

export function getTicketLog(): TicketLogEntry[] {
  if (!ticketLogCache) {
    ticketLogCache = ticketLogFileSchema
      .parse(loadYamlDocument(ticketLogRaw))
      .sort((a, b) => a.opened.getTime() - b.opened.getTime())
  }
  return ticketLogCache
}
