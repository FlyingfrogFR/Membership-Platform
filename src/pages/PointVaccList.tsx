import { Link } from 'react-router-dom'
import { fr } from '../i18n/fr'
import { getEditions } from '../lib/content'
import { excerpt, formatDate } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

export function PointVaccList() {
  usePageTitle(fr.pointVacc.title)
  const editions = getEditions()
  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.pointVacc.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.pointVacc.lede}</p>
      </header>
      {editions.length === 0 ? (
        <p className="mt-8 text-ink-soft">{fr.pointVacc.empty}</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {editions.map((edition) => (
            <li key={edition.slug}>
              <article className="card p-6">
                <h2 className="text-xl font-bold">
                  <Link to={`/point-vacc/${edition.slug}`} className="hover:text-accent-strong">
                    {edition.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {fr.pointVacc.publishedOn} {formatDate(edition.published)}
                </p>
                <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{excerpt(edition.intro)}</p>
                <Link
                  to={`/point-vacc/${edition.slug}`}
                  className="mt-4 inline-block text-sm font-semibold text-accent hover:text-accent-strong"
                >
                  {fr.pointVacc.readEdition} →
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
