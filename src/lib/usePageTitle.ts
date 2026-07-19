import { useEffect } from 'react'
import { fr } from '../i18n/fr'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${fr.site.name}` : fr.site.name
  }, [title])
}
