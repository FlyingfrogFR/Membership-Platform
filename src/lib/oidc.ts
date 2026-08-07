// Minimal OpenID Connect (Authorization Code + PKCE) for a public client on a
// fully static site. PKCE replaces the client secret, so nothing confidential
// ships in the bundle. Tokens are read once, at unlock time, to learn the
// user's Membership roles, then discarded — the only thing kept is the same
// sessionStorage unlock the passphrase curtain uses. This gates UI visibility
// only: GitHub remains the authority on every write.

export interface OidcConfig {
  issuer: string
  clientId: string
  scope: string
  redirectUri: string
}

export interface LoginResult {
  roles: string[]
  returnTo: string
}

interface Discovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
}

const VERIFIER_KEY = 'membership-oidc-verifier'
const STATE_KEY = 'membership-oidc-state'
const NONCE_KEY = 'membership-oidc-nonce'
const RETURN_KEY = 'membership-oidc-return'

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export async function pkceChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? ''
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
  try {
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

// Keycloak puts realm roles under realm_access.roles and client roles under
// resource_access.<clientId>.roles — collect both, whichever token has them.
export function rolesFromClaims(claims: Record<string, unknown>, clientId: string): string[] {
  const roles: string[] = []
  const realm = (claims.realm_access as { roles?: unknown } | undefined)?.roles
  if (Array.isArray(realm)) roles.push(...realm.filter((role): role is string => typeof role === 'string'))
  const resources = claims.resource_access as Record<string, { roles?: unknown } | undefined> | undefined
  const client = resources?.[clientId]?.roles
  if (Array.isArray(client)) roles.push(...client.filter((role): role is string => typeof role === 'string'))
  return [...new Set(roles)]
}

const discoveryCache = new Map<string, Promise<Discovery>>()

function fetchDiscovery(issuer: string): Promise<Discovery> {
  const cached = discoveryCache.get(issuer)
  if (cached) return cached
  const promise = (async () => {
    // Timeout so a broker outage surfaces the password fallback instead of a
    // button that hangs forever.
    const response = await fetch(`${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`discovery failed (HTTP ${response.status})`)
    const doc = (await response.json()) as Partial<Discovery>
    if (!doc.issuer || !doc.authorization_endpoint || !doc.token_endpoint) {
      throw new Error('discovery document is missing endpoints')
    }
    return doc as Discovery
  })()
  // A failed fetch must not poison the cache for the next attempt.
  promise.catch(() => discoveryCache.delete(issuer))
  discoveryCache.set(issuer, promise)
  return promise
}

// Prepares PKCE material and returns the authorization URL to navigate to.
export async function beginLogin(config: OidcConfig, returnTo: string): Promise<string> {
  const discovery = await fetchDiscovery(config.issuer)
  const verifier = randomToken()
  const state = randomToken()
  const nonce = randomToken()
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(NONCE_KEY, nonce)
  sessionStorage.setItem(RETURN_KEY, returnTo)

  const url = new URL(discovery.authorization_endpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  url.searchParams.set('code_challenge', await pkceChallengeS256(verifier))
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

function takeStored(key: string): string {
  const value = sessionStorage.getItem(key) ?? ''
  sessionStorage.removeItem(key)
  return value
}

// Handles the redirect back from the broker: verifies state, redeems the code
// (with the PKCE verifier), sanity-checks the ID token and extracts roles.
// No signature verification: the tokens come straight from the issuer's token
// endpoint over TLS, and they only unlock UI — not data, not write access.
export async function completeLogin(config: OidcConfig, params: URLSearchParams): Promise<LoginResult> {
  const verifier = takeStored(VERIFIER_KEY)
  const expectedState = takeStored(STATE_KEY)
  const expectedNonce = takeStored(NONCE_KEY)
  const returnTo = takeStored(RETURN_KEY) || '/'

  const error = params.get('error')
  if (error) throw new Error(params.get('error_description') || error)
  const code = params.get('code')
  if (!code) throw new Error('missing code')
  if (!verifier || !expectedState || params.get('state') !== expectedState) throw new Error('state mismatch')

  const discovery = await fetchDiscovery(config.issuer)
  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      code_verifier: verifier,
    }),
  })
  if (!response.ok) throw new Error(`token exchange failed (HTTP ${response.status})`)
  const tokens = (await response.json()) as { access_token?: string; id_token?: string }
  if (!tokens.id_token) throw new Error('missing id_token')

  const idClaims = decodeJwtPayload(tokens.id_token)
  if (idClaims.iss !== discovery.issuer) throw new Error('issuer mismatch')
  const audience = idClaims.aud
  const audOk = Array.isArray(audience) ? audience.includes(config.clientId) : audience === config.clientId
  if (!audOk) throw new Error('audience mismatch')
  if (expectedNonce && idClaims.nonce !== expectedNonce) throw new Error('nonce mismatch')
  if (typeof idClaims.exp === 'number' && idClaims.exp * 1000 < Date.now() - 60_000) throw new Error('token expired')

  const accessClaims = tokens.access_token ? decodeJwtPayload(tokens.access_token) : {}
  const roles = [...new Set([...rolesFromClaims(accessClaims, config.clientId), ...rolesFromClaims(idClaims, config.clientId)])]
  return { roles, returnTo }
}
