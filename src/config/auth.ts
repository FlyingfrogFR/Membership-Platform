// VATSIM France identity broker (auth.vatsim.fr — Keycloak, OpenID Connect).
// The site is fully static, so it authenticates as an OIDC *public* client
// with PKCE: no client secret exists anywhere. The SSO button only appears
// once a client_id is configured (Vercel env var) — until then the passphrase
// curtain remains the only door, and it stays available as a fallback after.
//
// To activate: ask the Digital Team for a public client (PKCE S256) with
// redirect URI <origin>/auth/callback, then set VITE_OIDC_CLIENT_ID in Vercel.
// The two roles below are read from the tokens (realm or client roles).
import { ROLE_ADMIN, ROLE_REFERENT } from './roles'

export const AUTH = {
  issuer: (import.meta.env.VITE_OIDC_ISSUER as string | undefined) || 'https://auth.vatsim.fr/realms/frenchvacc_prod',
  clientId: (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) || '',
  scope: 'openid profile',
  redirectPath: '/auth/callback',
  roles: { admin: ROLE_ADMIN, referent: ROLE_REFERENT },
} as const

export function ssoEnabled(): boolean {
  return AUTH.clientId !== ''
}

// One-click submission through the serverless functions (/api/submit-*).
// Needs the SSO (Bearer token) plus the server-side env vars documented in
// the README; VITE_DIRECT_SUBMIT=1 turns the buttons on once both exist.
export function directSubmitEnabled(): boolean {
  return ssoEnabled() && (import.meta.env.VITE_DIRECT_SUBMIT as string | undefined) === '1'
}

export function oidcConfig() {
  return {
    issuer: AUTH.issuer,
    clientId: AUTH.clientId,
    scope: AUTH.scope,
    redirectUri: `${window.location.origin}${AUTH.redirectPath}`,
  }
}
