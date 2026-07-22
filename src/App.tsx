import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Admin } from './pages/Admin'
import { APropos } from './pages/APropos'
import { Contribuer } from './pages/Contribuer'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { PointVaccEdition } from './pages/PointVaccEdition'
import { PointVaccList } from './pages/PointVaccList'
import { Proposer } from './pages/Proposer'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/point-vacc" element={<PointVaccList />} />
          <Route path="/point-vacc/:slug" element={<PointVaccEdition />} />
          <Route path="/contribuer" element={<Contribuer />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/proposer" element={<Proposer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </>
  )
}
