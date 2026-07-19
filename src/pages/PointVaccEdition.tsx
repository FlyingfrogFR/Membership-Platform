import { marked } from 'marked'
import { Link, useParams } from 'react-router-dom'
import { DepartmentSection } from '../components/DepartmentSection'
import { DiscordExport } from '../components/DiscordExport'
import { sortByDepartmentOrder } from '../config/departments'
import { fr } from '../i18n/fr'
import { getEdition } from '../lib/content'
import { formatDate } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

export function PointVaccEdition() {
  const { slug } = useParams<{ slug: string }>()
  const edition = slug ? getEdition(slug) : undefined
  usePageTitle(edition ? edition.title : fr.pointVacc.notFoundTitle)

  if (!edition) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{fr.pointVacc.notFoundTitle}</h1>
        <p className="mt-4 text-ink-soft">{fr.pointVacc.notFoundText}</p>
        <Link to="/point-vacc" className="btn btn-primary mt-6">
          {fr.pointVacc.backToArchive}
        </Link>
      </div>
    )
  }

  // Edition bodies come from this repository and are reviewed before merge, so
  // rendering the generated HTML directly is safe — no user-submitted input here.
  const bodyHtml = edition.body ? (marked.parse(edition.body) as string) : ''
  const departments = sortByDepartmentOrder(edition.departments, (d) => d.name)

  return (
    <article>
      <header>
        <Link to="/point-vacc" className="text-sm font-semibold text-accent hover:text-accent-strong">
          ← {fr.pointVacc.backToArchive}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{edition.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {fr.pointVacc.publishedOn} {formatDate(edition.published)}
        </p>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft">{edition.intro}</p>
        <div className="mt-6">
          <DiscordExport edition={edition} />
        </div>
      </header>
      <div className="mt-10 space-y-6">
        {departments.map((entry) => (
          <DepartmentSection key={entry.name} entry={entry} />
        ))}
      </div>
      {bodyHtml && <div className="rich-text mt-10 max-w-3xl" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
    </article>
  )
}
