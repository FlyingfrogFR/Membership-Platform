import { useState, type FormEvent, type ReactNode } from 'react'
import { oidcConfig, ssoEnabled } from '../config/auth'
import { fr } from '../i18n/fr'
import { GATE_HASHES, isUnlocked, rememberUnlock, sha256Hex, type GateKind } from '../lib/gate'
import { beginLogin } from '../lib/oidc'
import { Field, inputClass } from './ComposerBits'

export function Gate({ kind, children }: { kind: GateKind; children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked(kind))
  if (unlocked) return <>{children}</>
  return (
    <GateForm
      kind={kind}
      onUnlock={() => {
        setUnlocked(true)
        // The submitted button disappears with the form; land focus on the
        // now-revealed content instead of <body>.
        requestAnimationFrame(() => document.getElementById('main')?.focus())
      }}
    />
  )
}

function GateForm({ kind, onUnlock }: { kind: GateKind; onUnlock: () => void }) {
  const t = fr.gate
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [ssoError, setSsoError] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const hash = await sha256Hex(password)
    const accepted = GATE_HASHES[kind]
    if (accepted.includes(hash)) {
      rememberUnlock(kind, hash === GATE_HASHES.admin[0])
      onUnlock()
    } else {
      setError(true)
    }
  }

  async function onSso() {
    try {
      const url = await beginLogin(oidcConfig(), window.location.pathname)
      window.location.assign(url)
    } catch {
      setSsoError(true)
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">
        {kind === 'admin' ? t.adminText : kind === 'team' ? t.teamText : t.memberText}
      </p>
      {ssoEnabled() && (
        <div className="mt-6">
          <button type="button" onClick={() => void onSso()} className="btn btn-primary w-full">
            {t.sso}
          </button>
          {ssoError && (
            <p role="alert" className="mt-3 text-sm font-bold text-warn">
              {t.ssoError}
            </p>
          )}
          <p aria-hidden="true" className="mt-4 text-center text-xs font-bold text-ink-soft/70 uppercase">
            {t.or}
          </p>
        </div>
      )}
      <form onSubmit={(event) => void onSubmit(event)} className="card mt-6 p-6">
        {/* Hidden username so password managers can key the entry correctly. */}
        <input type="text" name="username" autoComplete="username" defaultValue={kind} hidden tabIndex={-1} aria-hidden="true" />
        <Field label={t.label} htmlFor="gate-password">
          <input
            id="gate-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            aria-invalid={error || undefined}
            aria-describedby={error ? 'gate-error' : undefined}
            onChange={(event) => {
              setPassword(event.target.value)
              setError(false)
            }}
          />
        </Field>
        {error && (
          <p id="gate-error" role="alert" className="mt-3 text-sm font-bold text-warn">
            {t.error}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-4">
          {t.submit}
        </button>
      </form>
    </div>
  )
}
