import { DEPARTMENTS, sortByDepartmentOrder } from '../config/departments'
import { fr } from '../i18n/fr'
import type { DepartmentEntry, Edition, Need } from './schemas'

export const DISCORD_MESSAGE_LIMIT = 2000

// Headroom below the hard limit so the "(message i/N)" suffix always fits.
const CHUNK_BUDGET = 1900

function finalizeChunks(blocks: string[]): string[] {
  const chunks = packIntoChunks(blocks, CHUNK_BUDGET)
  if (chunks.length <= 1) return chunks
  return chunks.map((chunk, i) => `${chunk}\n\n${fr.discord.partSuffix(i + 1, chunks.length)}`)
}

// siteOrigin turns repo screenshots into absolute URLs Discord can embed;
// without it only https:// images are included.
export function formatEditionForDiscord(edition: Edition, siteOrigin?: string): string[] {
  return finalizeChunks(buildBlocks(edition, siteOrigin))
}

// Discord version of the Contribuer board: open needs grouped by team. The
// optional siteOrigin adds a footer link back to the full board.
export function formatNeedsForDiscord(needs: Need[], siteOrigin?: string): string[] {
  const open = needs.filter((need) => need.status === 'open')
  if (open.length === 0) return []
  const blocks = [`**🙌 ${fr.discordNeeds.title}**\n\n${fr.discordNeeds.intro}`]
  for (const team of DEPARTMENTS) {
    const teamNeeds = open.filter((need) => need.department === team)
    if (teamNeeds.length === 0) continue
    const lines = [`**${team}**`]
    for (const need of teamNeeds) {
      lines.push(`- **${need.title}**${need.time_estimate ? ` · ${need.time_estimate}` : ''}`)
      lines.push(`  ${need.description}`)
      lines.push(`  📩 ${need.contact}`)
    }
    blocks.push(lines.join('\n'))
  }
  if (siteOrigin) blocks.push(fr.discordNeeds.footer(siteOrigin))
  return finalizeChunks(blocks)
}

function buildBlocks(edition: Edition, siteOrigin?: string): string[] {
  const blocks = [`**📍 ${edition.title}**\n\n${edition.intro}`]
  for (const dept of sortByDepartmentOrder(edition.departments, (d) => d.name)) {
    const block = formatDepartment(dept, siteOrigin)
    if (block) blocks.push(block)
  }
  if (edition.body) blocks.push(edition.body)
  return blocks
}

function formatDepartment(dept: DepartmentEntry, siteOrigin?: string): string | undefined {
  const lines = [`**${dept.name}**`]
  if (dept.notes) lines.push(dept.notes)
  appendSection(lines, `✅ ${fr.edition.done}`, dept.done)
  appendSection(lines, `🔄 ${fr.edition.inProgress}`, dept.in_progress)
  appendSection(lines, `🔜 ${fr.edition.next}`, dept.next)
  appendSection(lines, `🙋 ${fr.edition.helpWanted}`, dept.help_wanted)
  // Bare URLs so Discord renders the screenshots as embeds. encodeURI keeps
  // file names with spaces or accents fetchable.
  for (const image of dept.images) {
    const url = image.src.startsWith('/') ? (siteOrigin ? siteOrigin + encodeURI(image.src) : undefined) : encodeURI(image.src)
    if (url) lines.push(`🖼️ ${image.caption ? `${image.caption} — ` : ''}${url}`)
  }
  return lines.length > 1 ? lines.join('\n') : undefined
}

function appendSection(lines: string[], label: string, items: string[]) {
  if (items.length === 0) return
  lines.push(`${label} :`)
  for (const item of items) lines.push(`- ${item}`)
}

function packIntoChunks(blocks: string[], budget: number): string[] {
  const chunks: string[] = []
  let current = ''
  for (const block of blocks) {
    const pieces = block.length > budget ? splitOversizedBlock(block, budget) : [block]
    for (const piece of pieces) {
      if (!current) {
        current = piece
      } else if (current.length + 2 + piece.length <= budget) {
        current += `\n\n${piece}`
      } else {
        chunks.push(current)
        current = piece
      }
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function splitOversizedBlock(block: string, budget: number): string[] {
  const pieces: string[] = []
  let current = ''
  for (const line of block.split('\n')) {
    const segments = line.length > budget ? sliceHard(line, budget) : [line]
    for (const segment of segments) {
      if (!current) {
        current = segment
      } else if (current.length + 1 + segment.length <= budget) {
        current += `\n${segment}`
      } else {
        pieces.push(current)
        current = segment
      }
    }
  }
  if (current) pieces.push(current)
  return pieces
}

function sliceHard(line: string, budget: number): string[] {
  const segments: string[] = []
  for (let i = 0; i < line.length; i += budget) {
    segments.push(line.slice(i, i + budget))
  }
  return segments
}
