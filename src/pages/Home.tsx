import { Link } from 'react-router-dom'
import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { getEditions } from '../lib/content'
import { excerpt, formatDate } from '../lib/format'
import { usePageTitle } from '../lib/usePageTitle'

export function Home() {
  usePageTitle()
  const [latest] = getEditions()
  return (
    <div className="space-y-14">
      <section className="pt-4 sm:pt-8">
        <p className="eyebrow">{fr.home.eyebrow}</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">{fr.home.heroTitle}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{fr.home.heroText}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/contribuer" className="btn btn-primary">
            {fr.home.ctaContribuer}
          </Link>
          {latest ? (
            <Link to={`/point-vacc/${latest.slug}`} className="btn btn-secondary">
              {fr.home.ctaLatest}
            </Link>
          ) : (
            <Link to="/point-vacc" className="btn btn-secondary">
              {fr.home.ctaDiscover}
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="latest-title">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="latest-title" className="text-2xl font-bold">
            {fr.home.latestTitle}
          </h2>
          <Link to="/point-vacc" className="text-sm font-semibold text-accent hover:text-accent-strong">
            {fr.home.allEditions}
          </Link>
        </div>
        {latest ? (
          <article className="card mt-4 p-6">
            <h3 className="text-xl font-bold">
              <Link to={`/point-vacc/${latest.slug}`} className="hover:text-accent-strong">
                {latest.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {fr.pointVacc.publishedOn} {formatDate(latest.published)}
            </p>
            <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{excerpt(latest.intro)}</p>
            <Link
              to={`/point-vacc/${latest.slug}`}
              className="mt-4 inline-block text-sm font-semibold text-accent hover:text-accent-strong"
            >
              {fr.home.readEdition} →
            </Link>
          </article>
        ) : (
          <p className="mt-4 text-ink-soft">{fr.home.latestEmpty}</p>
        )}
      </section>

      <section aria-labelledby="contact-title" className="rounded-2xl bg-accent-soft p-6 sm:p-8">
        <h2 id="contact-title" className="text-2xl font-extrabold">
          {fr.home.contactTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{fr.home.contactText}</p>
        <a href={SITE.discordTicketsUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-5">
          {fr.home.contactCta} ↗
        </a>
      </section>
    </div>
  )
}
