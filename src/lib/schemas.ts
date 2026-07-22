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

export const departmentEntrySchema = z.strictObject({
  name: z.enum(DEPARTMENTS),
  done: bulletList,
  in_progress: bulletList,
  next: bulletList,
  help_wanted: bulletList,
})

export const editionSchema = z.strictObject({
  title: nonEmptyString,
  slug: kebabCase,
  published: contentDate,
  intro: nonEmptyString,
  departments: z.array(departmentEntrySchema).min(1),
})

export const needSchema = z.strictObject({
  id: kebabCase,
  type: z.enum(['ponctuel', 'poste']),
  title: nonEmptyString,
  department: z.enum(DEPARTMENTS),
  description: nonEmptyString,
  skills: z.array(nonEmptyString).default([]),
  time_estimate: nonEmptyString.optional(),
  contact: nonEmptyString,
  status: z.enum(['open', 'filled', 'closed']),
  posted: contentDate,
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

export type DepartmentEntry = z.infer<typeof departmentEntrySchema>
export type EditionFrontmatter = z.infer<typeof editionSchema>
export type Need = z.infer<typeof needSchema>

export interface Edition extends EditionFrontmatter {
  body: string
}
