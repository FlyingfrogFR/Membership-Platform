import type { ReactNode } from 'react'

const variants = {
  accent: 'bg-accent-soft text-accent-strong',
  coral: 'bg-coral-soft text-coral-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  neutral: 'border border-line bg-canvas text-ink-soft',
}

export type BadgeVariant = keyof typeof variants

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${variants[variant]}`}>
      {children}
    </span>
  )
}
