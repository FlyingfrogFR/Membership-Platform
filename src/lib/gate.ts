// Light client-side gates for the internal pages: /admin (Head of Membership)
// and /proposer (team referents; the admin passphrase opens it too). Only
// SHA-256 hashes live here — never the passphrases themselves. This is a
// deterrent curtain by deliberate choice, NOT security: the check runs in the
// browser and the pages hold nothing sensitive. Real permissions stay on
// GitHub; real auth arrives with the VATSIM France SSO.
//
// To change a passphrase: generate the new hash and replace it in
// src/config/gateHashes.ts (or set VITE_ADMIN_PASS_HASH / VITE_TEAM_PASS_HASH
// in Vercel to override without a code change):
//   node -e "console.log(require('crypto').createHash('sha256').update('NouveauMotDePasse').digest('hex'))"
import { DEFAULT_ADMIN_HASH, DEFAULT_TEAM_HASH } from '../config/gateHashes'
export { sha256Hex } from './hash'

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

// Transitional direct-send support (VITE_PASS_SUBMIT=1, no SSO yet): the
// passphrase the user just typed is kept for this tab only, so the /api
// functions can re-check it server-side on each one-click submission. Dropped
// with the tab; never written anywhere else.
const PASS_KEY = 'membership-gate-pass'

export function rememberGatePass(pass: string): void {
  try {
    sessionStorage.setItem(PASS_KEY, pass)
  } catch {
    // Private mode: direct send will ask to re-enter the passphrase.
  }
}

export function getGatePass(): string | null {
  try {
    return sessionStorage.getItem(PASS_KEY)
  } catch {
    return null
  }
}

// Drops every unlock (and the kept passphrase) so the gate shows again after a
// reload — the recovery path when the direct-send passphrase is gone or stale.
export function relock(): void {
  try {
    for (const key of Object.values(STORAGE_KEYS)) sessionStorage.removeItem(key)
    sessionStorage.removeItem(PASS_KEY)
  } catch {
    // Nothing to drop if storage is unavailable.
  }
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
