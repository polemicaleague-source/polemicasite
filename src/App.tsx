import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Stats } from './pages/Stats'
import { OneVsOne } from './pages/OneVsOne'
import { Profilo } from './pages/Profilo'
import { Partite } from './pages/Partite'
import { NewsArchive } from './pages/NewsArchive'
import { ManifestoPage } from './pages/Manifesto'
import { AdminLogin } from './pages/admin/Login'
import { AdminLayout } from './pages/admin/Layout'
import { AdminPartite } from './pages/admin/Partite'
import { AdminGiocatori } from './pages/admin/Giocatori'
import { AdminNews } from './pages/admin/News'
import { AdminManifesto } from './pages/admin/Manifesto'
import { AdminRivalita } from './pages/admin/Rivalita'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-center" richColors />
        <Routes>
          {/* Public */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<NewsArchive />} />
            <Route path="/partite" element={<Partite />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/1vs1" element={<OneVsOne />} />
            <Route path="/profilo/:id" element={<Profilo />} />
            <Route path="/manifesto" element={<ManifestoPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="partite" element={<AdminPartite />} />
            <Route path="giocatori" element={<AdminGiocatori />} />
            <Route path="news" element={<AdminNews />} />
            <Route path="manifesto" element={<AdminManifesto />} />
            <Route path="rivalita" element={<AdminRivalita />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
