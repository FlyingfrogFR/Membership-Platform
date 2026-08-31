import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Deps } from './_shared'
import { handleNeedSubmit, handleSectionSubmit, rolesFromPayload } from './_shared'

const ENV_KEYS = [
  'OIDC_CLIENT_ID',
  'GITHUB_BOT_TOKEN',
  'VITE_OIDC_CLIENT_ID',
  'DISCORD_WEBHOOK_URL',
  'VITE_PASS_SUBMIT',
  'TEAM_PASS_HASH',
  'ADMIN_PASS_HASH',
] as const

beforeEach(() => {
  process.env.OIDC_CLIENT_ID = 'membership-site'
  process.env.GITHUB_BOT_TOKEN = 'test-token'
})

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

interface FakeOptions {
  roles?: string[]
  verifyFails?: boolean
  existingFile?: { sha: string; text: string } | null
  // Per-path overrides, checked before existingFile (e.g. image existence).
  files?: Record<string, { sha: string; text: string } | null>
}

function fakeDeps(options: FakeOptions = {}) {
  const calls = { openPr: [] as Array<Parameters<Deps['openPr']>[0]>, notify: [] as string[] }
  const deps: Deps = {
    verify: (token) => {
      if (options.verifyFails) return Promise.reject(new Error('bad token'))
      return Promise.resolve({
        sub: `user-${token}`,
        resource_access: { 'membership-site': { roles: options.roles ?? ['membership-referent'] } },
      })
    },
    getFileOnMain: (path) =>
      Promise.resolve(options.files && path in options.files ? options.files[path] : (options.existingFile ?? null)),
    openPr: (input) => {
      calls.openPr.push(input)
      return Promise.resolve('https://github.com/x/y/pull/1')
    },
    notify: (message) => {
      calls.notify.push(message)
      return Promise.resolve()
    },
  }
  return { deps, calls }
}

function post(payload: unknown, token = 'valid'): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload),
  })
}

const validSection = {
  slug: '2026-q3',
  section: { name: 'Ops & Nav', notes: '', done: ['Cartes LFPG publiées'], in_progress: [], next: [], help_wanted: [], images: [] },
}

describe('auth guard', () => {
  it('returns 503 when the functions are not configured', async () => {
    delete process.env.OIDC_CLIENT_ID
    const { deps } = fakeDeps()
    const response = await handleSectionSubmit(post(validSection), deps)
    expect(response.status).toBe(503)
  })

  it('returns 401 without a bearer token or with a bad one', async () => {
    const { deps } = fakeDeps()
    expect((await handleSectionSubmit(post(validSection, ''), deps)).status).toBe(401)
    const failing = fakeDeps({ verifyFails: true })
    expect((await handleSectionSubmit(post(validSection), failing.deps)).status).toBe(401)
  })

  it('returns 403 without a Membership role', async () => {
    const { deps } = fakeDeps({ roles: ['other-role'] })
    expect((await handleSectionSubmit(post(validSection), deps)).status).toBe(403)
  })

  it('accepts the admin role too', async () => {
    const { deps } = fakeDeps({ roles: ['membership-admin'] })
    expect((await handleSectionSubmit(post(validSection), deps)).status).toBe(200)
  })
})

// Transitional passphrase mode (VITE_PASS_SUBMIT=1): the referent secret from
// the /proposer gate is accepted instead of an SSO token, hash-checked
// server-side. Tests use their own hash so no real passphrase appears here.
describe('auth guard — passphrase mode', () => {
  const TEST_PASS = 'pass-de-test'

  async function hashOf(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  function postWithPass(payload: unknown, pass: string): Request {
    return new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Team-Pass': encodeURIComponent(pass) },
      body: JSON.stringify(payload),
    })
  }

  beforeEach(async () => {
    delete process.env.OIDC_CLIENT_ID
    process.env.VITE_PASS_SUBMIT = '1'
    process.env.TEAM_PASS_HASH = await hashOf(TEST_PASS)
  })

  it('accepts the referent passphrase without any SSO configured', async () => {
    const { deps, calls } = fakeDeps()
    const response = await handleSectionSubmit(postWithPass(validSection, TEST_PASS), deps)
    expect(response.status).toBe(200)
    expect(calls.openPr).toHaveLength(1)
  })

  it('accepts the admin passphrase too', async () => {
    process.env.ADMIN_PASS_HASH = await hashOf('admin-de-test')
    const { deps } = fakeDeps()
    expect((await handleSectionSubmit(postWithPass(validSection, 'admin-de-test'), deps)).status).toBe(200)
  })

  it('rejects a wrong passphrase', async () => {
    const { deps } = fakeDeps()
    expect((await handleSectionSubmit(postWithPass(validSection, 'mauvais'), deps)).status).toBe(401)
  })

  it('ignores the passphrase header when the mode is off', async () => {
    delete process.env.VITE_PASS_SUBMIT
    const { deps } = fakeDeps()
    // No SSO client and no pass mode: the functions are simply disabled.
    expect((await handleSectionSubmit(postWithPass(validSection, TEST_PASS), deps)).status).toBe(503)
    // With the SSO configured but pass mode off, the passphrase is not an auth.
    process.env.OIDC_CLIENT_ID = 'membership-site'
    expect((await handleSectionSubmit(postWithPass(validSection, TEST_PASS), deps)).status).toBe(401)
  })

  it('still verifies bearer tokens normally when both modes are on', async () => {
    process.env.OIDC_CLIENT_ID = 'membership-site'
    const { deps } = fakeDeps({ roles: ['other-role'] })
    expect((await handleSectionSubmit(post(validSection), deps)).status).toBe(403)
  })
})

describe('handleSectionSubmit', () => {
  it('opens a PR with the composed section at the draft path', async () => {
    const { deps, calls } = fakeDeps({ existingFile: { sha: 'abc123', text: 'name: Ops & Nav\n' } })
    const response = await handleSectionSubmit(post(validSection), deps)
    expect(response.status).toBe(200)
    expect(((await response.json()) as { prUrl: string }).prUrl).toContain('/pull/1')
    const pr = calls.openPr[0]
    expect(pr.path).toBe('content/point-vacc/drafts/2026-q3/ops-nav.yaml')
    expect(pr.branch).toMatch(/^proposer-2026-q3-ops-nav-/)
    expect(pr.content).toContain('name: Ops & Nav')
    expect(pr.content).toContain('Cartes LFPG publiées')
    // Updating an already-sent rubrique forwards the existing blob sha.
    expect(pr.sha).toBe('abc123')
    expect(calls.notify[0]).toContain('Ops & Nav')
    expect(calls.notify[0]).toContain('/pull/1')
  })

  it('refuses a rubrique whose image is not on main, naming the file', async () => {
    const withImage = {
      slug: '2026-q3',
      section: { ...validSection.section, images: [{ name: 'CCA NICE.png', caption: '' }] },
    }
    const { deps } = fakeDeps()
    const response = await handleSectionSubmit(post(withImage), deps)
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('CCA NICE.png')
    expect(body.error).toContain('public/images/point-vacc/2026-q3')

    // Same rubrique goes through once the image exists at the exact path.
    const ok = fakeDeps({ files: { 'public/images/point-vacc/2026-q3/CCA NICE.png': { sha: 'img', text: '' } } })
    expect((await handleSectionSubmit(post(withImage), ok.deps)).status).toBe(200)
  })

  it('rejects malformed, empty and path-escaping payloads', async () => {
    const { deps } = fakeDeps()
    expect((await handleSectionSubmit(post({ slug: 'nope', section: validSection.section }), deps)).status).toBe(400)
    const empty = { slug: '2026-q3', section: { ...validSection.section, done: [] } }
    expect((await handleSectionSubmit(post(empty), deps)).status).toBe(400)
    const traversal = {
      slug: '2026-q3',
      section: { ...validSection.section, images: [{ name: '../../evil.png', caption: '' }] },
    }
    expect((await handleSectionSubmit(post(traversal), deps)).status).toBe(400)
  })
})

const validNeed = {
  id: 'nav-relecture-lfpg',
  type: 'ponctuel',
  title: 'Relecture LFPG',
  department: 'Ops & Nav',
  description: 'Relire la doc.',
  skills: [],
  time_estimate: '2–3 h',
  contact: 'Ticket Membership',
  posted: '2026-08-07',
}

describe('handleNeedSubmit', () => {
  it('appends the need to needs.yaml and opens a PR', async () => {
    const existing = { sha: 'needsha', text: '# Tableau Contribuer\n' }
    const { deps, calls } = fakeDeps({ existingFile: existing })
    const response = await handleNeedSubmit(post(validNeed), deps)
    expect(response.status).toBe(200)
    const pr = calls.openPr[0]
    expect(pr.path).toBe('content/contribuer/needs.yaml')
    expect(pr.sha).toBe('needsha')
    expect(pr.content.startsWith('# Tableau Contribuer\n')).toBe(true)
    expect(pr.content).toContain('id: nav-relecture-lfpg')
    expect(pr.content).toContain('status: open')
  })

  it('fails cleanly when needs.yaml is missing and on bad payloads', async () => {
    const { deps } = fakeDeps({ existingFile: null })
    expect((await handleNeedSubmit(post(validNeed), deps)).status).toBe(500)
    const withFile = fakeDeps({ existingFile: { sha: 's', text: '' } })
    expect((await handleNeedSubmit(post({ ...validNeed, id: 'Bad Id!' }), withFile.deps)).status).toBe(400)
  })
})

describe('rolesFromPayload', () => {
  it('collects realm and client roles', () => {
    const roles = rolesFromPayload(
      { realm_access: { roles: ['a'] }, resource_access: { c: { roles: ['b'] } } },
      'c',
    )
    expect([...roles].sort()).toEqual(['a', 'b'])
  })
})
