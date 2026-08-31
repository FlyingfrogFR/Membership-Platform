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

// Teaser for cards: first paragraph only (a multi-paragraph intro must not
// run on as one blob), shortened at a word boundary.
export function excerpt(text: string, max = 220): string {
  const firstParagraph = text.split(/\n\s*\n/, 1)[0].replace(/\s+/g, ' ').trim()
  if (firstParagraph.length <= max) return firstParagraph
  const cut = firstParagraph.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`
}
