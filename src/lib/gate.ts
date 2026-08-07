// Light client-side gates for the internal pages: /admin (Head of Membership)
// and /proposer (team referents; the admin passphrase opens it too). Only
// SHA-256 hashes live here — never the passphrases themselves. This is a
// deterrent curtain by deliberate choice, NOT security: the check runs in the
// browser and the pages hold nothing sensitive. Real permissions stay on
// GitHub; real auth arrives with VATSIM Connect (Phase 2).
//
// To change a passphrase: generate the new hash and replace it below (or set
// VITE_ADMIN_PASS_HASH / VITE_TEAM_PASS_HASH in Vercel to override without a
// code change):
//   node -e "console.log(require('crypto').createHash('sha256').update('NouveauMotDePasse').digest('hex'))"
const DEFAULT_ADMIN_HASH = '25036181304a565bea0cd01fe6680d5452e1294afbe20c1271505d90085b4ad3'
const DEFAULT_TEAM_HASH = 'ce5e18af4c489b7343c4ef35987681db76cd570f92903344e5ef84abefca3f87'

const ADMIN_HASH: string = (import.meta.env.VITE_ADMIN_PASS_HASH as string | undefined) || DEFAULT_ADMIN_HASH
const TEAM_HASH: string = (import.meta.env.VITE_TEAM_PASS_HASH as string | undefined) || DEFAULT_TEAM_HASH

// 'member' is the lightest tier: any signed-in VATSIM France account (no role
// required) — or either passphrase. No page uses it yet; it exists so future
// member-facing pages can be gated the day the SSO is active.
export type GateKind = 'admin' | 'team' | 'member'

export const GATE_HASHES: Record<GateKind, string[]> = {
  admin: [ADMIN_HASH],
  team: [TEAM_HASH, ADMIN_HASH],
  member: [TEAM_HASH, ADMIN_HASH],
}

const STORAGE_KEYS: Record<GateKind, string> = {
  admin: 'membership-gate-admin',
  team: 'membership-gate-team',
  member: 'membership-gate-member',
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked(kind: GateKind): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEYS[kind]) === '1'
  } catch {
    return false
  }
}

export function rememberUnlock(kind: GateKind, withAdmin: boolean): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS[kind], '1')
    // The admin passphrase opens the referents' page too.
    if (withAdmin) sessionStorage.setItem(STORAGE_KEYS.team, '1')
    // Any internal unlock implies at least member-level access.
    sessionStorage.setItem(STORAGE_KEYS.member, '1')
  } catch {
    // Private-mode storage failures just mean re-entering the passphrase later.
  }
}
