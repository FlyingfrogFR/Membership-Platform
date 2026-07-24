import { describe, expect, it } from 'vitest'
import { asBool, asEnum, asInt, asRecord, asString, asStringList, clearDraft, readDraft, writeDraft } from './draft'

describe('draft storage', () => {
  it('degrades to no-ops outside the browser', () => {
    // Tests run in node: no window, so nothing persists and nothing throws.
    expect(readDraft('x')).toBeUndefined()
    expect(() => writeDraft('x', { a: 1 })).not.toThrow()
    expect(() => clearDraft('x')).not.toThrow()
  })
})

describe('draft revivers', () => {
  it('keeps well-typed values and falls back otherwise', () => {
    expect(asString('a', 'd')).toBe('a')
    expect(asString(42, 'd')).toBe('d')
    expect(asInt(3, 1)).toBe(3)
    expect(asInt(3.5, 1)).toBe(1)
    expect(asInt('3', 1)).toBe(1)
    expect(asBool(true)).toBe(true)
    expect(asBool('true')).toBe(false)
  })

  it('filters lists down to their string items', () => {
    expect(asStringList(['a', 1, 'b', null])).toEqual(['a', 'b'])
    expect(asStringList('a')).toEqual([])
  })

  it('accepts only known enum values', () => {
    expect(asEnum('poste', ['ponctuel', 'poste'] as const, 'ponctuel')).toBe('poste')
    expect(asEnum('autre', ['ponctuel', 'poste'] as const, 'ponctuel')).toBe('ponctuel')
    expect(asEnum(7, ['ponctuel', 'poste'] as const, 'ponctuel')).toBe('ponctuel')
  })

  it('narrows records and rejects arrays and primitives', () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 })
    expect(asRecord([1])).toEqual({})
    expect(asRecord('x')).toEqual({})
    expect(asRecord(null)).toEqual({})
  })
})
