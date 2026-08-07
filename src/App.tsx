import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { fr } from './i18n/fr'
import { APropos } from './pages/APropos'
import { Contribuer } from './pages/Contribuer'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { PointVaccList } from './pages/PointVaccList'

// Heavy routes load on demand: the edition page carries marked, the composer
// and admin pages carry js-yaml/zod — none of it belongs in the initial bundle.
const PointVaccEdition = lazy(() => import('./pages/PointVaccEdition').then((m) => ({ default: m.PointVaccEdition })))
const Proposer = lazy(() => import('./pages/Proposer').then((m) => ({ default: m.Proposer })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })))

function RouteChange() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)
  useEffect(() => {
    window.scrollTo(0, 0)
    // Screen readers get no signal from a SPA navigation: move focus to the
    // main landmark (skipped on initial load to keep normal tab order).
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.getElementById('main')?.focus()
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <RouteChange />
      <Layout>
        <Suspense fallback={<p className="py-10 text-center text-ink-soft">{fr.common.loading}</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/point-vacc" element={<PointVaccList />} />
            <Route path="/point-vacc/:slug" element={<PointVaccEdition />} />
            <Route path="/contribuer" element={<Contribuer />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/proposer" element={<Proposer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  )
}
