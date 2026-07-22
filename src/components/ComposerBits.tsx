import { useState, type ReactNode } from 'react'
import { fr } from '../i18n/fr'
import { githubEditFileUrl, githubNewFileUrl } from '../lib/compose'

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  )
}

export const inputClass = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm'

export function ListInput({
  label,
  value,
  onChange,
  idBase,
}: {
  label: string
  value: string[]
  onChange: (items: string[]) => void
  idBase: string
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            id={`${idBase}-${index}`}
            aria-label={`${label} — ligne ${index + 1}`}
            className={inputClass}
            placeholder={fr.compose.itemPlaceholder}
            value={item}
            onChange={(event) => onChange(value.map((v, i) => (i === index ? event.target.value : v)))}
          />
          <button
            type="button"
            aria-label={`${fr.compose.removeItem} — ${label} ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="rounded-full border border-line px-2.5 py-1 text-sm font-bold text-ink-soft transition-colors hover:border-coral-strong hover:text-coral-strong"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ''])}
        className="self-start rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:border-accent"
      >
        + {fr.compose.addItem}
      </button>
    </fieldset>
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function OutputPanel({
  content,
  filePath,
  mode,
  appendHelp,
  downloadName,
}: {
  content: string
  filePath: string
  mode: 'new-file' | 'append'
  appendHelp?: string
  downloadName?: string
}) {
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)

  async function onCopy() {
    setCopied((await copyText(content)) ? 'ok' : 'fail')
    window.setTimeout(() => setCopied(null), 2500)
  }

  // Copy first so the user can paste even if GitHub ignores the prefill.
  async function onGithub() {
    await copyText(content)
    const url = mode === 'new-file' ? githubNewFileUrl(filePath, content) : githubEditFileUrl(filePath)
    window.open(url, '_blank', 'noopener')
  }

  function onDownload() {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = downloadName ?? filePath.split('/').pop() ?? 'contenu.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card mt-6 p-5">
      <p className="text-sm font-bold">{fr.compose.preview}</p>
      <p className="mt-1 text-xs text-ink-soft">{appendHelp ?? fr.compose.fileNameHint(filePath)}</p>
      <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-canvas p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink-soft">
        {content}
      </pre>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void onCopy()} className="btn btn-primary">
          {copied === 'ok' ? fr.compose.copied : copied === 'fail' ? fr.compose.copyFailed : fr.compose.copy}
        </button>
        {mode === 'new-file' && (
          <button type="button" onClick={onDownload} className="btn btn-secondary">
            {fr.compose.download}
          </button>
        )}
        <button type="button" onClick={() => void onGithub()} className="btn btn-secondary">
          {mode === 'new-file' ? fr.compose.openGithubNew : fr.compose.openGithubEdit} ↗
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied === 'ok' ? fr.compose.copied : ''}
      </p>
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-soft">{fr.compose.githubHelp}</p>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">{fr.compose.discordAlt}</p>
    </div>
  )
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null
  return (
    <div className="mt-6 rounded-xl bg-warn-soft p-4 text-sm text-warn" role="alert">
      <p className="font-bold">{fr.compose.errorsHeading}</p>
      <ul className="mt-1 list-disc pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
