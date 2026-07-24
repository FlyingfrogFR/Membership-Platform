import { useEffect, useRef, useState } from 'react'
import { clearDraft, readDraft, writeDraft } from './draft'

export interface DraftState<T> {
  value: T
  // True when the page restored a previously saved draft that actually differs
  // from a blank form — the cue for the "brouillon restauré" notice.
  restored: boolean
  set: (updater: (prev: T) => T) => void
  reset: () => void
}

// Autosaves a composer's whole state under one localStorage key. `revive` must
// rebuild a valid T from an unknown stored value (old drafts included).
export function useDraft<T>(key: string, makeInitial: () => T, revive: (stored: unknown, initial: T) => T): DraftState<T> {
  const [state, setState] = useState<{ value: T; restored: boolean }>(() => {
    const initial = makeInitial()
    const stored = readDraft(key)
    if (stored === undefined) return { value: initial, restored: false }
    const revived = revive(stored, initial)
    return { value: revived, restored: JSON.stringify(revived) !== JSON.stringify(initial) }
  })

  const skipFirstWrite = useRef(true)
  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false
      return
    }
    writeDraft(key, state.value)
  }, [key, state.value])

  return {
    value: state.value,
    restored: state.restored,
    set: (updater) => setState((prev) => ({ ...prev, value: updater(prev.value) })),
    reset: () => {
      clearDraft(key)
      setState({ value: makeInitial(), restored: false })
    },
  }
}
