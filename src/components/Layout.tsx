import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { SITE } from '../config/site'
import { fr } from '../i18n/fr'

const navItems = [
  { to: '/', label: fr.nav.home, end: true },
  { to: '/point-vacc', label: fr.nav.pointVacc, end: false },
  { to: '/contribuer', label: fr.nav.contribuer, end: false },
  { to: '/a-propos', label: fr.nav.aPropos, end: false },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        {fr.a11y.skipToContent}
      </a>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <PlaneMark />
            <span>{fr.site.name}</span>
          </Link>
          <nav aria-label={fr.a11y.mainNav}>
            <ul className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-soft text-accent-strong'
                          : 'text-ink-soft hover:bg-canvas hover:text-ink'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-12">{children}</div>
      </main>
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-soft">
          <p>{fr.footer.disclaimer}</p>
          <p className="flex gap-4">
            <a className="hover:text-accent-strong" href={SITE.vatsimFrUrl} target="_blank" rel="noreferrer">
              {fr.footer.vatsimFr}
            </a>
            <a className="hover:text-accent-strong" href={SITE.repoUrl} target="_blank" rel="noreferrer">
              {fr.footer.source}
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function PlaneMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 rounded-lg bg-accent p-1.5 text-white" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.1 17.9l11.63-4.99a1 1 0 0 0 0-1.83L6.1 6.1a.66.66 0 0 0-.93.6l.01 3.08c0 .33.25.62.58.66L14 12l-8.24 1.55a.67.67 0 0 0-.58.66l-.01 3.08c0 .48.5.8.93.61z"
      />
    </svg>
  )
}
