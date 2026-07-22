import { describe, expect, it } from 'vitest'
import { computeHealthAlerts } from './health'
import type { Need, TicketLogEntry } from './schemas'

const NOW = new Date('2026-07-22T12:00:00Z')

function need(over: Partial<Need> & Pick<Need, 'id' | 'posted'>): Need {
  return {
    type: 'ponctuel',
    title: 'Relecture',
    department: 'Nav Team',
    description: 'x',
    skills: [],
    contact: 'x',
    status: 'open',
    ...over,
  }
}

function ticket(over: Partial<TicketLogEntry> & Pick<TicketLogEntry, 'id' | 'opened'>): TicketLogEntry {
  return { department: 'Membership', ...over }
}

describe('computeHealthAlerts', () => {
  it('flags aging open needs with escalating severity', () => {
    const alerts = computeHealthAlerts(NOW, [], [
      need({ id: 'fresh', posted: new Date('2026-07-10') }),
      need({ id: 'warn', posted: new Date('2026-06-10') }),
      need({ id: 'danger', posted: new Date('2026-05-01') }),
    ], [ticket({ id: 't', opened: NOW })])
    const texts = alerts.map((a) => `${a.severity}:${a.text}`)
    expect(texts.some((t) => t.startsWith('danger:') && t.includes('82 j'))).toBe(true)
    expect(texts.some((t) => t.startsWith('warn:') && t.includes('42 j'))).toBe(true)
    expect(texts.every((t) => !t.includes('fresh'))).toBe(true)
    // Danger sorts first.
    expect(alerts[0].severity).toBe('danger')
  })

  it('flags filled needs missing filled_at', () => {
    const alerts = computeHealthAlerts(NOW, [], [need({ id: 'f', posted: new Date('2026-07-01'), status: 'filled' })], [
      ticket({ id: 't', opened: NOW }),
    ])
    expect(alerts.some((a) => a.text.includes('filled_at'))).toBe(true)
  })

  it('flags unclosed tickets, the empty log and sample data', () => {
    const alerts = computeHealthAlerts(NOW, [], [], [ticket({ id: 'exemple-x', opened: new Date('2026-06-20T10:00:00Z') })])
    expect(alerts.some((a) => a.text.includes('sans clôture depuis 32 j'))).toBe(true)
    expect(alerts.some((a) => a.text.includes('exemple'))).toBe(true)
    const empty = computeHealthAlerts(NOW, [], [], [])
    expect(empty.some((a) => a.text.includes('journal des sollicitations est vide'))).toBe(true)
  })

  it('mentions the missing first edition and the placeholder Discord link', () => {
    const alerts = computeHealthAlerts(NOW, [], [], [])
    expect(alerts.some((a) => a.text.includes('Aucune édition'))).toBe(true)
    expect(alerts.some((a) => a.text.includes('vatsim.fr'))).toBe(true)
  })
})
