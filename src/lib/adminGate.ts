// Light client-side gate for the /admin page. The SHA-256 hash of the
// passphrase is injected at build time from the VITE_ADMIN_PASS_HASH
// environment variable (set it in Vercel, see README); when unset the gate is
// off. This is a deterrent curtain, NOT real security: the check runs in the
// browser and the page's content ships in the public bundle either way. Real
// permissions live on GitHub; real auth arrives with VATSIM Connect (Phase 2).
export const ADMIN_PASS_HASH: string | undefined = import.meta.env.VITE_ADMIN_PASS_HASH || undefined

export const ADMIN_UNLOCK_KEY = 'membership-admin-unlocked'

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked(): boolean {
  if (!ADMIN_PASS_HASH) return true
  try {
    return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberUnlock(): void {
  try {
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, '1')
  } catch {
    // Private-mode storage failures just mean re-entering the passphrase later.
  }
}
