import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUTH, oidcConfig } from '../config/auth'
import { fr } from '../i18n/fr'
import { rememberUnlock } from '../lib/gate'
import { completeLogin, storeSsoToken, type LoginResult } from '../lib/oidc'
import { usePageTitle } from '../lib/usePageTitle'

// The authorization code is single-use and the state is consumed on first
// read: share one exchange across StrictMode's double-mounted effect.
let exchange: Promise<LoginResult> | null = null

type Status = 'working' | 'norole' | 'error'

export function AuthCallback() {
  usePageTitle(fr.auth.title)
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('working')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    exchange ??= completeLogin(oidcConfig(), new URLSearchParams(window.location.search))
    exchange
      .then((result) => {
        if (result.accessToken) storeSsoToken(result.accessToken, result.expiresInSeconds)
        // Any successful VATSIM France login grants member-level access.
        rememberUnlock('member', false)
        if (result.roles.includes(AUTH.roles.admin)) {
          rememberUnlock('admin', true)
        } else if (result.roles.includes(AUTH.roles.referent)) {
          rememberUnlock('team', false)
        } else {
          setStatus('norole')
          return
        }
        const to = result.returnTo.startsWith('/') && !result.returnTo.startsWith('//') ? result.returnTo : '/'
        navigate(to, { replace: true })
      })
      .catch((error: unknown) => {
        exchange = null
        setStatus('error')
        setDetail(error instanceof Error ? error.message : String(error))
      })
  }, [navigate])

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">{fr.auth.title}</h1>
      {status === 'working' && <p className="mt-4 leading-relaxed text-ink-soft">{fr.auth.working}</p>}
      {status === 'norole' && (
        <div className="card mt-6 p-6">
          <p className="leading-relaxed text-ink-soft">{fr.auth.noRole}</p>
          <Link to="/" className="btn btn-secondary mt-4">
            {fr.auth.back}
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="card mt-6 p-6">
          <p role="alert" className="leading-relaxed text-ink-soft">
            {fr.auth.error(detail)}
          </p>
          <Link to="/" className="btn btn-secondary mt-4">
            {fr.auth.back}
          </Link>
        </div>
      )}
    </div>
  )
}
