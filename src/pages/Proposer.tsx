import { useMemo, useState } from 'react'
import { ErrorList, Field, inputClass, ListInput, OutputPanel } from '../components/ComposerBits'
import { DEPARTMENTS, type Department } from '../config/departments'
import { fr } from '../i18n/fr'
import {
  composeEditionFile,
  composeNeedYaml,
  editionFilePath,
  NEEDS_FILE_PATH,
  slugify,
  type EditionDepartmentDraft,
} from '../lib/compose'
import { usePageTitle } from '../lib/usePageTitle'

type Tab = 'edition' | 'need'

const today = () => new Date().toISOString().slice(0, 10)

export function Proposer() {
  usePageTitle(fr.compose.title)
  const [tab, setTab] = useState<Tab>('need')
  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{fr.compose.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">{fr.compose.lede}</p>
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

const emptyLists = (): Omit<EditionDepartmentDraft, 'name'> => ({ done: [], in_progress: [], next: [], help_wanted: [] })

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
      departments[d].help_wanted.filter((s) => s.trim()).length,
    0,
  )

  const errors = [
    !effectiveTitle.trim() && t.errTitle,
    !intro.trim() && t.errIntro,
    !published && t.errPublished,
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

  const setList = (dept: Department, key: keyof Omit<EditionDepartmentDraft, 'name'>) => (items: string[]) =>
    setDepartments((prev) => ({ ...prev, [dept]: { ...prev[dept], [key]: items } }))

  const deptCount = (dept: Department) =>
    departments[dept].done.filter((s) => s.trim()).length +
    departments[dept].in_progress.filter((s) => s.trim()).length +
    departments[dept].next.filter((s) => s.trim()).length +
    departments[dept].help_wanted.filter((s) => s.trim()).length

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
      {file && <OutputPanel content={file} filePath={filePath} mode="new-file" downloadName={`${slug}.md`} />}
    </section>
  )
}
