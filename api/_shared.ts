// Core of the serverless submission functions (/api/submit-*). The static
// site stays the product; these functions only do what a browser cannot:
// verify the VATSIM France SSO token cryptographically, hold the GitHub bot
// token and the Discord webhook, and open the pull request the HoM reviews.
// Nothing is stored anywhere: the repo remains the single source of truth.
//
// Required env (Vercel): GITHUB_BOT_TOKEN (fine-grained PAT: contents +
// pull-requests write on the repo). Optional: GITHUB_REPO (owner/name),
// OIDC_ISSUER / OIDC_CLIENT_ID (default to the VITE_ ones),
// DISCORD_WEBHOOK_URL to ping a staff channel on each submission, and —
// transitional, while the SSO client is not provisioned — VITE_PASS_SUBMIT=1
// to also accept the referent passphrase (X-Team-Pass header, hash-checked
// against TEAM_PASS_HASH / ADMIN_PASS_HASH, themselves defaulting to the
// VITE_ overrides then to src/config/gateHashes.ts).
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { z } from 'zod'
import { DEPARTMENTS } from '../src/config/departments'
import { DEFAULT_ADMIN_HASH, DEFAULT_TEAM_HASH } from '../src/config/gateHashes'
import { ROLE_ADMIN, ROLE_REFERENT } from '../src/config/roles'
import { sha256Hex } from '../src/lib/hash'
import {
  composeNeedYaml,
  composeSectionYaml,
  editionSectionDraftPath,
  NEEDS_FILE_PATH,
  slugify,
  type EditionDepartmentDraft,
} from '../src/lib/compose'

export const SUBMIT_ROLES = [ROLE_ADMIN, ROLE_REFERENT]

// Read lazily so tests can set process.env before each case.
function env() {
  return {
    issuer: process.env.OIDC_ISSUER || process.env.VITE_OIDC_ISSUER || 'https://auth.vatsim.fr/realms/frenchvacc_prod',
    clientId: process.env.OIDC_CLIENT_ID || process.env.VITE_OIDC_CLIENT_ID || '',
    botToken: process.env.GITHUB_BOT_TOKEN || '',
    repo: process.env.GITHUB_REPO || 'FlyingfrogFR/Membership-Platform',
    webhook: process.env.DISCORD_WEBHOOK_URL || '',
    passSubmit: process.env.VITE_PASS_SUBMIT === '1',
    teamHash: process.env.TEAM_PASS_HASH || process.env.VITE_TEAM_PASS_HASH || DEFAULT_TEAM_HASH,
    adminHash: process.env.ADMIN_PASS_HASH || process.env.VITE_ADMIN_PASS_HASH || DEFAULT_ADMIN_HASH,
  }
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// --- Token verification -----------------------------------------------------

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

async function jwksFor(issuer: string) {
  if (!jwks) {
    const response = await fetch(`${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`discovery failed (HTTP ${response.status})`)
    const doc = (await response.json()) as { jwks_uri?: string }
    if (!doc.jwks_uri) throw new Error('discovery document has no jwks_uri')
    jwks = createRemoteJWKSet(new URL(doc.jwks_uri))
  }
  return jwks
}

export function rolesFromPayload(payload: JWTPayload, clientId: string): Set<string> {
  const roles = new Set<string>()
  const realm = (payload.realm_access as { roles?: unknown } | undefined)?.roles
  if (Array.isArray(realm)) for (const role of realm) if (typeof role === 'string') roles.add(role)
  const resources = payload.resource_access as Record<string, { roles?: unknown } | undefined> | undefined
  const client = resources?.[clientId]?.roles
  if (Array.isArray(client)) for (const role of client) if (typeof role === 'string') roles.add(role)
  return roles
}

export async function verifyBearer(token: string): Promise<JWTPayload> {
  const { issuer, clientId } = env()
  const { payload } = await jwtVerify(token, await jwksFor(issuer), { issuer })
  // azp (authorized party) is the client the token was issued to. Keycloak
  // access tokens carry aud=account, so azp is the reliable client check.
  if (typeof payload.azp === 'string' && payload.azp !== clientId) throw new Error('wrong azp')
  return payload
}

export interface Deps {
  verify: (token: string) => Promise<JWTPayload>
  getFileOnMain: (path: string) => Promise<{ sha: string; text: string } | null>
  openPr: (input: { branch: string; path: string; content: string; sha?: string; title: string; prBody: string }) => Promise<string>
  notify: (message: string) => Promise<void>
}

// Auth guard shared by every submission endpoint. Returns a Response on
// failure so handlers can early-return it. Two accepted paths: a verified
// VATSIM France SSO token, or — transitional passphrase mode — the same
// referent secret the /proposer gate uses, re-checked here server-side. The
// PR review by the HoM remains the actual publication gate either way.
export async function requireSubmitter(request: Request, deps: Deps): Promise<Response | null> {
  const { clientId, botToken, passSubmit, teamHash, adminHash } = env()
  if (!botToken || (!clientId && !passSubmit)) return json(503, { error: 'disabled' })

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token) {
    if (!clientId) return json(503, { error: 'disabled' })
    let payload: JWTPayload
    try {
      payload = await deps.verify(token)
    } catch {
      return json(401, { error: 'auth' })
    }
    const roles = rolesFromPayload(payload, clientId)
    if (!SUBMIT_ROLES.some((role) => roles.has(role))) return json(403, { error: 'role' })
    return null
  }

  const passHeader = request.headers.get('x-team-pass')
  if (passSubmit && passHeader) {
    let pass = passHeader
    try {
      pass = decodeURIComponent(passHeader)
    } catch {
      // Not URI-encoded: compare the raw header value.
    }
    const hash = await sha256Hex(pass)
    if (hash === teamHash || hash === adminHash) return null
  }
  return json(401, { error: 'auth' })
}

// --- GitHub ------------------------------------------------------------------

async function gh(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${env().botToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'membership-platform',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  return response
}

export async function githubGetFileOnMain(path: string): Promise<{ sha: string; text: string } | null> {
  const response = await gh(`/repos/${env().repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=main`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub read failed (HTTP ${response.status})`)
  const body = (await response.json()) as { sha: string; content: string }
  return { sha: body.sha, text: Buffer.from(body.content, 'base64').toString('utf8') }
}

export async function githubOpenPr({
  branch,
  path,
  content,
  sha,
  title,
  prBody,
}: {
  branch: string
  path: string
  content: string
  sha?: string
  title: string
  prBody: string
}): Promise<string> {
  const repo = env().repo
  const main = await gh(`/repos/${repo}/git/ref/heads/main`)
  if (!main.ok) throw new Error(`GitHub ref failed (HTTP ${main.status})`)
  const mainSha = ((await main.json()) as { object: { sha: string } }).object.sha

  const ref = await gh(`/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainSha }),
  })
  if (!ref.ok) throw new Error(`GitHub branch failed (HTTP ${ref.status})`)

  const put = await gh(`/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: title,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!put.ok) throw new Error(`GitHub write failed (HTTP ${put.status})`)

  const pr = await gh(`/repos/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, head: branch, base: 'main', body: prBody }),
  })
  if (!pr.ok) throw new Error(`GitHub PR failed (HTTP ${pr.status})`)
  return ((await pr.json()) as { html_url: string }).html_url
}

export async function discordNotify(message: string): Promise<void> {
  const webhook = env().webhook
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message }),
    })
  } catch {
    // The PR is the deliverable; a missed ping must not fail the submission.
  }
}

export const realDeps: Deps = {
  verify: verifyBearer,
  getFileOnMain: githubGetFileOnMain,
  openPr: githubOpenPr,
  notify: discordNotify,
}

// --- Payloads ----------------------------------------------------------------

const shortLine = z.string().max(300)

export const sectionSubmitSchema = z.strictObject({
  slug: z.string().regex(/^\d{4}-q[1-4]$/),
  section: z.strictObject({
    name: z.enum(DEPARTMENTS),
    notes: z.string().max(4000).default(''),
    done: z.array(shortLine).max(30).default([]),
    in_progress: z.array(shortLine).max(30).default([]),
    next: z.array(shortLine).max(30).default([]),
    help_wanted: z.array(shortLine).max(30).default([]),
    // File names only (no path separators): the server builds the src path.
    images: z
      .array(z.strictObject({ name: z.string().min(1).max(200).regex(/^[^/\\]+$/), caption: z.string().max(300).default('') }))
      .max(20)
      .default([]),
  }),
})

export const needSubmitSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  type: z.enum(['ponctuel', 'poste']),
  title: z.string().trim().min(1).max(200),
  department: z.enum(DEPARTMENTS),
  description: z.string().trim().min(1).max(2000),
  skills: z.array(z.string().max(120)).max(10).default([]),
  time_estimate: z.string().max(120).default(''),
  contact: z.string().trim().min(1).max(200),
  posted: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// --- Handlers ----------------------------------------------------------------

export async function handleSectionSubmit(request: Request, deps: Deps): Promise<Response> {
  const denied = await requireSubmitter(request, deps)
  if (denied) return denied

  const parsed = sectionSubmitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(400, { error: 'payload' })
  const { slug, section } = parsed.data

  const draft: EditionDepartmentDraft = { ...section, images: section.images.map((img) => ({ ...img })) }
  const hasContent =
    draft.notes.trim() !== '' ||
    [...draft.done, ...draft.in_progress, ...draft.next, ...draft.help_wanted].some((line) => line.trim()) ||
    draft.images.length > 0
  if (!hasContent) return json(400, { error: 'empty' })

  const path = editionSectionDraftPath(slug, section.name)
  const existing = await deps.getFileOnMain(path)
  const title = `Rubrique ${section.name} — Point vACC ${slug}`
  const prUrl = await deps.openPr({
    branch: `proposer-${slug}-${slugify(section.name)}-${Date.now().toString(36)}`,
    path,
    content: composeSectionYaml(slug, draft),
    sha: existing?.sha,
    title,
    prBody: 'Rubrique envoyée depuis le formulaire « Proposer du contenu » (envoi direct).',
  })
  await deps.notify(`📬 Rubrique **${section.name}** reçue pour le Point vACC ${slug} — ${prUrl}`)
  return json(200, { prUrl })
}

export async function handleNeedSubmit(request: Request, deps: Deps): Promise<Response> {
  const denied = await requireSubmitter(request, deps)
  if (denied) return denied

  const parsed = needSubmitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(400, { error: 'payload' })
  const need = parsed.data

  const yaml = composeNeedYaml({ ...need, status: 'open' })
  const file = await deps.getFileOnMain(NEEDS_FILE_PATH)
  if (!file) return json(500, { error: 'needs-file-missing' })
  const title = `Besoin : ${need.title} (${need.department})`
  const prUrl = await deps.openPr({
    branch: `proposer-besoin-${need.id}-${Date.now().toString(36)}`,
    path: NEEDS_FILE_PATH,
    content: `${file.text.trimEnd()}\n${yaml}`,
    sha: file.sha,
    title,
    prBody: 'Besoin envoyé depuis le formulaire « Proposer du contenu » (envoi direct).',
  })
  await deps.notify(`📬 Nouveau besoin « ${need.title} » (${need.department}) — ${prUrl}`)
  return json(200, { prUrl })
}
