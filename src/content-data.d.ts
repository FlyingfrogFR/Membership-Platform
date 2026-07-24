// Shape of the virtual module emitted by the vacc-content Vite plugin
// (vite.config.ts): all content parsed and schema-validated at build time,
// dates serialized as ISO strings. src/lib/content.ts revives them.
declare module 'virtual:vacc-content' {
  interface SerializedEditionImage {
    src: string
    caption?: string
  }

  interface SerializedDepartmentEntry {
    name: string
    notes?: string
    done: string[]
    in_progress: string[]
    next: string[]
    help_wanted: string[]
    images: SerializedEditionImage[]
  }

  interface SerializedEdition {
    title: string
    slug: string
    published: string
    intro: string
    departments: SerializedDepartmentEntry[]
    body: string
  }

  interface SerializedNeed {
    id: string
    type: 'ponctuel' | 'poste'
    title: string
    department: string
    description: string
    skills: string[]
    time_estimate?: string
    contact: string
    status: 'open' | 'filled' | 'closed'
    posted: string
    filled_at?: string
    filled_via?: 'ticket' | 'discord' | 'direct'
  }

  interface SerializedTicket {
    id: string
    department: string
    opened: string
    first_response?: string
    closed?: string
    outcome?: 'resolved' | 'redirected' | 'no_response' | 'other'
  }

  interface SerializedCoordinationEntry {
    month: string
    received: string[]
  }

  interface SerializedEditionDraft {
    slug: string
    section: SerializedDepartmentEntry
  }

  const content: {
    editions: SerializedEdition[]
    editionDrafts: SerializedEditionDraft[]
    needs: SerializedNeed[]
    tickets: SerializedTicket[]
    coordination: SerializedCoordinationEntry[]
  }
  export default content
}
