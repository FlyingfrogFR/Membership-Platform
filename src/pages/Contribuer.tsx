import { useMemo, useState } from 'react'
import { NeedCard } from '../components/NeedCard'
import { DEPARTMENTS } from '../config/departments'
import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { getNeeds } from '../lib/content'
import { usePageTitle } from '../lib/usePageTitle'

type Tab = 'poste' | 'ponctuel'

const tabs: { value: Tab; label: string }[] = [
  { value: 'poste', label: fr.contribuer.tabPostes },
  { value: 'ponctuel', label: fr.contribuer.tabPonctuels },
]

export function Contribuer() {
  usePageTitle(fr.contribuer.title)
  const needs = getNeeds()
  const [tab, setTab] = useState<Tab>('poste')
  const [department, setDepartment] = useState('all')
  const [time, setTime] = useState('all')

  const timeOptions = useMemo(
    () => [...new Set(needs.map((need) => need.time_estimate).filter((value): value is string => Boolean(value)))],
    [needs],
  )
  const visible = needs.filter(
    (need) =>
      need.type === tab &&
      (department === 'all' || need.department === department) &&
      (time === 'all' || need.time_estimate === time),
  )

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.contribuer.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.contribuer.lede}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex rounded-full border border-line bg-paper p-1">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === value ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label} · {needs.filter((need) => need.type === value && need.status === 'open').length}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-department" className="text-sm font-medium">
            {fr.contribuer.filterDepartment}
          </label>
          <select
            id="filter-department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="all">{fr.contribuer.filterAll}</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-time" className="text-sm font-medium">
            {fr.contribuer.filterTime}
          </label>
          <select
            id="filter-time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          >
            <option value="all">{fr.contribuer.filterAll}</option>
            {timeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-8 text-ink-soft">{fr.contribuer.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {visible.map((need) => (
            <li key={need.id}>
              <NeedCard need={need} />
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="propose-title" className="card mt-12 p-6 sm:p-8">
        <h2 id="propose-title" className="text-xl font-bold">
          {fr.contribuer.proposeTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{fr.contribuer.proposeText}</p>
        <a href={SITE.repoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary mt-5">
          {fr.contribuer.proposeCta} ↗
        </a>
      </section>
    </div>
  )
}
