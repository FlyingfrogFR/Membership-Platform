import { describe, expect, it } from 'vitest'
import { sha256Hex } from './adminGate'

describe('sha256Hex', () => {
  it('produces the standard SHA-256 hex digest', async () => {
    expect(await sha256Hex('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
  })

  it('differs for different inputs', async () => {
    expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'))
  })
})
