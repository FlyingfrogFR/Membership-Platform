import type { ReactNode } from 'react'

const variants = {
  accent: 'bg-accent-soft text-accent-strong',
  blue: 'bg-blue-soft text-blue-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  neutral: 'border border-line-strong bg-canvas text-ink-soft',
}

export type BadgeVariant = keyof typeof variants

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-[0.68rem] font-semibold tracking-[0.06em] uppercase ${variants[variant]}`}
    >
      {children}
    </span>
  )
}
