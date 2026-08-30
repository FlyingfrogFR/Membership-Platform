import { useMemo, useState } from 'react'
import { DirectSend, DraftBar, ErrorList, Field, inputClass, ListInput, OutputPanel } from '../components/ComposerBits'
import { Gate } from '../components/Gate'
import { DEPARTMENTS, type Department } from '../config/departments'
import { fr } from '../i18n/fr'
import {
  composeNeedYaml,
  composeSectionYaml,
  editionImagesDir,
  editionSectionDraftPath,
  githubUploadDirUrl,
  NEEDS_FILE_PATH,
  slugify,
  type EditionDepartmentDraft,
  type EditionImageDraft,
} from '../lib/compose'
import { asBool, asEnum, asInt, asRecord, asString, asStringList } from '../lib/draft'
import { parseNeedImport, parseSectionImport } from '../lib/importYaml'
import { useDraft } from '../lib/useDraft'
import { usePageTitle } from '../lib/usePageTitle'

type Tab = 'edition' | 'need'

// Local date, not UTC: between midnight and ~2 a.m. Paris time the UTC date is
// still "yesterday". fr-CA formats as YYYY-MM-DD.
const today = () => new Date().toLocaleDateString('fr-CA')

export function Proposer() {
  usePageTitle(fr.compose.title)
  return (
    <Gate kind="team">
      <ProposerContent />
    </Gate>
  )
}

function ProposerContent() {
  const tab = useDraft<Tab>('membership-tab-proposer-v1', () => 'need', (stored, initial) =>
    asEnum(stored, ['need', 'edition'] as const, initial),
  )
  return (
    <div>
      <header className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.compose.title}</h1>
          <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">{fr.site.internalBadge}</span>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.compose.lede}</p>
        <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm leading-relaxed text-warn">{fr.site.internalNote}</p>
      </header>

      <div className="mt-8 flex rounded-full border border-line bg-paper p-1 sm:inline-flex">
        {(
          [
            { value: 'need', label: fr.compose.tabNeed },
            { value: 'edition', label: fr.compose.tabEdition },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => tab.set(() => value)}
            aria-pressed={tab.value === value}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              tab.value === value ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">{tab.value === 'need' ? <NeedComposer /> : <EditionComposer />}</div>
    </div>
  )
}

interface NeedDraftState {
  type: 'ponctuel' | 'poste'
  title: string
  department: Department
  description: string
  skills: string[]
  timeEstimate: string
  contact: string
  posted: string
  idTouched: boolean
  id: string
}

const NEED_DRAFT_KEY = 'membership-draft-need-v1'

function initialNeedDraft(): NeedDraftState {
  return {
    type: 'ponctuel',
    title: '',
    department: DEPARTMENTS[0],
    description: '',
    skills: [],
    timeEstimate: '',
    contact: '',
    posted: today(),
    idTouched: false,
    id: '',
  }
}

function reviveNeedDraft(stored: unknown, initial: NeedDraftState): NeedDraftState {
  const s = asRecord(stored)
  return {
    type: asEnum(s.type, ['ponctuel', 'poste'] as const, initial.type),
    title: asString(s.title),
    department: asEnum(s.department, DEPARTMENTS, initial.department),
    description: asString(s.description),
    skills: asStringList(s.skills),
    timeEstimate: asString(s.timeEstimate),
    contact: asString(s.contact),
    posted: asString(s.posted, initial.posted),
    idTouched: asBool(s.idTouched),
    id: asString(s.id),
  }
}

// Small "load a generated .yaml back into the form" affordance, shared by both
// composers. onFile receives the file's text and name, one call per file.
function ImportYamlRow({ idBase, hint, message, onFile }: { idBase: string; hint: string; message: string; onFile: (text: string, fileName: string) => void }) {
  const t = fr.compose.importFile
  const inputId = `${idBase}-import`
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <label
        htmlFor={inputId}
        className="inline-block cursor-pointer rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:border-accent"
      >
        {t.cta}
      </label>
      <input
        id={inputId}
        type="file"
        accept=".yaml,.yml,text/yaml,application/yaml"
        multiple
        className="sr-only"
        onChange={(event) => {
          void (async (files: FileList | null) => {
            for (const file of [...(files ?? [])]) onFile(await file.text(), file.name)
          })(event.target.files)
          event.target.value = ''
        }}
      />
      <span className="text-xs text-ink-soft">{hint}</span>
      <span aria-live="polite" className="text-xs font-bold text-accent-strong">
        {message}
      </span>
    </div>
  )
}

function NeedComposer() {
  const t = fr.compose.need
  const draft = useDraft(NEED_DRAFT_KEY, initialNeedDraft, reviveNeedDraft)
  const d = draft.value
  const patch = (partial: Partial<NeedDraftState>) => draft.set((prev) => ({ ...prev, ...partial }))
  const [importMsg, setImportMsg] = useState('')

  function onImport(text: string, fileName: string) {
    const need = parseNeedImport(text)
    if (!need) {
      setImportMsg(fr.compose.importFile.err(fileName))
      return
    }
    patch({
      type: need.type,
      title: need.title,
      department: need.department,
      description: need.description,
      skills: need.skills,
      timeEstimate: need.time_estimate,
      contact: need.contact,
      posted: need.posted,
      idTouched: true,
      id: need.id,
    })
    setImportMsg(fr.compose.importFile.needOk)
  }

  const autoId = useMemo(() => slugify(`${d.department} ${d.title}`), [d.department, d.title])
  const effectiveId = d.idTouched ? d.id : autoId

  const errors = [
    !d.title.trim() && t.errTitle,
    !d.description.trim() && t.errDescription,
    !d.contact.trim() && t.errContact,
    !d.posted && t.errPosted,
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveId) && t.errId,
  ].filter((e): e is string => Boolean(e))

  const yaml =
    errors.length === 0
      ? composeNeedYaml({
          id: effectiveId,
          type: d.type,
          title: d.title,
          department: d.department,
          description: d.description,
          skills: d.skills,
          time_estimate: d.timeEstimate,
          contact: d.contact,
          status: 'open',
          posted: d.posted,
        })
      : ''

  return (
    <section aria-label={t.title} className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>
      <DraftBar restored={draft.restored} onReset={draft.reset} />
      <ImportYamlRow idBase="need" hint={fr.compose.importFile.needHint} message={importMsg} onFile={onImport} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t.type} htmlFor="need-type">
          <select id="need-type" className={inputClass} value={d.type} onChange={(e) => patch({ type: e.target.value as NeedDraftState['type'] })}>
            <option value="ponctuel">{fr.contribuer.type.ponctuel}</option>
            <option value="poste">{fr.contribuer.type.poste}</option>
          </select>
        </Field>
        <Field label={t.department} htmlFor="need-department">
          <select
            id="need-department"
            className={inputClass}
            value={d.department}
            onChange={(e) => patch({ department: e.target.value as Department })}
          >
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.needTitle} htmlFor="need-title">
            <input id="need-title" className={inputClass} placeholder={t.titlePlaceholder} value={d.title} onChange={(e) => patch({ title: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t.description} htmlFor="need-description">
            <textarea
              id="need-description"
              className={`${inputClass} min-h-24`}
              placeholder={t.descriptionPlaceholder}
              value={d.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ListInput label={t.skills} value={d.skills} onChange={(skills) => patch({ skills })} idBase="need-skill" />
        </div>
        <Field label={t.time} htmlFor="need-time">
          <input id="need-time" className={inputClass} placeholder={t.timePlaceholder} value={d.timeEstimate} onChange={(e) => patch({ timeEstimate: e.target.value })} />
        </Field>
        <Field label={t.contact} htmlFor="need-contact">
          <input id="need-contact" className={inputClass} placeholder={t.contactPlaceholder} value={d.contact} onChange={(e) => patch({ contact: e.target.value })} />
        </Field>
        <Field label={t.posted} htmlFor="need-posted">
          <input id="need-posted" type="date" className={inputClass} value={d.posted} onChange={(e) => patch({ posted: e.target.value })} />
        </Field>
        <Field label={t.id} htmlFor="need-id" hint={t.idHelp}>
          <input
            id="need-id"
            className={inputClass}
            value={effectiveId}
            onChange={(e) => patch({ idTouched: true, id: e.target.value })}
          />
        </Field>
      </div>

      <ErrorList errors={errors} />
      {yaml && (
        <>
          <DirectSend
            endpoint="/api/submit-need"
            payload={{
              id: effectiveId,
              type: d.type,
              title: d.title.trim(),
              department: d.department,
              description: d.description.trim(),
              skills: d.skills.filter((skill) => skill.trim()),
              time_estimate: d.timeEstimate.trim(),
              contact: d.contact.trim(),
              posted: d.posted,
            }}
          />
          <OutputPanel content={yaml} filePath={NEEDS_FILE_PATH} mode="append" appendHelp={t.appendHelp} />
        </>
      )}
    </section>
  )
}

type SectionState = Omit<EditionDepartmentDraft, 'name'>

interface EditionDraftState {
  quarter: number
  year: number
  departments: Record<Department, SectionState>
}

const EDITION_DRAFT_KEY = 'membership-draft-edition-v1'

const emptyLists = (): SectionState => ({
  notes: '',
  done: [],
  in_progress: [],
  next: [],
  help_wanted: [],
  images: [],
})

function initialEditionDraft(): EditionDraftState {
  const now = new Date()
  return {
    quarter: Math.floor(now.getUTCMonth() / 3) + 1,
    year: now.getUTCFullYear(),
    departments: Object.fromEntries(DEPARTMENTS.map((dept) => [dept, emptyLists()])) as Record<Department, SectionState>,
  }
}

function reviveImages(stored: unknown): EditionImageDraft[] {
  if (!Array.isArray(stored)) return []
  return stored.flatMap((item) => {
    const image = asRecord(item)
    const name = asString(image.name)
    return name ? [{ name, caption: asString(image.caption) }] : []
  })
}

function reviveSection(stored: unknown): SectionState {
  const s = asRecord(stored)
  return {
    notes: asString(s.notes),
    done: asStringList(s.done),
    in_progress: asStringList(s.in_progress),
    next: asStringList(s.next),
    help_wanted: asStringList(s.help_wanted),
    images: reviveImages(s.images),
  }
}

function reviveEditionDraft(stored: unknown, initial: EditionDraftState): EditionDraftState {
  const s = asRecord(stored)
  const sections = asRecord(s.departments)
  return {
    quarter: asInt(s.quarter, initial.quarter),
    year: asInt(s.year, initial.year),
    departments: Object.fromEntries(
      DEPARTMENTS.map((dept) => [dept, dept in sections ? reviveSection(sections[dept]) : emptyLists()]),
    ) as Record<Department, SectionState>,
  }
}

function sectionCount(section: SectionState): number {
  return (
    section.done.filter((s) => s.trim()).length +
    section.in_progress.filter((s) => s.trim()).length +
    section.next.filter((s) => s.trim()).length +
    section.help_wanted.filter((s) => s.trim()).length +
    section.images.filter((img) => img.name.trim()).length +
    (section.notes.trim() ? 1 : 0)
  )
}

function EditionComposer() {
  const t = fr.compose.edition
  const draft = useDraft(EDITION_DRAFT_KEY, initialEditionDraft, reviveEditionDraft)
  const { quarter, year, departments } = draft.value
  const [importMsg, setImportMsg] = useState('')

  const slug = `${year}-q${quarter}`
  const yearValid = Number.isInteger(year) && year >= 2020 && year <= 2100
  const errors = [!yearValid && t.errYear].filter((e): e is string => Boolean(e))

  const patchSection = (dept: Department, partial: Partial<SectionState>) =>
    draft.set((prev) => ({
      ...prev,
      departments: { ...prev.departments, [dept]: { ...prev.departments[dept], ...partial } },
    }))

  function onImport(text: string, fileName: string) {
    const section = parseSectionImport(text)
    if (!section) {
      setImportMsg(fr.compose.importFile.err(fileName))
      return
    }
    const { name, ...rest } = section
    patchSection(name, rest)
    setImportMsg(fr.compose.importFile.sectionOk(name))
  }

  return (
    <section aria-label={t.title} className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>
      <DraftBar restored={draft.restored} onReset={draft.reset} />
      <ImportYamlRow idBase="edition" hint={fr.compose.importFile.sectionHint} message={importMsg} onFile={onImport} />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t.quarter} htmlFor="ed-quarter">
          <select id="ed-quarter" className={inputClass} value={quarter} onChange={(e) => draft.set((prev) => ({ ...prev, quarter: Number(e.target.value) }))}>
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>
                T{q}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.year} htmlFor="ed-year">
          <input
            id="ed-year"
            type="number"
            min={2020}
            max={2100}
            className={inputClass}
            value={year}
            onChange={(e) => draft.set((prev) => ({ ...prev, year: Number(e.target.value) }))}
          />
        </Field>
      </div>

      <ErrorList errors={errors} />

      <h3 className="mt-8 text-lg font-extrabold">{t.departments}</h3>
      <div className="mt-3 space-y-3">
        {DEPARTMENTS.map((dept) => {
          const section = departments[dept]
          const count = sectionCount(section)
          const imageCount = section.images.filter((img) => img.name.trim()).length
          return (
            <details key={dept} className="rounded-xl border border-line bg-canvas p-4">
              <summary className="cursor-pointer text-sm font-bold">
                {dept}
                {count > 0 && (
                  <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">
                    {count}
                  </span>
                )}
              </summary>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label={t.notesLabel} htmlFor={`${slugify(dept)}-notes`} hint={t.notesHint}>
                    <textarea
                      id={`${slugify(dept)}-notes`}
                      className={`${inputClass} min-h-20`}
                      placeholder={t.notesPlaceholder}
                      value={section.notes}
                      onChange={(event) => patchSection(dept, { notes: event.target.value })}
                    />
                  </Field>
                </div>
                <ListInput label={fr.edition.done} value={section.done} onChange={(done) => patchSection(dept, { done })} idBase={`${slugify(dept)}-done`} />
                <ListInput
                  label={fr.edition.inProgress}
                  value={section.in_progress}
                  onChange={(in_progress) => patchSection(dept, { in_progress })}
                  idBase={`${slugify(dept)}-progress`}
                />
                <ListInput label={fr.edition.next} value={section.next} onChange={(next) => patchSection(dept, { next })} idBase={`${slugify(dept)}-next`} />
                <ListInput
                  label={fr.edition.helpWanted}
                  value={section.help_wanted}
                  onChange={(help_wanted) => patchSection(dept, { help_wanted })}
                  idBase={`${slugify(dept)}-help`}
                />
                <div className="sm:col-span-2">
                  <ImagesInput dept={dept} images={section.images} onChange={(images) => patchSection(dept, { images })} />
                </div>
              </div>

              {count === 0 ? (
                <p className="mt-4 text-xs text-ink-soft">{t.sectionEmptyHint}</p>
              ) : (
                yearValid && (
                  <div className="mt-5">
                    {imageCount > 0 && (
                      <div className="card mb-4 border-warn-soft bg-warn-soft/40 p-5">
                        <p className="text-sm font-bold">
                          {t.uploadTitle(imageCount)} — {editionImagesDir(slug)}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.uploadHelp}</p>
                        <a href={githubUploadDirUrl(editionImagesDir(slug))} target="_blank" rel="noreferrer" className="btn btn-secondary mt-4">
                          {t.uploadCta} ↗
                        </a>
                      </div>
                    )}
                    <h4 className="text-sm font-extrabold">{t.sectionSendTitle(dept)}</h4>
                    <DirectSend
                      endpoint="/api/submit-section"
                      payload={{
                        slug,
                        section: {
                          name: dept,
                          notes: section.notes,
                          done: section.done.filter((line) => line.trim()),
                          in_progress: section.in_progress.filter((line) => line.trim()),
                          next: section.next.filter((line) => line.trim()),
                          help_wanted: section.help_wanted.filter((line) => line.trim()),
                          images: section.images.filter((img) => img.name.trim()),
                        },
                      }}
                    />
                    <OutputPanel
                      content={composeSectionYaml(slug, { name: dept, ...section })}
                      filePath={editionSectionDraftPath(slug, dept)}
                      mode="new-file"
                      downloadName={`${slugify(dept)}.yaml`}
                    />
                  </div>
                )
              )}
            </details>
          )
        })}
      </div>
    </section>
  )
}

function ImagesInput({
  dept,
  images,
  onChange,
}: {
  dept: Department
  images: EditionImageDraft[]
  onChange: (images: EditionImageDraft[]) => void
}) {
  const t = fr.compose.edition
  const inputId = `${slugify(dept)}-images`

  function onPick(files: FileList | null) {
    if (!files) return
    const existing = new Set(images.map((img) => img.name))
    const added = [...files]
      .map((file) => file.name)
      .filter((name) => !existing.has(name))
      .map((name) => ({ name, caption: '' }))
    if (added.length) onChange([...images, ...added])
  }

  return (
    <fieldset>
      <legend className="text-sm font-bold">{t.imagesLabel}</legend>
      <p className="mt-0.5 text-xs text-ink-soft">{t.imagesHint}</p>
      <div className="mt-2 space-y-2">
        {images.map((image, index) => (
          <div key={image.name} className="flex flex-wrap items-center gap-2">
            <span className="max-w-56 truncate rounded-lg bg-accent-soft px-2.5 py-1.5 text-xs font-bold text-accent-strong">
              {image.name}
            </span>
            <input
              aria-label={`${t.imageCaptionPlaceholder} — ${image.name}`}
              className={`${inputClass} min-w-40 flex-1`}
              placeholder={t.imageCaptionPlaceholder}
              value={image.caption}
              onChange={(event) => onChange(images.map((img, i) => (i === index ? { ...img, caption: event.target.value } : img)))}
            />
            <button
              type="button"
              aria-label={`${t.removeImage} — ${image.name}`}
              onClick={() => onChange(images.filter((_, i) => i !== index))}
              className="rounded-full border border-line px-2.5 py-1 text-sm font-bold text-ink-soft transition-colors hover:border-coral-strong hover:text-coral-strong"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <label
        htmlFor={inputId}
        className="mt-2 inline-block cursor-pointer rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-bold text-accent transition-colors hover:border-accent"
      >
        + {t.chooseImages}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          onPick(event.target.files)
          event.target.value = ''
        }}
      />
    </fieldset>
  )
}
