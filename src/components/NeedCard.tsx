import { SITE } from '../config/site'
import { fr } from '../i18n/fr'
import { formatDate } from '../lib/format'
import type { Need } from '../lib/schemas'
import { Badge, type BadgeVariant } from './Badge'

const statusVariants: Record<Need['status'], BadgeVariant> = {
  open: 'ok',
  filled: 'neutral',
  closed: 'neutral',
}

export function NeedCard({ need }: { need: Need }) {
  return (
    <article className={`card flex h-full flex-col gap-3 p-5 ${need.status === 'open' ? '' : 'bg-canvas'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="coral">{fr.contribuer.type[need.type]}</Badge>
        <Badge variant="neutral">{need.department}</Badge>
        <Badge variant={statusVariants[need.status]}>{fr.contribuer.status[need.status]}</Badge>
      </div>
      <h3 className="text-lg leading-snug font-bold">{need.title}</h3>
      <p className="text-sm leading-relaxed text-ink-soft">{need.description}</p>
      {need.skills.length > 0 && (
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">{fr.contribuer.skills} :</span> {need.skills.join(' · ')}
        </p>
      )}
      <div className="mt-auto space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
        {need.time_estimate && (
          <p>
            <span className="font-semibold text-ink">{fr.contribuer.timeEstimate} :</span> {need.time_estimate}
          </p>
        )}
        <p>
          <span className="font-semibold text-ink">{fr.contribuer.contact} :</span> {need.contact}
        </p>
        <p className="text-xs">
          {fr.contribuer.postedOn} {formatDate(need.posted)}
        </p>
        {need.status === 'open' && (
          <a
            href={SITE.discordTicketsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-bold text-accent-strong transition-colors hover:bg-accent hover:text-white"
          >
            {fr.contribuer.cardCta} ↗
          </a>
        )}
      </div>
    </article>
  )
}
