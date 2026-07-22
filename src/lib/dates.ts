// Quarter and day arithmetic for the admin panels. All UTC-based, matching how
// content dates are parsed. Age-relative values must always be computed against
// the caller's "now" (client-side), never at build time — the site only
// rebuilds on merge, so build-time ages would freeze at deploy date.
export interface Quarter {
  year: number
  q: 1 | 2 | 3 | 4
}

export function quarterOf(date: Date): Quarter {
  return { year: date.getUTCFullYear(), q: (Math.floor(date.getUTCMonth() / 3) + 1) as Quarter['q'] }
}

export function nextQuarter(quarter: Quarter): Quarter {
  return quarter.q === 4 ? { year: quarter.year + 1, q: 1 } : { year: quarter.year, q: (quarter.q + 1) as Quarter['q'] }
}

export function prevQuarter(quarter: Quarter): Quarter {
  return quarter.q === 1 ? { year: quarter.year - 1, q: 4 } : { year: quarter.year, q: (quarter.q - 1) as Quarter['q'] }
}

// Last day of the quarter (Mar/Jun/Sep/Dec), UTC midnight.
export function quarterEnd(quarter: Quarter): Date {
  return new Date(Date.UTC(quarter.year, quarter.q * 3, 0))
}

export function quarterLabel(quarter: Quarter): string {
  return `T${quarter.q} ${quarter.year}`
}

export function quarterSlug(quarter: Quarter): string {
  return `${quarter.year}-q${quarter.q}`
}

export function sameQuarter(a: Quarter, b: Quarter): boolean {
  return a.year === b.year && a.q === b.q
}

export function parseQuarterSlug(slug: string): Quarter | null {
  const match = /^(\d{4})-q([1-4])$/.exec(slug)
  return match ? { year: Number(match[1]), q: Number(match[2]) as Quarter['q'] } : null
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

// 'YYYY-MM' key, UTC.
export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  )
}

// Last n month keys ending at (and including) the month of `now`, oldest first.
export function lastMonthKeys(now: Date, n: number): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))))
  }
  return keys
}
