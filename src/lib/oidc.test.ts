import { describe, expect, it } from 'vitest'
import { decodeJwtPayload, pkceChallengeS256, rolesFromClaims } from './oidc'

function fakeJwt(payload: unknown): string {
  const encode = (value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
  return `${encode({ alg: 'RS256' })}.${encode(payload)}.signature`
}

describe('pkceChallengeS256', () => {
  it('matches the RFC 7636 test vector', async () => {
    const challenge = await pkceChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })
})

describe('decodeJwtPayload', () => {
  it('decodes a payload, including accented UTF-8', () => {
    const claims = decodeJwtPayload(fakeJwt({ sub: '123', name: 'Père Noël', exp: 1_234_567 }))
    expect(claims.name).toBe('Père Noël')
    expect(claims.exp).toBe(1_234_567)
  })

  it('returns an empty object for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toEqual({})
    expect(decodeJwtPayload('a.%%%.c')).toEqual({})
    expect(decodeJwtPayload(fakeJwt(['array']))).toEqual({})
  })
})

describe('rolesFromClaims', () => {
  it('merges realm and client roles without duplicates', () => {
    const claims = {
      realm_access: { roles: ['membership-referent', 'offline_access'] },
      resource_access: { 'membership-site': { roles: ['membership-admin', 'membership-referent'] } },
    }
    expect(rolesFromClaims(claims, 'membership-site').sort()).toEqual([
      'membership-admin',
      'membership-referent',
      'offline_access',
    ])
  })

  it('ignores missing structures, other clients and non-string entries', () => {
    expect(rolesFromClaims({}, 'membership-site')).toEqual([])
    expect(rolesFromClaims({ realm_access: { roles: 'oops' } }, 'membership-site')).toEqual([])
    expect(rolesFromClaims({ realm_access: { roles: [42, 'ok'] } }, 'membership-site')).toEqual(['ok'])
    expect(rolesFromClaims({ resource_access: { autre: { roles: ['x'] } } }, 'membership-site')).toEqual([])
  })
})
