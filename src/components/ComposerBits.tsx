import { useState, type ReactNode } from 'react'
import { directSubmitEnabled, oidcConfig, passSubmitEnabled, ssoEnabled } from '../config/auth'
import { fr } from '../i18n/fr'
import { githubEditFileUrl, githubNewFileUrl } from '../lib/compose'
import { getGatePass, relock } from '../lib/gate'
import { beginLogin, getSsoToken } from '../lib/oidc'

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

export const inputClass = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-base sm:text-sm'

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

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  async function onCopy() {
    setState((await copyText(text)) ? 'ok' : 'fail')
    window.setTimeout(() => setState('idle'), 2500)
  }
  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:border-accent"
    >
      {state === 'ok' ? fr.compose.copied : state === 'fail' ? fr.compose.copyFailed : (label ?? fr.compose.copy)}
    </button>
  )
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

// One-click submission through the serverless functions: the function opens
// the GitHub proposal itself (no GitHub account needed) and pings the HoM on
// Discord. Renders nothing until VITE_DIRECT_SUBMIT plus an auth path (SSO,
// or the transitional VITE_PASS_SUBMIT passphrase mode) are configured.
export function DirectSend({ endpoint, payload }: { endpoint: string; payload: unknown }) {
  const t = fr.compose.direct
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'expired' | 'locked' | 'error'>('idle')
  const [prUrl, setPrUrl] = useState('')
  const [detail, setDetail] = useState('')

  if (!directSubmitEnabled()) return null

  async function onSend() {
    // SSO token first; otherwise the transitional passphrase kept by the gate.
    const token = getSsoToken()
    const pass = !token && passSubmitEnabled() ? getGatePass() : null
    if (!token && !pass) {
      setState(ssoEnabled() ? 'expired' : 'locked')
      return
    }
    setState('sending')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Team-Pass': encodeURIComponent(pass ?? '') }),
        },
        body: JSON.stringify(payload),
      })
      if (response.status === 401) {
        setState(token ? 'expired' : 'locked')
        return
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setDetail(body.error ?? `HTTP ${response.status}`)
        setState('error')
        return
      }
      const body = (await response.json()) as { prUrl?: string }
      setPrUrl(body.prUrl ?? '')
      setState('done')
    } catch {
      setDetail('réseau')
      setState('error')
    }
  }

  async function onReconnect() {
    try {
      const url = await beginLogin(oidcConfig(), window.location.pathname)
      window.location.assign(url)
    } catch {
      setDetail('SSO')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-6 rounded-xl bg-ok-soft p-4 text-sm" role="status">
        <p className="font-bold text-ok">{t.sentTitle}</p>
        {prUrl && (
          <a href={prUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-accent hover:text-accent-strong">
            {t.viewPr} ↗
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      {state === 'expired' ? (
        <div className="rounded-xl bg-warn-soft p-4 text-sm">
          <p className="text-warn">{t.expired}</p>
          <button type="button" onClick={() => void onReconnect()} className="btn btn-secondary mt-3">
            {t.reconnect}
          </button>
        </div>
      ) : state === 'locked' ? (
        <div className="rounded-xl bg-warn-soft p-4 text-sm">
          <p className="text-warn">{t.passMissing}</p>
          <button
            type="button"
            onClick={() => {
              relock()
              window.location.reload()
            }}
            className="btn btn-secondary mt-3"
          >
            {t.relock}
          </button>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => void onSend()} disabled={state === 'sending'} className="btn btn-primary">
            {state === 'sending' ? t.sending : t.send}
          </button>
          {state === 'error' && (
            <p role="alert" className="mt-3 text-sm font-bold text-warn">
              {t.error(detail)}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// Autosave status line for composers: reassures that typing is never lost on
// this device, flags a restored draft, and offers a clean restart.
export function DraftBar({ restored, onReset }: { restored: boolean; onReset: () => void }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
      <span>
        {restored && <strong className="font-bold text-accent-strong">{fr.compose.draft.restored} </strong>}
        {fr.compose.draft.autosave}
      </span>
      <button type="button" onClick={onReset} className="font-bold text-coral-strong hover:underline">
        {fr.compose.draft.reset}
      </button>
    </p>
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
