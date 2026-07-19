import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { fr } from '../i18n/fr'
import { formatDate, formatDuration } from '../lib/format'
import type { DepartmentStat, TicketStats } from '../lib/ticketStats'

export function MembershipStats({ stats }: { stats: TicketStats }) {
  const t = fr.stats
  return (
    <section aria-labelledby="stats-title" className="card p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="stats-title" className="text-xl font-bold">
          {t.title}
        </h2>
        {stats.isSample && <Badge variant="warn">{t.sample}</Badge>}
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">{t.caption}</p>

      {stats.count === 0 ? (
        <p className="mt-4 text-ink-soft">{t.empty}</p>
      ) : (
        <>
          {stats.range && (
            <p className="mt-1 text-xs text-ink-soft">{t.period(formatDate(stats.range.from), formatDate(stats.range.to))}</p>
          )}
          <div className="mt-4 overflow-x-auto" tabIndex={0} role="group" aria-label={t.title}>
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{t.title}</caption>
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    {t.col.department}
                  </th>
                  <NumHead>{t.col.received}</NumHead>
                  <NumHead>{t.col.handled}</NumHead>
                  <NumHead>{t.col.open}</NumHead>
                  <NumHead>{t.col.firstResponse}</NumHead>
                  <NumHead>{t.col.resolution}</NumHead>
                </tr>
              </thead>
              <tbody>
                {stats.departments.map((row) => (
                  <StatRow key={row.department} label={row.department} row={row} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-semibold">
                  <th scope="row" className="py-2 pr-3 text-left">
                    {t.total}
                  </th>
                  <NumCell>{stats.totals.received}</NumCell>
                  <NumCell>{stats.totals.handled}</NumCell>
                  <NumCell>{stats.totals.open}</NumCell>
                  <NumCell>{formatMs(stats.totals.avgFirstResponseMs)}</NumCell>
                  <NumCell>{formatMs(stats.totals.avgResolutionMs)}</NumCell>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function StatRow({ label, row }: { label: string; row: DepartmentStat }) {
  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">
        {label}
      </th>
      <NumCell>{row.received}</NumCell>
      <NumCell>{row.handled}</NumCell>
      <NumCell>{row.open}</NumCell>
      <NumCell>{formatMs(row.avgFirstResponseMs)}</NumCell>
      <NumCell>{formatMs(row.avgResolutionMs)}</NumCell>
    </tr>
  )
}

function NumHead({ children }: { children: ReactNode }) {
  return (
    <th scope="col" className="py-2 pl-3 text-right font-semibold whitespace-nowrap">
      {children}
    </th>
  )
}

function NumCell({ children }: { children: ReactNode }) {
  return <td className="py-2 pl-3 text-right tabular-nums whitespace-nowrap text-ink-soft">{children}</td>
}

function formatMs(ms: number | null): string {
  return ms === null ? fr.stats.na : formatDuration(ms)
}
