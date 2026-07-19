import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { usePageTitle } from '../lib/usePageTitle'

export function APropos() {
  usePageTitle(fr.aPropos.title)
  return (
    <div className="space-y-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.aPropos.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.aPropos.lede}</p>
      </header>

      <section aria-labelledby="mandate-title" className="max-w-2xl">
        <h2 id="mandate-title" className="text-2xl font-bold">
          {fr.aPropos.mandateTitle}
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">{fr.aPropos.mandateText}</p>
      </section>

      <section aria-labelledby="pillars-title">
        <h2 id="pillars-title" className="text-2xl font-bold">
          {fr.aPropos.pillarsTitle}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {fr.aPropos.pillars.map((pillar, index) => (
            <li key={pillar.title} className="card p-6">
              <p className="text-sm font-bold text-accent">{String(index + 1).padStart(2, '0')}</p>
              <h3 className="mt-1 text-lg font-bold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pillar.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="apropos-contact-title" className="rounded-lg border border-line bg-band p-6 sm:p-8">
        <h2 id="apropos-contact-title" className="text-2xl font-bold">
          {fr.aPropos.contactTitle}
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{fr.aPropos.contactText}</p>
        <a href={SITE.discordTicketsUrl} target="_blank" rel="noreferrer" className="btn btn-primary mt-5">
          {fr.aPropos.contactCta} ↗
        </a>
      </section>
    </div>
  )
}
