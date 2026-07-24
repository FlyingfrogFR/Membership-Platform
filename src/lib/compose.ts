// Serializers behind the "Proposer du contenu" and admin forms: they turn form
// drafts into files/snippets that are guaranteed to round-trip through the same
// schemas the build validates with.
import { dump } from 'js-yaml'
import type { Department } from '../config/departments'
import { SITE } from '../config/site'
import type { DepartmentEntry } from './schemas'

export interface EditionImageDraft {
  name: string // file name as it will exist in the repo (kept verbatim)
  caption: string
}

export interface EditionDepartmentDraft {
  name: Department
  notes: string
  done: string[]
  in_progress: string[]
  next: string[]
  help_wanted: string[]
  images: EditionImageDraft[]
}

export interface EditionDraft {
  title: string
  slug: string
  published: string // YYYY-MM-DD
  intro: string
  body: string
  departments: EditionDepartmentDraft[]
}

export interface NeedDraft {
  id: string
  type: 'ponctuel' | 'poste'
  title: string
  department: Department
  description: string
  skills: string[]
  time_estimate: string
  contact: string
  status: 'open' | 'filled' | 'closed'
  posted: string // YYYY-MM-DD
}

export interface TicketDraft {
  id: string
  department: Department
  opened: string // ISO datetime
  first_response: string
  closed: string
  outcome: '' | 'resolved' | 'redirected' | 'no_response' | 'other'
}

const DUMP_OPTIONS = { lineWidth: 1000, quotingType: '"' } as const

function cleanList(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean)
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function editionFilePath(slug: string): string {
  return `content/point-vacc/${slug}.md`
}

// Repo directory (and matching public URL prefix) for an edition's screenshots.
export function editionImagesDir(slug: string): string {
  return `public/images/point-vacc/${slug}`
}

export function editionImageSrc(slug: string, fileName: string): string {
  return `/images/point-vacc/${slug}/${fileName}`
}

// Per-team draft sections: each team sends its own rubrique as a small file
// under the edition's slug; the HoM assembles them into the final edition.
export function editionDraftsDir(slug: string): string {
  return `content/point-vacc/drafts/${slug}`
}

export function editionSectionDraftPath(slug: string, team: Department): string {
  return `${editionDraftsDir(slug)}/${slugify(team)}.yaml`
}

export const NEEDS_FILE_PATH = 'content/contribuer/needs.yaml'
export const TICKET_LOG_FILE_PATH = 'content/membership/tickets-log.yaml'
export const COORDINATION_FILE_PATH = 'content/membership/coordination.yaml'

function draftEntry(slug: string, dept: EditionDepartmentDraft): Record<string, unknown> {
  const entry: Record<string, unknown> = { name: dept.name }
  if (dept.notes.trim()) entry.notes = dept.notes.trim()
  const done = cleanList(dept.done)
  const inProgress = cleanList(dept.in_progress)
  const next = cleanList(dept.next)
  const helpWanted = cleanList(dept.help_wanted)
  const images = dept.images
    .filter((image) => image.name.trim())
    .map((image) =>
      image.caption.trim()
        ? { src: editionImageSrc(slug, image.name.trim()), caption: image.caption.trim() }
        : { src: editionImageSrc(slug, image.name.trim()) },
    )
  if (done.length) entry.done = done
  if (inProgress.length) entry.in_progress = inProgress
  if (next.length) entry.next = next
  if (helpWanted.length) entry.help_wanted = helpWanted
  if (images.length) entry.images = images
  return entry
}

function editionFile(frontmatter: Record<string, unknown>, body: string): string {
  const trimmed = body.trim()
  return `---\n${dump(frontmatter, DUMP_OPTIONS)}---\n${trimmed ? `\n${trimmed}\n` : ''}`
}

export function composeEditionFile(draft: EditionDraft): string {
  const departments = draft.departments
    .map((dept) => draftEntry(draft.slug, dept))
    .filter((entry) => Object.keys(entry).length > 1)

  return editionFile(
    { title: draft.title.trim(), slug: draft.slug, published: draft.published, intro: draft.intro.trim(), departments },
    draft.body,
  )
}

// One team's rubrique as its own draft file (the /proposer per-team flow).
export function composeSectionYaml(slug: string, dept: EditionDepartmentDraft): string {
  return dump(draftEntry(slug, dept), DUMP_OPTIONS)
}

export interface EditionMetaDraft {
  title: string
  slug: string
  published: string // YYYY-MM-DD
  intro: string
  body: string
}

// Assembles the final edition from already-validated team sections (the admin
// flow): sections arrive pre-ordered and keep their image srcs verbatim.
export function composeEditionFromSections(meta: EditionMetaDraft, sections: DepartmentEntry[]): string {
  const departments = sections
    .map((section) => {
      const entry: Record<string, unknown> = { name: section.name }
      if (section.notes) entry.notes = section.notes
      if (section.done.length) entry.done = section.done
      if (section.in_progress.length) entry.in_progress = section.in_progress
      if (section.next.length) entry.next = section.next
      if (section.help_wanted.length) entry.help_wanted = section.help_wanted
      if (section.images.length) {
        entry.images = section.images.map((image) => (image.caption ? { src: image.src, caption: image.caption } : { src: image.src }))
      }
      return entry
    })
    .filter((entry) => Object.keys(entry).length > 1)

  return editionFile(
    { title: meta.title.trim(), slug: meta.slug, published: meta.published, intro: meta.intro.trim(), departments },
    meta.body,
  )
}

export function composeNeedYaml(draft: NeedDraft): string {
  const item: Record<string, unknown> = {
    id: draft.id,
    type: draft.type,
    title: draft.title.trim(),
    department: draft.department,
    description: draft.description.trim(),
  }
  const skills = cleanList(draft.skills)
  if (skills.length) item.skills = skills
  if (draft.time_estimate.trim()) item.time_estimate = draft.time_estimate.trim()
  item.contact = draft.contact.trim()
  item.status = draft.status
  item.posted = draft.posted
  return dump([item], DUMP_OPTIONS)
}

export function composeCoordinationYaml(month: string, received: Department[]): string {
  return dump([{ month, received }], DUMP_OPTIONS)
}

export function composeTicketYaml(draft: TicketDraft): string {
  const item: Record<string, unknown> = {
    id: draft.id,
    department: draft.department,
    opened: draft.opened,
  }
  if (draft.first_response) item.first_response = draft.first_response
  if (draft.closed) item.closed = draft.closed
  if (draft.outcome) item.outcome = draft.outcome
  return dump([item], DUMP_OPTIONS)
}

// GitHub's web editor accepts ?filename= and ?value= on /new/ URLs; content is
// only inlined while the URL stays comfortably under browser/server limits —
// callers always copy the content to the clipboard as a fallback.
const MAX_PREFILL_URL_LENGTH = 7500

export function githubNewFileUrl(path: string, content: string): string {
  const base = `${SITE.repoUrl}/new/main?filename=${encodeURIComponent(path)}`
  const withValue = `${base}&value=${encodeURIComponent(content)}`
  return withValue.length <= MAX_PREFILL_URL_LENGTH ? withValue : base
}

export function githubEditFileUrl(path: string): string {
  return `${SITE.repoUrl}/edit/main/${path}`
}

// GitHub's drag-and-drop upload page; it creates the directory on commit.
export function githubUploadDirUrl(dir: string): string {
  return `${SITE.repoUrl}/upload/main/${dir}`
}
