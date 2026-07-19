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

export function excerpt(text: string, max = 220): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`
}
