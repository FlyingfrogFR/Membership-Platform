import { useMemo, useState } from 'react'
import { fr } from '../i18n/fr'
import { formatEditionForDiscord } from '../lib/discord'
import type { Edition } from '../lib/schemas'

export function DiscordExport({ edition }: { edition: Edition }) {
  const chunks = useMemo(() => formatEditionForDiscord(edition), [edition])
  const [copied, setCopied] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [manual, setManual] = useState(false)

  async function copyChunk(index: number) {
    try {
      await navigator.clipboard.writeText(chunks[index])
      setCopied(index)
      window.setTimeout(() => setCopied((current) => (current === index ? null : current)), 2500)
    } catch {
      setManual(true)
      setPanelOpen(true)
    }
  }

  function onMainClick() {
    if (chunks.length === 1) void copyChunk(0)
    else setPanelOpen((open) => !open)
  }

  return (
    <div>
      <button
        type="button"
        onClick={onMainClick}
        className="btn btn-primary"
        aria-expanded={chunks.length > 1 ? panelOpen : undefined}
      >
        <CopyIcon />
        {chunks.length === 1 && copied === 0 ? fr.discord.copied : fr.discord.copy}
      </button>
      <p aria-live="polite" className="sr-only">
        {copied !== null ? fr.discord.copied : ''}
      </p>
      {panelOpen && (
        <div className="mt-4 space-y-4">
          {chunks.length > 1 && <p className="max-w-3xl text-sm text-ink-soft">{fr.discord.multiInfo(chunks.length)}</p>}
          {manual && (
            <p role="alert" className="max-w-3xl text-sm font-semibold text-warn">
              {fr.discord.manualFallback}
            </p>
          )}
          {chunks.map((chunk, i) => (
            <div key={i} className="card p-4">
              {chunks.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{fr.discord.chunkTitle(i + 1, chunks.length)}</p>
                  <button
                    type="button"
                    onClick={() => void copyChunk(i)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent-strong"
                  >
                    {copied === i ? fr.discord.copied : fr.discord.copyChunk(i + 1, chunks.length)}
                  </button>
                </div>
              )}
              <pre
                tabIndex={0}
                role="region"
                aria-label={fr.discord.chunkTitle(i + 1, chunks.length)}
                className="mt-3 max-h-56 overflow-auto rounded-lg bg-canvas p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft"
              >
                {chunk}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
