import { z } from 'zod'
import { DEPARTMENTS } from '../config/departments'

const nonEmptyString = z.string().trim().min(1)
const bulletList = z.array(nonEmptyString).default([])
const kebabCase = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (a-z, 0-9, hyphens)')

// YAML gives a Date for unquoted dates and a string for quoted ones. Do not use
// z.coerce.date() here: it would also accept stray numbers as epoch offsets.
const contentDate = z.preprocess(
  (value) => (typeof value === 'string' ? new Date(value) : value),
  z.date('must be a date (YYYY-MM-DD)'),
)

// Screenshots live in the repo under public/ (served from the site root) or on
// an https host; anything else cannot resolve on the static site.
export const editionImageSchema = z.strictObject({
  src: nonEmptyString.refine((s) => s.startsWith('/') || s.startsWith('https://'), {
    message: 'src must start with "/" (repo image under public/) or "https://"',
  }),
  caption: nonEmptyString.optional(),
})

export const departmentEntrySchema = z.strictObject({
  name: z.enum(DEPARTMENTS),
  // Free-form team comment (markdown), for teams that want more than bullets.
  notes: nonEmptyString.optional(),
  done: bulletList,
  in_progress: bulletList,
  next: bulletList,
  help_wanted: bulletList,
  images: z.array(editionImageSchema).default([]),
})

// A per-team draft section file (content/point-vacc/drafts/<slug>/<team>.yaml)
// holds exactly one department entry; the HoM assembles them into an edition.
export const editionSectionFileSchema = departmentEntrySchema

export const editionSchema = z.strictObject({
  title: nonEmptyString,
  slug: kebabCase,
  published: contentDate,
  intro: nonEmptyString,
  departments: z.array(departmentEntrySchema).min(1),
})

export const needSchema = z
  .strictObject({
    id: kebabCase,
    type: z.enum(['ponctuel', 'poste']),
    title: nonEmptyString,
    department: z.enum(DEPARTMENTS),
    description: nonEmptyString,
    skills: z.array(nonEmptyString).default([]),
    // Optional English mirror of the announcement fields, used by the English
    // Discord exports (which otherwise fall back to the French text). Left
    // blank at submission, the direct-send function can fill them by AI
    // translation — reviewed in the pull request like everything else.
    title_en: nonEmptyString.optional(),
    description_en: nonEmptyString.optional(),
    skills_en: z.array(nonEmptyString).optional(),
    time_estimate: nonEmptyString.optional(),
    contact: nonEmptyString,
    status: z.enum(['open', 'filled', 'closed']),
    posted: contentDate,
    // When a need is filled: the date feeds the time-to-fill KPI (unrecoverable
    // if not captured), and filled_via is deliberately a PII-free enum — never
    // a person's name, since /content ships in the public bundle.
    filled_at: contentDate.optional(),
    filled_via: z.enum(['ticket', 'discord', 'direct']).optional(),
  })
  .refine((need) => !need.filled_at || need.filled_at >= need.posted, {
    path: ['filled_at'],
    message: 'filled_at must not be before posted',
  })

// An emptied needs file (yaml null) is a legitimate "no needs right now" state.
export const needsFileSchema = z.preprocess((value) => value ?? [], z.array(needSchema))

// Manual, anonymous Membership ticket log: department + timestamps only, no PII.
export const ticketLogEntrySchema = z
  .strictObject({
    id: kebabCase,
    department: z.enum(DEPARTMENTS),
    opened: contentDate,
    first_response: contentDate.optional(),
    closed: contentDate.optional(),
    outcome: z.enum(['resolved', 'redirected', 'no_response', 'other']).optional(),
  })
  .refine((e) => !e.first_response || e.first_response >= e.opened, {
    path: ['first_response'],
    message: 'first_response must not be before opened',
  })
  .refine((e) => !e.closed || e.closed >= e.opened, {
    path: ['closed'],
    message: 'closed must not be before opened',
  })
  .refine((e) => !(e.first_response && e.closed) || e.closed >= e.first_response, {
    path: ['closed'],
    message: 'closed must not be before first_response',
  })

export const ticketLogFileSchema = z.preprocess((value) => value ?? [], z.array(ticketLogEntrySchema))

export type TicketLogEntry = z.infer<typeof ticketLogEntrySchema>

// Coordination pillar tracker: which teams sent their private monthly update.
// Booleans and dates only — the update content itself is private (Phase 2) and
// must never enter this public repo.
export const coordinationEntrySchema = z.strictObject({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM'),
  received: z.array(z.enum(DEPARTMENTS)).default([]),
})

export const coordinationFileSchema = z.preprocess((value) => value ?? [], z.array(coordinationEntrySchema))

export type CoordinationEntry = z.infer<typeof coordinationEntrySchema>

export type DepartmentEntry = z.infer<typeof departmentEntrySchema>
export type EditionFrontmatter = z.infer<typeof editionSchema>
export type Need = z.infer<typeof needSchema>

export interface Edition extends EditionFrontmatter {
  body: string
}
