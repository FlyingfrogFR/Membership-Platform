import { Link } from 'react-router-dom'
import { fr } from '../i18n/fr'
import { usePageTitle } from '../lib/usePageTitle'

export function NotFound() {
  usePageTitle(fr.notFound.title)
  return (
    <div className="py-10 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight">{fr.notFound.title}</h1>
      <p className="mt-4 text-ink-soft">{fr.notFound.text}</p>
      <Link to="/" className="btn btn-primary mt-6">
        {fr.notFound.backHome}
      </Link>
    </div>
  )
}
