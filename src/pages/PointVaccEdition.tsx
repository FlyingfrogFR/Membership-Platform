import { marked } from 'marked'
import { Link, useParams } from 'react-router-dom'
import { DepartmentSection } from '../components/DepartmentSection'
import { DiscordExport } from '../components/DiscordExport'
import { formatEditionForDiscord } from '../lib/discord'
import { sortByDepartmentOrder } from '../config/departments'
import { fr } from '../i18n/fr'
import { getEdition, getEditions } from '../lib/content'
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
  // Drop all-empty entries so the page matches the Discord export, which skips them.
  const departments = sortByDepartmentOrder(
    edition.departments.filter(
      (d) => d.done.length + d.in_progress.length + d.next.length + d.help_wanted.length + d.images.length > 0 || d.notes,
    ),
    (d) => d.name,
  )

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
        {/* Markdown like the notes and body: the intro is written in a
            textarea, its paragraphs and formatting must survive publication. */}
        <div
          className="rich-text mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft"
          dangerouslySetInnerHTML={{ __html: marked.parse(edition.intro) as string }}
        />
        <div className="mt-6">
          <DiscordExport chunks={formatEditionForDiscord(edition, window.location.origin)} />
        </div>
      </header>
      <div className="mt-10 space-y-6">
        {departments.map((entry) => (
          <DepartmentSection key={entry.name} entry={entry} />
        ))}
      </div>
      {bodyHtml && <div className="rich-text mt-10 max-w-3xl" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
      <EditionPager slug={edition.slug} />
    </article>
  )
}

function EditionPager({ slug }: { slug: string }) {
  // Editions are sorted newest first; "next" means the more recent edition.
  const editions = getEditions()
  const index = editions.findIndex((edition) => edition.slug === slug)
  const newer = index > 0 ? editions[index - 1] : undefined
  const older = index >= 0 && index < editions.length - 1 ? editions[index + 1] : undefined
  if (!newer && !older) return null
  return (
    <nav aria-label={fr.pointVacc.otherEditions} className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
      {older ? (
        <Link to={`/point-vacc/${older.slug}`} className="text-sm font-bold text-accent hover:text-accent-strong">
          ← {fr.pointVacc.previousEdition} : {older.title}
        </Link>
      ) : (
        <span />
      )}
      {newer && (
        <Link to={`/point-vacc/${newer.slug}`} className="text-right text-sm font-bold text-accent hover:text-accent-strong">
          {fr.pointVacc.nextEdition} : {newer.title} →
        </Link>
      )}
    </nav>
  )
}
