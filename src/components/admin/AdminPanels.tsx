import { useMemo, useState } from 'react'
import { CopyButton, DraftBar, ErrorList, Field, inputClass, OutputPanel } from '../ComposerBits'
import { DiscordExport } from '../DiscordExport'
import { DEPARTMENTS, type Department } from '../../config/departments'
import { SITE } from '../../config/site'
import { fr } from '../../i18n/fr'
import { checklistFor, computeCadence, participationMatrix } from '../../lib/cadence'
import {
  composeCoordinationYaml,
  composeEditionFromSections,
  COORDINATION_FILE_PATH,
  editionDraftsDir,
  editionFilePath,
} from '../../lib/compose'
import { getCoordination, getDraftSections, getEditionDrafts, getEditions, getNeeds, getTicketLog } from '../../lib/content'
import {
  lastMonthKeys,
  monthKey,
  monthLabel,
  parseQuarterSlug,
  prevQuarter,
  quarterEnd,
  quarterLabel,
  quarterOf,
  quarterSlug,
  type Quarter,
} from '../../lib/dates'
import { formatNeedsForDiscord } from '../../lib/discord'
import { asBool, asInt, asRecord, asString } from '../../lib/draft'
import { formatDate, formatDuration } from '../../lib/format'
import { computeHealthAlerts, type AlertSeverity } from '../../lib/health'
import { COORDINATION_TEAMS, kpisForQuarter, monthlyTicketSeries, type QuarterKpis } from '../../lib/kpi'
import { useDraft } from '../../lib/useDraft'

const severityDot: Record<AlertSeverity, string> = {
  danger: 'bg-coral-strong',
  warn: 'bg-warn',
  info: 'bg-accent',
}

export function AlertsPanel({ now }: { now: Date }) {
  const t = fr.admin.alerts
  const alerts = useMemo(() => computeHealthAlerts(now, getEditions(), getNeeds(), getTicketLog(), getEditionDrafts()), [now])
  return (
    <section aria-labelledby="admin-alerts" className="mt-10">
      <h2 id="admin-alerts" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      {alerts.length === 0 ? (
        <p className="mt-3 text-ink-soft">{t.ok}</p>
      ) : (
        <ul className="card mt-4 divide-y divide-line p-2">
          {alerts.map((alert) => (
            <li key={alert.text} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDot[alert.severity]}`} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-ink-soft">{alert.text}</span>
              {alert.href && (
                <a
                  href={alert.href}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-bold text-accent hover:text-accent-strong"
                >
                  {t.fix} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function checklistStorageKey(slug: string): string {
  return `pv-checklist-${slug}`
}

function readTicks(slug: string): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem(checklistStorageKey(slug)) ?? localStorage.getItem(checklistStorageKey(slug)) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

function writeTicks(slug: string, ticks: Record<string, boolean>): void {
  try {
    localStorage.setItem(checklistStorageKey(slug), JSON.stringify(ticks))
  } catch {
    // Private mode: ticks simply don't persist.
  }
}

export function CockpitPanel({ now }: { now: Date }) {
  const t = fr.admin.cockpit
  const editions = getEditions()
  const cadence = useMemo(() => computeCadence(now, editions), [now, editions])
  const slug = quarterSlug(cadence.next)
  const label = quarterLabel(cadence.next)
  const steps = useMemo(() => checklistFor(cadence.dueDate), [cadence.dueDate])
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => readTicks(slug))
  const matrix = useMemo(() => participationMatrix(editions), [editions])
  const origin = window.location.origin
  const dueBadge =
    cadence.daysLeft < 0 ? 'bg-coral-soft text-coral-strong' : cadence.daysLeft <= 14 ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong'

  function toggle(key: string) {
    const next = { ...ticks, [key]: !ticks[key] }
    setTicks(next)
    writeTicks(slug, next)
  }

  const cols = [...matrix.editions].reverse()
  const relanceTeams = DEPARTMENTS.filter((team) => team !== 'Membership')
  const streakOf = (team: Department) => matrix.rows.find((row) => row.team === team)?.absentStreak ?? 0

  return (
    <section aria-labelledby="admin-cockpit" className="mt-10">
      <h2 id="admin-cockpit" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      <div className="card mt-4 p-6">
        <p className="text-lg font-extrabold">{t.nextEdition(label)}</p>
        <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold ${dueBadge}`}>
          {t.due(formatDate(cadence.dueDate), cadence.daysLeft)}
        </p>
        <h3 className="mt-5 text-sm font-extrabold">{t.checklistTitle}</h3>
        <ul className="mt-2 space-y-2">
          {steps.map((step) => {
            const overdue = !ticks[step.key] && step.date.getTime() < now.getTime()
            return (
              <li key={step.key} className="flex items-center gap-3 text-sm">
                <input
                  id={`step-${step.key}`}
                  type="checkbox"
                  checked={Boolean(ticks[step.key])}
                  onChange={() => toggle(step.key)}
                  className="h-4 w-4 accent-accent"
                />
                <label htmlFor={`step-${step.key}`} className={overdue ? 'font-semibold text-warn' : ticks[step.key] ? 'text-ink-soft line-through' : ''}>
                  {t.steps[step.key]} — {formatDate(step.date)}
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <h3 className="mt-6 text-lg font-extrabold">{t.matrixTitle}</h3>
      {cols.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">{t.matrixEmpty}</p>
      ) : (
        <div className="card mt-3 overflow-x-auto p-4" tabIndex={0}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th scope="col" className="py-2 pr-3 font-bold">
                  {fr.contribuer.filterDepartment}
                </th>
                {cols.map((edition) => {
                  const parsed = parseQuarterSlug(edition.slug)
                  return (
                    <th key={edition.slug} scope="col" className="px-2 py-2 text-center font-bold whitespace-nowrap">
                      {parsed ? quarterLabel(parsed) : edition.slug}
                    </th>
                  )
                })}
                <th scope="col" className="py-2 pl-2" />
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.team} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
                    {row.team}
                  </th>
                  {[...row.cells].reverse().map((present, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      <span
                        role="img"
                        aria-label={present ? t.present : t.absent}
                        className={present ? 'font-bold text-ok' : 'text-ink-soft/50'}
                      >
                        {present ? '✓' : '—'}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-right">
                    {row.absentStreak > 0 && cols.length > 0 && (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold whitespace-nowrap text-warn">
                        {t.streak(row.absentStreak)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-6 text-lg font-extrabold">{t.relanceTitle}</h3>
      <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t.relanceHelp}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {relanceTeams.map((team) => (
          <CopyButton
            key={team}
            label={`${team}${streakOf(team) > 0 ? ' ⚠' : ''}`}
            text={fr.admin.cockpit.relanceQuarter(team, label, formatDate(cadence.dueDate), origin)}
          />
        ))}
      </div>
    </section>
  )
}

interface AssembleDraftState {
  quarter: number
  year: number
  title: string
  titleTouched: boolean
  published: string
  publishedTouched: boolean
  intro: string
  body: string
}

const ASSEMBLE_DRAFT_KEY = 'membership-draft-assemble-v1'

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function AssemblePanel({ now }: { now: Date }) {
  const t = fr.admin.assemble
  const editions = getEditions()
  const cadence = useMemo(() => computeCadence(now, editions), [now, editions])
  const draft = useDraft<AssembleDraftState>(
    ASSEMBLE_DRAFT_KEY,
    () => ({
      quarter: cadence.next.q,
      year: cadence.next.year,
      title: '',
      titleTouched: false,
      published: '',
      publishedTouched: false,
      intro: '',
      body: '',
    }),
    (stored, initial) => {
      const s = asRecord(stored)
      return {
        quarter: asInt(s.quarter, initial.quarter),
        year: asInt(s.year, initial.year),
        title: asString(s.title),
        titleTouched: asBool(s.titleTouched),
        published: asString(s.published),
        publishedTouched: asBool(s.publishedTouched),
        intro: asString(s.intro),
        body: asString(s.body),
      }
    },
  )
  const d = draft.value
  const patch = (partial: Partial<AssembleDraftState>) => draft.set((prev) => ({ ...prev, ...partial }))

  const yearValid = Number.isInteger(d.year) && d.year >= 2020 && d.year <= 2100
  const target: Quarter = { year: d.year, q: d.quarter as Quarter['q'] }
  const slug = `${d.year}-q${d.quarter}`
  const label = quarterLabel(target)
  const sections = getDraftSections(slug)
  const receivedNames = sections.map((section) => section.name)
  const missing = DEPARTMENTS.filter((team) => !receivedNames.includes(team))
  const alreadyPublished = editions.some((edition) => edition.slug === slug)

  const effectiveTitle = d.titleTouched ? d.title : `Point vACC — ${label}`
  const effectivePublished = d.publishedTouched ? d.published : yearValid ? isoDay(quarterEnd(target)) : ''

  const errors = [
    !yearValid && fr.compose.edition.errYear,
    sections.length === 0 && t.errNoSections,
    alreadyPublished && t.alreadyPublished(label),
    !effectiveTitle.trim() && t.errTitle,
    !effectivePublished && t.errPublished,
    !d.intro.trim() && t.errIntro,
  ].filter((e): e is string => Boolean(e))

  const file =
    errors.length === 0
      ? composeEditionFromSections(
          { title: effectiveTitle, slug, published: effectivePublished, intro: d.intro, body: d.body },
          sections,
        )
      : ''

  return (
    <section aria-labelledby="admin-assemble" className="mt-10">
      <h2 id="admin-assemble" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>
      <DraftBar restored={draft.restored} onReset={draft.reset} />

      <div className="card mt-4 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={fr.compose.edition.quarter} htmlFor="as-quarter">
            <select id="as-quarter" className={inputClass} value={d.quarter} onChange={(e) => patch({ quarter: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  T{q}
                </option>
              ))}
            </select>
          </Field>
          <Field label={fr.compose.edition.year} htmlFor="as-year">
            <input
              id="as-year"
              type="number"
              min={2020}
              max={2100}
              className={inputClass}
              value={d.year}
              onChange={(e) => patch({ year: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.editionTitle} htmlFor="as-title">
            <input id="as-title" className={inputClass} value={effectiveTitle} onChange={(e) => patch({ title: e.target.value, titleTouched: true })} />
          </Field>
          <Field label={t.published} htmlFor="as-published">
            <input
              id="as-published"
              type="date"
              className={inputClass}
              value={effectivePublished}
              onChange={(e) => patch({ published: e.target.value, publishedTouched: true })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t.intro} htmlFor="as-intro">
              <textarea id="as-intro" className={`${inputClass} min-h-24`} value={d.intro} onChange={(e) => patch({ intro: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t.body} htmlFor="as-body">
              <textarea id="as-body" className={`${inputClass} min-h-20`} value={d.body} onChange={(e) => patch({ body: e.target.value })} />
            </Field>
          </div>
        </div>

        <h3 className="mt-6 text-sm font-extrabold">{t.received}</h3>
        {sections.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t.none(label)}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {receivedNames.map((team) => (
              <span key={team} className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-bold text-ok">
                ✓ {team}
              </span>
            ))}
          </div>
        )}
        {sections.length > 0 && missing.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-extrabold">{t.missing}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {missing.map((team) => (
                <span key={team} className="rounded-full border border-line bg-canvas px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                  — {team}
                </span>
              ))}
            </div>
          </>
        )}

        <ErrorList errors={errors} />
        {file && <OutputPanel content={file} filePath={editionFilePath(slug)} mode="new-file" downloadName={`${slug}.md`} />}

        {sections.length > 0 && (
          <div className="card mt-6 border-warn-soft bg-warn-soft/40 p-5">
            <p className="text-sm font-bold">{t.cleanupTitle}</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.cleanupText}</p>
            <a
              href={`${SITE.repoUrl}/tree/main/${editionDraftsDir(slug)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary mt-4"
            >
              {t.cleanupCta} ↗
            </a>
          </div>
        )}
      </div>
    </section>
  )
}

export function NeedsExportPanel() {
  const t = fr.admin.needsExport
  const chunks = useMemo(() => formatNeedsForDiscord(getNeeds(), window.location.origin), [])
  return (
    <section aria-labelledby="admin-needs-export" className="mt-10">
      <h2 id="admin-needs-export" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>
      <div className="mt-4">{chunks.length === 0 ? <p className="text-sm text-ink-soft">{t.empty}</p> : <DiscordExport chunks={chunks} />}</div>
    </section>
  )
}

export function CoordinationPanel({ now }: { now: Date }) {
  const t = fr.admin.coordination
  const entries = getCoordination()
  const months = useMemo(() => lastMonthKeys(now, 6), [now])
  const currentKey = monthKey(now)
  const receivedFor = (month: string): Department[] => entries.find((entry) => entry.month === month)?.received ?? []

  const [month, setMonth] = useState(currentKey)
  const [checked, setChecked] = useState<Department[]>([])
  const yaml = composeCoordinationYaml(month, checked)
  const missingNow = COORDINATION_TEAMS.filter((team) => !receivedFor(currentKey).includes(team))

  return (
    <section aria-labelledby="admin-coordination" className="mt-10">
      <h2 id="admin-coordination" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>

      <h3 className="mt-4 text-lg font-extrabold">{t.matrixTitle}</h3>
      <div className="card mt-3 overflow-x-auto p-4" tabIndex={0}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-bold">
                {fr.contribuer.filterDepartment}
              </th>
              {months.map((m) => (
                <th key={m} scope="col" className="px-2 py-2 text-center font-bold whitespace-nowrap">
                  {m.slice(5)}/{m.slice(2, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COORDINATION_TEAMS.map((team) => (
              <tr key={team} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
                  {team}
                </th>
                {months.map((m) => {
                  const got = receivedFor(m).includes(team)
                  return (
                    <td key={m} className="px-2 py-2 text-center">
                      <span role="img" aria-label={got ? t.receivedAria : t.missingAria} className={got ? 'font-bold text-ok' : 'text-ink-soft/50'}>
                        {got ? '✓' : '—'}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingNow.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {missingNow.map((team) => (
            <CopyButton key={team} label={t.relanceFor(team)} text={t.relanceMonthly(team, monthLabel(currentKey))} />
          ))}
        </div>
      )}

      <div className="card mt-6 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.month} htmlFor="coord-month">
            <input id="coord-month" type="month" className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
          <fieldset>
            <legend className="text-sm font-bold">{t.teams}</legend>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {COORDINATION_TEAMS.map((team) => (
                <label key={team} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked.includes(team)}
                    onChange={(e) => setChecked((prev) => (e.target.checked ? [...prev, team] : prev.filter((x) => x !== team)))}
                    className="h-4 w-4"
                  />
                  {team}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {/^\d{4}-\d{2}$/.test(month) && checked.length > 0 && (
          <OutputPanel content={yaml} filePath={COORDINATION_FILE_PATH} mode="append" appendHelp={t.appendHelp} />
        )}
      </div>
    </section>
  )
}

type RowKind = 'int' | 'duration' | 'pct'
interface KpiRow {
  key: keyof QuarterKpis
  label: string
  kind: RowKind
  better: 'higher' | 'lower' | 'neutral'
}

function kpiValue(kpis: QuarterKpis, row: KpiRow): number | null {
  const value = kpis[row.key]
  return value === null ? null : Number(value)
}

function formatKpi(value: number | null, kind: RowKind): string {
  if (value === null) return '—'
  if (kind === 'int') return String(value)
  if (kind === 'pct') return `${Math.round(value * 100)} %`
  return formatDuration(value)
}

export function KpiPanel({ now }: { now: Date }) {
  const t = fr.admin.kpi
  const current = quarterOf(now)
  const previous = prevQuarter(current)
  const data = useMemo(
    () => ({ tickets: getTicketLog(), needs: getNeeds(), editions: getEditions(), coordination: getCoordination() }),
    [],
  )
  const prevK = useMemo(() => kpisForQuarter(previous, data), [previous, data])
  const currK = useMemo(() => kpisForQuarter(current, data), [current, data])
  const series = useMemo(() => monthlyTicketSeries(now, data.tickets), [now, data])

  const rows: KpiRow[] = [
    { key: 'received', label: t.rows.received, kind: 'int', better: 'neutral' },
    { key: 'resolved', label: t.rows.resolved, kind: 'int', better: 'higher' },
    { key: 'medianFirstResponseMs', label: t.rows.firstResponse, kind: 'duration', better: 'lower' },
    { key: 'needsOpened', label: t.rows.needsOpened, kind: 'int', better: 'neutral' },
    { key: 'needsFilled', label: t.rows.needsFilled, kind: 'int', better: 'higher' },
    { key: 'medianTimeToFillMs', label: t.rows.timeToFill, kind: 'duration', better: 'lower' },
    { key: 'participationRate', label: t.rows.participation, kind: 'pct', better: 'higher' },
    { key: 'coordinationRate', label: t.rows.coordination, kind: 'pct', better: 'higher' },
  ]

  function deltaFor(row: KpiRow): { symbol: string; className: string } {
    const a = kpiValue(prevK, row)
    const b = kpiValue(currK, row)
    if (a === null || b === null || a === b) return { symbol: '→', className: 'text-ink-soft' }
    const up = b > a
    const improving = row.better === 'neutral' ? null : row.better === 'higher' ? up : !up
    return {
      symbol: up ? '↑' : '↓',
      className: improving === null ? 'text-ink-soft' : improving ? 'text-ok' : 'text-coral-strong',
    }
  }

  const markdown = [
    `| ${t.indicator} | ${quarterLabel(previous)} | ${quarterLabel(current)} |`,
    '| --- | --- | --- |',
    ...rows.map((row) => `| ${row.label} | ${formatKpi(kpiValue(prevK, row), row.kind)} | ${formatKpi(kpiValue(currK, row), row.kind)} |`),
  ].join('\n')

  const hasSeriesData = series.some((point) => point.received > 0 || point.resolved > 0)

  return (
    <section aria-labelledby="admin-kpi" className="mt-10">
      <h2 id="admin-kpi" className="text-2xl font-extrabold">
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>
      <div className="card mt-4 overflow-x-auto p-4" tabIndex={0}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th scope="col" className="py-2 pr-3 font-bold">
                {t.indicator}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold whitespace-nowrap">
                {quarterLabel(previous)}
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold whitespace-nowrap">
                {quarterLabel(current)}
              </th>
              <th scope="col" className="py-2 pl-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = deltaFor(row)
              return (
                <tr key={row.key} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {row.label}
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{formatKpi(kpiValue(prevK, row), row.kind)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatKpi(kpiValue(currK, row), row.kind)}</td>
                  <td className={`py-2 pl-3 text-center font-bold ${delta.className}`}>{delta.symbol}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-3">
          <CopyButton label={t.copyMd} text={markdown} />
        </div>
      </div>

      <h3 className="mt-6 text-lg font-extrabold">{t.chartsTitle}</h3>
      {hasSeriesData ? (
        <div className="card mt-3 p-4">
          <TrendChart series={series} />
          <p className="mt-2 text-xs text-ink-soft">{t.chartsLegend}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{t.chartsEmpty}</p>
      )}
    </section>
  )
}

function TrendChart({ series }: { series: ReturnType<typeof monthlyTicketSeries> }) {
  const width = 260
  const height = 90
  const baseline = 70
  const slot = width / series.length
  const maxCount = Math.max(1, ...series.map((p) => Math.max(p.received, p.resolved)))
  const medians = series.filter((p) => p.medianFirstResponseMs !== null).map((p) => p.medianFirstResponseMs!)
  const maxMedian = medians.length ? Math.max(...medians) : 0
  const barHeight = (count: number) => (count / maxCount) * 48
  const points = series
    .map((p, i) =>
      p.medianFirstResponseMs === null ? null : `${i * slot + slot / 2},${baseline - 4 - (p.medianFirstResponseMs / (maxMedian || 1)) * 40}`,
    )
    .filter((p): p is string => p !== null)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={fr.admin.kpi.chartsTitle} className="w-full max-w-md">
      <line x1="0" y1={baseline} x2={width} y2={baseline} stroke="var(--color-line)" strokeWidth="1" />
      {series.map((p, i) => (
        <g key={p.month}>
          <rect x={i * slot + slot / 2 - 9} y={baseline - barHeight(p.received)} width="8" height={barHeight(p.received)} fill="var(--color-accent)" rx="1.5" />
          <rect x={i * slot + slot / 2 + 1} y={baseline - barHeight(p.resolved)} width="8" height={barHeight(p.resolved)} fill="var(--color-ok)" rx="1.5" />
          <text x={i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="8" fill="var(--color-ink-soft)">
            {p.month.slice(5)}
          </text>
        </g>
      ))}
      {points.length > 1 && <polyline points={points.join(' ')} fill="none" stroke="var(--color-coral-strong)" strokeWidth="1.5" />}
    </svg>
  )
}
