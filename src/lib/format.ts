// Content dates are date-only YAML values parsed as UTC midnight; format them in
// UTC so the displayed day never shifts with the reader's timezone.
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(date: Date): string {
  return dateFormatter.format(date)
}

// Human-friendly French duration for averaged ticket delays. Coarse on purpose:
// minutes under an hour, hours under two days, days beyond that.
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(ms / 3_600_000)
  if (hours < 48) return `${hours} h`
  return `${Math.round(ms / 86_400_000)} j`
}

export function excerpt(text: string, max = 220): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`
}
