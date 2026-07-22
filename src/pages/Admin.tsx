import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorList, Field, inputClass, OutputPanel } from '../components/ComposerBits'
import { Gate } from '../components/Gate'
import { DEPARTMENTS, type Department } from '../config/departments'
import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { composeTicketYaml, githubEditFileUrl, NEEDS_FILE_PATH, TICKET_LOG_FILE_PATH } from '../lib/compose'
import { getEditions, getNeeds, getTicketLog } from '../lib/content'
import { usePageTitle } from '../lib/usePageTitle'

export function Admin() {
  usePageTitle(fr.admin.title)
  return (
    <Gate kind="admin">
      <AdminContent />
    </Gate>
  )
}

function AdminContent() {
  const editions = getEditions()
  const needs = getNeeds()
  const tickets = getTicketLog()
  const openNeeds = needs.filter((n) => n.status === 'open').length

  const stats = [
    { label: fr.admin.editions, value: editions.length },
    { label: fr.admin.needsOpen, value: openNeeds },
    { label: fr.admin.needsOther, value: needs.length - openNeeds },
    { label: fr.admin.tickets, value: tickets.length },
  ]

  const links = [
    { label: fr.admin.quickNewEdition, to: '/proposer' },
    { label: fr.admin.quickNewNeed, to: '/proposer' },
    { label: fr.admin.quickEditNeeds, href: githubEditFileUrl(NEEDS_FILE_PATH) },
    { label: fr.admin.quickEditLog, href: githubEditFileUrl(TICKET_LOG_FILE_PATH) },
    { label: fr.admin.quickRepo, href: SITE.repoUrl },
  ]

  return (
    <div>
      <header className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.admin.title}</h1>
          <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{fr.site.internalBadge}</span>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.admin.lede}</p>
        <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm leading-relaxed text-warn">{fr.site.internalNote}</p>
        <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm leading-relaxed text-ink-soft">{fr.admin.note}</p>
      </header>

      <section aria-labelledby="admin-overview" className="mt-10">
        <h2 id="admin-overview" className="text-2xl font-extrabold">
          {fr.admin.overviewTitle}
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-4">
              <dt className="text-xs font-bold text-ink-soft">{stat.label}</dt>
              <dd className="mt-1 text-3xl font-extrabold text-accent">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="admin-links" className="mt-10">
        <h2 id="admin-links" className="text-2xl font-extrabold">
          {fr.admin.quickTitle}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <li key={link.label}>
              {link.to ? (
                <Link to={link.to} className="card block p-4 text-sm font-bold transition-colors hover:border-accent hover:text-accent">
                  {link.label} →
                </Link>
              ) : (
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="card block p-4 text-sm font-bold transition-colors hover:border-accent hover:text-accent"
                >
                  {link.label} ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-ticket" className="mt-10">
        <h2 id="admin-ticket" className="text-2xl font-extrabold">
          {fr.admin.ticketTitle}
        </h2>
        <TicketComposer />
      </section>
    </div>
  )
}

function toIso(local: string): string {
  return local ? new Date(local).toISOString() : ''
}

function TicketComposer() {
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0])
  const [opened, setOpened] = useState('')
  const [firstResponse, setFirstResponse] = useState('')
  const [closed, setClosed] = useState('')
  const [outcome, setOutcome] = useState<'' | 'resolved' | 'redirected' | 'no_response' | 'other'>('')

  const openedIso = toIso(opened)
  const firstIso = toIso(firstResponse)
  const closedIso = toIso(closed)

  const chronologyOk =
    (!firstIso || firstIso >= openedIso) && (!closedIso || closedIso >= openedIso) && (!firstIso || !closedIso || closedIso >= firstIso)

  const errors = [!opened && fr.admin.errOpened, opened && !chronologyOk && fr.admin.errChronology].filter(
    (e): e is string => Boolean(e),
  )

  const id = useMemo(
    () => (openedIso ? `${openedIso.slice(0, 10)}-${department.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''),
    [openedIso, department],
  )

  const yaml =
    errors.length === 0 && openedIso
      ? composeTicketYaml({ id, department, opened: openedIso, first_response: firstIso, closed: closedIso, outcome })
      : ''

  return (
    <div className="card mt-4 p-6 sm:p-8">
      <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{fr.admin.ticketHelp}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label={fr.admin.ticketDepartment} htmlFor="tk-dept">
          <select id="tk-dept" className={inputClass} value={department} onChange={(e) => setDepartment(e.target.value as Department)}>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </Field>
        <Field label={fr.admin.ticketOutcome} htmlFor="tk-outcome">
          <select id="tk-outcome" className={inputClass} value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)}>
            <option value="">—</option>
            {(Object.keys(fr.admin.ticketOutcomes) as Array<keyof typeof fr.admin.ticketOutcomes>).map((key) => (
              <option key={key} value={key}>
                {fr.admin.ticketOutcomes[key]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={fr.admin.ticketOpened} htmlFor="tk-opened">
          <input id="tk-opened" type="datetime-local" className={inputClass} value={opened} onChange={(e) => setOpened(e.target.value)} />
        </Field>
        <Field label={fr.admin.ticketFirstResponse} htmlFor="tk-first">
          <input id="tk-first" type="datetime-local" className={inputClass} value={firstResponse} onChange={(e) => setFirstResponse(e.target.value)} />
        </Field>
        <Field label={fr.admin.ticketClosed} htmlFor="tk-closed">
          <input id="tk-closed" type="datetime-local" className={inputClass} value={closed} onChange={(e) => setClosed(e.target.value)} />
        </Field>
        {id && (
          <Field label={fr.admin.ticketId} htmlFor="tk-id">
            <input id="tk-id" className={inputClass} value={id} readOnly />
          </Field>
        )}
      </div>
      <ErrorList errors={errors} />
      {yaml && <OutputPanel content={yaml} filePath={TICKET_LOG_FILE_PATH} mode="append" appendHelp={fr.admin.ticketAppendHelp} />}
    </div>
  )
}
