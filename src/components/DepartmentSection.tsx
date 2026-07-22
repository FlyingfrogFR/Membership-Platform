import { fr } from '../i18n/fr'
import type { DepartmentEntry } from '../lib/schemas'

const groups = [
  { key: 'done', label: fr.edition.done, dot: 'bg-ok' },
  { key: 'in_progress', label: fr.edition.inProgress, dot: 'bg-accent' },
  { key: 'next', label: fr.edition.next, dot: 'bg-ink-soft' },
  { key: 'help_wanted', label: fr.edition.helpWanted, dot: 'bg-warn' },
] as const

export function DepartmentSection({ entry }: { entry: DepartmentEntry }) {
  const headingId = `dept-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="card p-6">
      <h2 id={headingId} className="text-xl font-bold">
        {entry.name}
      </h2>
      <div className="mt-4 space-y-5">
        {groups.map(
          (group) =>
            entry[group.key].length > 0 && (
              <div key={group.key}>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${group.dot}`} aria-hidden="true" />
                  {group.label}
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-soft">
                  {entry[group.key].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ),
        )}
        {entry.images.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {entry.images.map((image) => (
              <figure key={image.src} className="overflow-hidden rounded-xl border border-line bg-canvas">
                <a href={image.src} target="_blank" rel="noreferrer">
                  <img src={image.src} alt={image.caption ?? ''} loading="lazy" className="w-full" />
                </a>
                {image.caption && <figcaption className="px-3 py-2 text-xs text-ink-soft">{image.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
