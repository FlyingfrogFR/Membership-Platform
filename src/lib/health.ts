// Content-health rules for the admin alert panel: the goal is catching silent
// drift (stale board, slipped edition, abandoned log) before it hurts the
// pillars. Ages are computed against the caller's "now", never at build time.
import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { editionDraftsDir, githubEditFileUrl, NEEDS_FILE_PATH, TICKET_LOG_FILE_PATH } from './compose'
import { daysBetween } from './dates'
import type { Edition, Need, TicketLogEntry } from './schemas'

export type AlertSeverity = 'danger' | 'warn' | 'info'

export interface HealthAlert {
  severity: AlertSeverity
  text: string
  href?: string
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = { danger: 0, warn: 1, info: 2 }

export const NEED_AGING_WARN_DAYS = 30
export const NEED_AGING_DANGER_DAYS = 60
export const TICKET_AGING_DAYS = 14
export const EDITION_OVERDUE_DAYS = 100
export const LOG_QUIET_DAYS = 42

export function computeHealthAlerts(
  now: Date,
  editions: Edition[],
  needs: Need[],
  tickets: TicketLogEntry[],
  editionDrafts: { slug: string }[] = [],
): HealthAlert[] {
  const alerts: HealthAlert[] = []
  const t = fr.admin.alerts
  const needsEdit = githubEditFileUrl(NEEDS_FILE_PATH)

  for (const need of needs) {
    if (need.status !== 'open') continue
    const age = daysBetween(need.posted, now)
    if (age >= NEED_AGING_WARN_DAYS) {
      alerts.push({
        severity: age >= NEED_AGING_DANGER_DAYS ? 'danger' : 'warn',
        text: t.needAging(need.title, need.department, age),
        href: needsEdit,
      })
    }
  }

  const missingFilledAt = needs.filter((need) => need.status === 'filled' && !need.filled_at).length
  if (missingFilledAt > 0) alerts.push({ severity: 'info', text: t.missingFilledAt(missingFilledAt), href: needsEdit })

  for (const ticket of tickets) {
    if (ticket.closed) continue
    const age = daysBetween(ticket.opened, now)
    if (age >= TICKET_AGING_DAYS) {
      alerts.push({ severity: 'warn', text: t.ticketAging(ticket.id, age), href: githubEditFileUrl(TICKET_LOG_FILE_PATH) })
    }
  }

  const latest = editions[0]
  if (!latest) {
    alerts.push({ severity: 'info', text: t.noEdition })
  } else {
    const age = daysBetween(latest.published, now)
    if (age > EDITION_OVERDUE_DAYS) alerts.push({ severity: 'warn', text: t.editionOverdue(age) })
  }

  if (tickets.length === 0) {
    alerts.push({ severity: 'info', text: t.logEmpty })
  } else {
    const newest = new Date(Math.max(...tickets.map((ticket) => ticket.opened.getTime())))
    const quiet = daysBetween(newest, now)
    if (quiet > LOG_QUIET_DAYS) alerts.push({ severity: 'warn', text: t.logQuiet(quiet) })
  }

  const hasSamples = [...needs.map((n) => n.id), ...tickets.map((tk) => tk.id)].some((id) => id.startsWith('exemple-'))
  if (hasSamples) alerts.push({ severity: 'warn', text: t.sampleData })

  // Draft sections whose edition already shipped are forgotten leftovers.
  const publishedSlugs = new Set(editions.map((edition) => edition.slug))
  const leftoverCounts = new Map<string, number>()
  for (const draft of editionDrafts) {
    if (publishedSlugs.has(draft.slug)) leftoverCounts.set(draft.slug, (leftoverCounts.get(draft.slug) ?? 0) + 1)
  }
  for (const [slug, count] of [...leftoverCounts.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    alerts.push({
      severity: 'warn',
      text: t.draftsLeftover(slug, count),
      href: `${SITE.repoUrl}/tree/main/${editionDraftsDir(slug)}`,
    })
  }

  if (SITE.discordTicketsUrl.includes('vatsim.fr')) {
    alerts.push({ severity: 'info', text: t.discordPlaceholder, href: githubEditFileUrl('src/config/site.ts') })
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
