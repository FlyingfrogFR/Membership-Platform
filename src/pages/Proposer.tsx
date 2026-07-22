import { useMemo, useState } from 'react'
import { ErrorList, Field, inputClass, ListInput, OutputPanel } from '../components/ComposerBits'
import { Gate } from '../components/Gate'
import { DEPARTMENTS, type Department } from '../config/departments'
import { fr } from '../i18n/fr'
import {
  composeEditionFile,
  composeNeedYaml,
  editionFilePath,
  editionImagesDir,
  githubUploadDirUrl,
  NEEDS_FILE_PATH,
  slugify,
  type EditionDepartmentDraft,
  type EditionImageDraft,
} from '../lib/compose'
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
  const [tab, setTab] = useState<Tab>('need')
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
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              tab === value ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">{tab === 'need' ? <NeedComposer /> : <EditionComposer />}</div>
    </div>
  )
}

function NeedComposer() {
  const t = fr.compose.need
  const [type, setType] = useState<'ponctuel' | 'poste'>('ponctuel')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState<Department>(DEPARTMENTS[0])
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [timeEstimate, setTimeEstimate] = useState('')
  const [contact, setContact] = useState('')
  const [posted, setPosted] = useState(today)
  const [idTouched, setIdTouched] = useState(false)
  const [id, setId] = useState('')

  const autoId = useMemo(() => slugify(`${department} ${title}`), [department, title])
  const effectiveId = idTouched ? id : autoId

  const errors = [
    !title.trim() && t.errTitle,
    !description.trim() && t.errDescription,
    !contact.trim() && t.errContact,
    !posted && t.errPosted,
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveId) && t.errId,
  ].filter((e): e is string => Boolean(e))

  const yaml = useMemo(
    () =>
      errors.length === 0
        ? composeNeedYaml({
            id: effectiveId,
            type,
            title,
            department,
            description,
            skills,
            time_estimate: timeEstimate,
            contact,
            status: 'open',
            posted,
          })
        : '',
    [errors.length, effectiveId, type, title, department, description, skills, timeEstimate, contact, posted],
  )

  return (
    <section aria-label={t.title} className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t.type} htmlFor="need-type">
          <select id="need-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="ponctuel">{fr.contribuer.type.ponctuel}</option>
            <option value="poste">{fr.contribuer.type.poste}</option>
          </select>
        </Field>
        <Field label={t.department} htmlFor="need-department">
          <select
            id="need-department"
            className={inputClass}
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
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
            <input id="need-title" className={inputClass} placeholder={t.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t.description} htmlFor="need-description">
            <textarea
              id="need-description"
              className={`${inputClass} min-h-24`}
              placeholder={t.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ListInput label={t.skills} value={skills} onChange={setSkills} idBase="need-skill" />
        </div>
        <Field label={t.time} htmlFor="need-time">
          <input id="need-time" className={inputClass} placeholder={t.timePlaceholder} value={timeEstimate} onChange={(e) => setTimeEstimate(e.target.value)} />
        </Field>
        <Field label={t.contact} htmlFor="need-contact">
          <input id="need-contact" className={inputClass} placeholder={t.contactPlaceholder} value={contact} onChange={(e) => setContact(e.target.value)} />
        </Field>
        <Field label={t.posted} htmlFor="need-posted">
          <input id="need-posted" type="date" className={inputClass} value={posted} onChange={(e) => setPosted(e.target.value)} />
        </Field>
        <Field label={t.id} htmlFor="need-id" hint={t.idHelp}>
          <input
            id="need-id"
            className={inputClass}
            value={effectiveId}
            onChange={(e) => {
              setIdTouched(true)
              setId(e.target.value)
            }}
          />
        </Field>
      </div>

      <ErrorList errors={errors} />
      {yaml && <OutputPanel content={yaml} filePath={NEEDS_FILE_PATH} mode="append" appendHelp={t.appendHelp} />}
    </section>
  )
}

const emptyLists = (): Omit<EditionDepartmentDraft, 'name'> => ({
  notes: '',
  done: [],
  in_progress: [],
  next: [],
  help_wanted: [],
  images: [],
})

function EditionComposer() {
  const t = fr.compose.edition
  const now = new Date()
  const [quarter, setQuarter] = useState(Math.floor(now.getUTCMonth() / 3) + 1)
  const [year, setYear] = useState(now.getUTCFullYear())
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [published, setPublished] = useState(today)
  const [intro, setIntro] = useState('')
  const [body, setBody] = useState('')
  const [departments, setDepartments] = useState<Record<Department, Omit<EditionDepartmentDraft, 'name'>>>(
    () => Object.fromEntries(DEPARTMENTS.map((d) => [d, emptyLists()])) as Record<Department, Omit<EditionDepartmentDraft, 'name'>>,
  )

  const autoTitle = `Point vACC — T${quarter} ${year}`
  const effectiveTitle = titleTouched ? title : autoTitle
  const slug = `${year}-q${quarter}`
  const filePath = editionFilePath(slug)

  const totalItems = DEPARTMENTS.reduce(
    (sum, d) =>
      sum +
      departments[d].done.filter((s) => s.trim()).length +
      departments[d].in_progress.filter((s) => s.trim()).length +
      departments[d].next.filter((s) => s.trim()).length +
      departments[d].help_wanted.filter((s) => s.trim()).length +
      departments[d].images.filter((img) => img.name.trim()).length +
      (departments[d].notes.trim() ? 1 : 0),
    0,
  )
  const totalImages = DEPARTMENTS.reduce((sum, d) => sum + departments[d].images.filter((img) => img.name.trim()).length, 0)

  const errors = [
    !effectiveTitle.trim() && t.errTitle,
    !intro.trim() && t.errIntro,
    !published && t.errPublished,
    (!Number.isInteger(year) || year < 2020 || year > 2100) && t.errYear,
    totalItems === 0 && t.errNoItems,
  ].filter((e): e is string => Boolean(e))

  const file = useMemo(
    () =>
      errors.length === 0
        ? composeEditionFile({
            title: effectiveTitle,
            slug,
            published,
            intro,
            body,
            departments: DEPARTMENTS.map((name) => ({ name, ...departments[name] })),
          })
        : '',
    [errors.length, effectiveTitle, slug, published, intro, body, departments],
  )

  const setList = (dept: Department, key: 'done' | 'in_progress' | 'next' | 'help_wanted') => (items: string[]) =>
    setDepartments((prev) => ({ ...prev, [dept]: { ...prev[dept], [key]: items } }))

  const setImages = (dept: Department) => (images: EditionImageDraft[]) =>
    setDepartments((prev) => ({ ...prev, [dept]: { ...prev[dept], images } }))

  const setNotes = (dept: Department) => (notes: string) =>
    setDepartments((prev) => ({ ...prev, [dept]: { ...prev[dept], notes } }))

  const deptCount = (dept: Department) =>
    departments[dept].done.filter((s) => s.trim()).length +
    departments[dept].in_progress.filter((s) => s.trim()).length +
    departments[dept].next.filter((s) => s.trim()).length +
    departments[dept].help_wanted.filter((s) => s.trim()).length +
    departments[dept].images.filter((img) => img.name.trim()).length +
    (departments[dept].notes.trim() ? 1 : 0)

  return (
    <section aria-label={t.title} className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold">{t.title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{t.help}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={t.quarter} htmlFor="ed-quarter">
          <select id="ed-quarter" className={inputClass} value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
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
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </Field>
        <Field label={t.editionTitle} htmlFor="ed-title">
          <input
            id="ed-title"
            className={inputClass}
            value={effectiveTitle}
            onChange={(e) => {
              setTitleTouched(true)
              setTitle(e.target.value)
            }}
          />
        </Field>
        <Field label={t.published} htmlFor="ed-published">
          <input id="ed-published" type="date" className={inputClass} value={published} onChange={(e) => setPublished(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.intro} htmlFor="ed-intro">
            <textarea id="ed-intro" className={`${inputClass} min-h-24`} value={intro} onChange={(e) => setIntro(e.target.value)} />
          </Field>
        </div>
      </div>

      <h3 className="mt-8 text-lg font-extrabold">{t.departments}</h3>
      <div className="mt-3 space-y-3">
        {DEPARTMENTS.map((dept) => (
          <details key={dept} className="rounded-xl border border-line bg-canvas p-4">
            <summary className="cursor-pointer text-sm font-bold">
              {dept}
              {deptCount(dept) > 0 && (
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-strong">
                  {deptCount(dept)}
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
                    value={departments[dept].notes}
                    onChange={(event) => setNotes(dept)(event.target.value)}
                  />
                </Field>
              </div>
              <ListInput label={fr.edition.done} value={departments[dept].done} onChange={setList(dept, 'done')} idBase={`${slugify(dept)}-done`} />
              <ListInput
                label={fr.edition.inProgress}
                value={departments[dept].in_progress}
                onChange={setList(dept, 'in_progress')}
                idBase={`${slugify(dept)}-progress`}
              />
              <ListInput label={fr.edition.next} value={departments[dept].next} onChange={setList(dept, 'next')} idBase={`${slugify(dept)}-next`} />
              <ListInput
                label={fr.edition.helpWanted}
                value={departments[dept].help_wanted}
                onChange={setList(dept, 'help_wanted')}
                idBase={`${slugify(dept)}-help`}
              />
              <div className="sm:col-span-2">
                <ImagesInput dept={dept} images={departments[dept].images} onChange={setImages(dept)} />
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-6">
        <Field label={t.body} htmlFor="ed-body">
          <textarea id="ed-body" className={`${inputClass} min-h-20`} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
      </div>

      <ErrorList errors={errors} />
      {file && totalImages > 0 && (
        <div className="card mt-6 border-warn-soft bg-warn-soft/40 p-5">
          <p className="text-sm font-bold">
            {fr.compose.edition.uploadTitle(totalImages)} — {editionImagesDir(slug)}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{fr.compose.edition.uploadHelp}</p>
          <a
            href={githubUploadDirUrl(editionImagesDir(slug))}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary mt-4"
          >
            {fr.compose.edition.uploadCta} ↗
          </a>
        </div>
      )}
      {file && <OutputPanel content={file} filePath={filePath} mode="new-file" downloadName={`${slug}.md`} />}
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
