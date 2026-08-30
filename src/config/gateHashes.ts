// SHA-256 hashes of the internal passphrases — never the passphrases
// themselves. Shared by the browser gate (src/lib/gate.ts) and the serverless
// direct-send auth (api/_shared.ts), so both sides accept the same secrets.
// Overridable without a code change: VITE_ADMIN_PASS_HASH / VITE_TEAM_PASS_HASH
// (browser), ADMIN_PASS_HASH / TEAM_PASS_HASH (functions).
export const DEFAULT_ADMIN_HASH = '25036181304a565bea0cd01fe6680d5452e1294afbe20c1271505d90085b4ad3'
export const DEFAULT_TEAM_HASH = 'ce5e18af4c489b7343c4ef35987681db76cd570f92903344e5ef84abefca3f87'
