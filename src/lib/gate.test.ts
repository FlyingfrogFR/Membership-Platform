import { describe, expect, it } from 'vitest'
import { GATE_HASHES, sha256Hex } from './gate'

describe('gate', () => {
  it('sha256Hex produces the standard SHA-256 hex digest', async () => {
    expect(await sha256Hex('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
  })

  it('holds well-formed hashes and lets the admin passphrase open the team gate', () => {
    for (const hashes of Object.values(GATE_HASHES)) {
      for (const hash of hashes) expect(hash).toMatch(/^[0-9a-f]{64}$/)
    }
    expect(GATE_HASHES.team).toContain(GATE_HASHES.admin[0])
    expect(GATE_HASHES.admin).not.toContain(GATE_HASHES.team[0])
  })
})
