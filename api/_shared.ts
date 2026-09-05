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
// Explicit .js extensions on relative imports: Vercel emits this graph as
// per-file ESM and Node ESM cannot resolve extensionless specifiers.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { z } from 'zod'
import { DEPARTMENTS } from '../src/config/departments.js'
import { DEFAULT_ADMIN_HASH, DEFAULT_TEAM_HASH } from '../src/config/gateHashes.js'
import { ROLE_ADMIN, ROLE_REFERENT } from '../src/config/roles.js'
import { sha256Hex } from '../src/lib/hash.js'
import {
  composeNeedYaml,
  composeSectionYaml,
  editionSectionDraftPath,
  NEEDS_FILE_PATH,
  slugify,
  type EditionDepartmentDraft,
} from '../src/lib/compose.js'

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
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
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
  getFile: (path: string, ref: string) => Promise<{ sha: string; text: string } | null>
  getBranchSha: (branch: string) => Promise<string | null>
  createBranch: (branch: string, fromSha: string) => Promise<void>
  resetBranch: (branch: string, sha: string) => Promise<void>
  putFile: (input: { branch: string; path: string; content: string; sha?: string; message: string }) => Promise<void>
  findOpenPr: (head: string) => Promise<string | null>
  createPr: (input: { head: string; title: string; prBody: string }) => Promise<string>
  notify: (message: string) => Promise<void>
  translate: (input: NeedTranslationInput) => Promise<NeedTranslation | null>
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

function contentsUrl(path: string): string {
  return `/repos/${env().repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
}

export async function githubGetFile(path: string, ref: string): Promise<{ sha: string; text: string } | null> {
  const response = await gh(`${contentsUrl(path)}?ref=${encodeURIComponent(ref)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub read failed (HTTP ${response.status})`)
  const body = (await response.json()) as { sha: string; content: string }
  return { sha: body.sha, text: Buffer.from(body.content, 'base64').toString('utf8') }
}

export async function githubGetBranchSha(branch: string): Promise<string | null> {
  const response = await gh(`/repos/${env().repo}/git/ref/heads/${encodeURIComponent(branch)}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub ref failed (HTTP ${response.status})`)
  return ((await response.json()) as { object: { sha: string } }).object.sha
}

export async function githubCreateBranch(branch: string, fromSha: string): Promise<void> {
  const response = await gh(`/repos/${env().repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
  })
  // 422 = the branch appeared concurrently; the caller re-reads it anyway.
  if (!response.ok && response.status !== 422) throw new Error(`GitHub branch failed (HTTP ${response.status})`)
}

export async function githubResetBranch(branch: string, sha: string): Promise<void> {
  const response = await gh(`/repos/${env().repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha, force: true }),
  })
  if (!response.ok) throw new Error(`GitHub reset failed (HTTP ${response.status})`)
}

export async function githubPutFile({
  branch,
  path,
  content,
  sha,
  message,
}: {
  branch: string
  path: string
  content: string
  sha?: string
  message: string
}): Promise<void> {
  const response = await gh(contentsUrl(path), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!response.ok) throw new Error(`GitHub write failed (HTTP ${response.status})`)
}

export async function githubFindOpenPr(head: string): Promise<string | null> {
  const owner = env().repo.split('/')[0]
  const response = await gh(`/repos/${env().repo}/pulls?state=open&head=${encodeURIComponent(`${owner}:${head}`)}`)
  if (!response.ok) throw new Error(`GitHub PR lookup failed (HTTP ${response.status})`)
  const prs = (await response.json()) as Array<{ html_url: string }>
  return prs[0]?.html_url ?? null
}

export async function githubCreatePr({ head, title, prBody }: { head: string; title: string; prBody: string }): Promise<string> {
  const response = await gh(`/repos/${env().repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, head, base: 'main', body: prBody }),
  })
  if (!response.ok) throw new Error(`GitHub PR failed (HTTP ${response.status})`)
  return ((await response.json()) as { html_url: string }).html_url
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

// --- AI translation ----------------------------------------------------------

export interface NeedTranslationInput {
  title: string
  description: string
  skills: string[]
}

export interface NeedTranslation {
  title_en: string
  description_en: string
  skills_en: string[]
}

// Fills the English version of a need when the referent left it blank and
// ANTHROPIC_API_KEY is set on Vercel. The translation lands in the same pull
// request as the need itself, so the HoM reviews it before anything ships.
// Any failure (no key, timeout, API error) returns null and never blocks the
// submission — the English Discord export then falls back to the French text.
export async function aiTranslateNeed(input: NeedTranslationInput): Promise<NeedTranslation | null> {
  const { anthropicKey, anthropicModel } = env()
  if (!anthropicKey) return null
  try {
    // Dynamic import: the SDK only loads on the rare request that translates.
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
    const shape = z.object({
      title_en: z.string(),
      description_en: z.string(),
      skills_en: z.array(z.string()),
    })
    // Tight timeout, no retry: the submission must finish well within the
    // function's time budget even when the translation gives up.
    const client = new Anthropic({ apiKey: anthropicKey, timeout: 25_000, maxRetries: 0 })
    const response = await client.messages.parse({
      model: anthropicModel,
      max_tokens: 4000,
      output_config: { effort: 'low', format: zodOutputFormat(shape) },
      system:
        'Translate volunteer-role announcements of VATSIM France (a flight simulation network community) from French to English. ' +
        'Keep aviation terms, ICAO codes, proper nouns and any markdown formatting as they are. Match the concise, friendly tone of the original. ' +
        'Return skills_en with exactly one translation per input skill, in the same order (empty list if there are none).',
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    })
    const out = response.parsed_output
    if (!out) return null
    return {
      title_en: out.title_en.trim(),
      description_en: out.description_en.trim(),
      skills_en: out.skills_en.map((skill) => skill.trim()).filter(Boolean),
    }
  } catch {
    return null
  }
}

export const realDeps: Deps = {
  verify: verifyBearer,
  getFile: githubGetFile,
  getBranchSha: githubGetBranchSha,
  createBranch: githubCreateBranch,
  resetBranch: githubResetBranch,
  putFile: githubPutFile,
  findOpenPr: githubFindOpenPr,
  createPr: githubCreatePr,
  notify: discordNotify,
  translate: aiTranslateNeed,
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
  title_en: z.string().trim().max(200).default(''),
  description_en: z.string().trim().max(2000).default(''),
  skills_en: z.array(z.string().max(120)).max(10).default([]),
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

  // A rubrique referencing an image that is not on main would merge into a
  // build-time validation failure that blocks EVERY deploy. Refuse it here
  // instead, with the exact file name (mind spaces vs underscores).
  for (const image of draft.images) {
    const imagePath = `public/images/point-vacc/${slug}/${image.name}`
    if (!(await deps.getFile(imagePath, 'main'))) {
      return json(400, {
        error: `image introuvable sur GitHub : « ${image.name} » — téléversez-la d'abord dans ${imagePath.slice(0, imagePath.lastIndexOf('/'))}/ (nom identique, espaces comprises)`,
      })
    }
  }

  const path = editionSectionDraftPath(slug, section.name)
  const existing = await deps.getFile(path, 'main')
  const title = `Rubrique ${section.name} — Point vACC ${slug}`
  const mainSha = await deps.getBranchSha('main')
  if (!mainSha) return json(500, { error: 'github' })
  const branch = `proposer-${slug}-${slugify(section.name)}-${Date.now().toString(36)}`
  await deps.createBranch(branch, mainSha)
  await deps.putFile({ branch, path, content: composeSectionYaml(slug, draft), sha: existing?.sha, message: title })
  const prUrl = await deps.createPr({
    head: branch,
    title,
    prBody: 'Rubrique envoyée depuis le formulaire « Proposer du contenu » (envoi direct).',
  })
  await deps.notify(`📬 Rubrique **${section.name}** reçue pour le Point vACC ${slug} — ${prUrl}`)
  return json(200, { prUrl })
}

// All needs land on ONE rolling branch, appended commit by commit: concurrent
// proposals no longer produce per-need PRs that conflict with each other the
// moment the first one merges. The HoM reviews (and can edit) the single open
// PR; merging publishes the batch, and the next submission starts a fresh
// cycle from main. While that PR is open, edit needs.yaml through it rather
// than directly on main.
export const NEEDS_BRANCH = 'proposer-besoins'

export async function handleNeedSubmit(request: Request, deps: Deps): Promise<Response> {
  const denied = await requireSubmitter(request, deps)
  if (denied) return denied

  const parsed = needSubmitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json(400, { error: 'payload' })
  let need = parsed.data

  // English version left blank: fill it by AI translation when configured.
  // The referent's own words always win over the machine's.
  if (!need.title_en || !need.description_en || (need.skills.length > 0 && need.skills_en.length === 0)) {
    const translated = await deps.translate({ title: need.title, description: need.description, skills: need.skills })
    if (translated) {
      need = {
        ...need,
        title_en: need.title_en || translated.title_en,
        description_en: need.description_en || translated.description_en,
        skills_en: need.skills_en.length > 0 ? need.skills_en : translated.skills_en,
      }
    }
  }

  const yaml = composeNeedYaml({ ...need, status: 'open' })
  const title = `Besoin : ${need.title} (${need.department})`

  const mainSha = await deps.getBranchSha('main')
  if (!mainSha) return json(500, { error: 'github' })
  const openPrUrl = await deps.findOpenPr(NEEDS_BRANCH)
  if ((await deps.getBranchSha(NEEDS_BRANCH)) === null) {
    await deps.createBranch(NEEDS_BRANCH, mainSha)
  } else if (!openPrUrl) {
    // Leftover branch from a merged/closed cycle: restart it from main so the
    // new proposal cannot resurrect (or revert) anything.
    await deps.resetBranch(NEEDS_BRANCH, mainSha)
  }

  for (let attempt = 0; ; attempt++) {
    const file = await deps.getFile(NEEDS_FILE_PATH, NEEDS_BRANCH)
    if (!file) return json(500, { error: 'needs-file-missing' })
    if (file.text.includes(`id: ${need.id}\n`)) {
      return json(400, {
        error: `l'identifiant « ${need.id} » existe déjà (tableau ou proposition en cours) — changez le titre ou l'identifiant`,
      })
    }
    try {
      await deps.putFile({
        branch: NEEDS_BRANCH,
        path: NEEDS_FILE_PATH,
        content: `${file.text.trimEnd()}\n${yaml}`,
        sha: file.sha,
        message: title,
      })
      break
    } catch (error) {
      // Concurrent append moved the blob between read and write: one clean
      // retry against the fresh branch state.
      if (attempt >= 1) throw error
    }
  }

  const prUrl =
    openPrUrl ??
    (await deps.createPr({
      head: NEEDS_BRANCH,
      title: 'Besoins proposés — à relire',
      prBody:
        'Les besoins envoyés depuis « Proposer du contenu » s’accumulent ici, un commit par besoin. Fusionner publie tout le lot — retouchez le fichier dans cette PR si nécessaire. Supprimer la branche remet le fil à zéro.',
    }))
  await deps.notify(`📬 Nouveau besoin « ${need.title} » (${need.department}) — ${prUrl}`)
  return json(200, { prUrl })
}
