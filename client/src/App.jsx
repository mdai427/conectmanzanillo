import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore.js'
import Layout from './components/layout/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ErrorPage from './pages/ErrorPage.jsx'

const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const Noticias = lazy(() => import('./pages/Noticias.jsx'))
const Directorio = lazy(() => import('./pages/Directorio.jsx'))
const Posturas = lazy(() => import('./pages/Posturas.jsx'))
const Vacantes = lazy(() => import('./pages/Vacantes.jsx'))
const Empresa = lazy(() => import('./pages/Empresa.jsx'))
const Anunciate = lazy(() => import('./pages/Anunciate.jsx'))
const Legal = lazy(() => import('./pages/Legal.jsx'))
const Comunicados = lazy(() => import('./pages/Comunicados.jsx'))
const DirectorioEmpresarial = lazy(() => import('./pages/DirectorioEmpresarial.jsx'))
const EmpresaPerfil = lazy(() => import('./pages/EmpresaPerfil.jsx'))
const EcosystemModule = lazy(() => import('./pages/EcosystemModule.jsx'))
const CompanyOnboarding = lazy(() => import('./pages/CompanyOnboarding.jsx'))
const SmartRoutes = lazy(() => import('./pages/SmartRoutes.jsx'))
const CustomsControl = lazy(() => import('./pages/CustomsControl.jsx'))
const ControlTower = lazy(() => import('./pages/ControlTower.jsx'))
const Calculators = lazy(() => import('./pages/Calculators.jsx'))
const Freights = lazy(() => import('./pages/Freights.jsx'))
const VerificationQueue = lazy(() => import('./pages/VerificationQueue.jsx'))
const ResourceLibrary = lazy(() => import('./pages/ResourceLibrary.jsx'))
const TrainingLibrary = lazy(() => import('./pages/TrainingLibrary.jsx'))
const Community = lazy(() => import('./pages/Community.jsx'))
const PortStatus = lazy(() => import('./pages/PortStatus.jsx'))
const SectionDetail = lazy(() => import('./pages/SectionDetail.jsx'))
const LongHaulRoutes = lazy(() => import('./pages/LongHaulRoutes.jsx'))
const Marketplace = lazy(() => import('./pages/Marketplace.jsx'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } }
})

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { profile, hasPermission } = useAuthStore()
  return ['admin', 'moderador'].includes(profile?.role) || hasPermission('admin.analytics') || hasPermission('moderation.manage') ? children : <Navigate to="/" replace />
}

function VerificationRoute({ children }) {
  const { profile, hasPermission } = useAuthStore()
  return profile?.role === 'admin' || hasPermission('company.verify') ? children : <Navigate to="/403" replace />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}><Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="seccion/:slug" element={<SectionDetail />} />
            <Route path="pulso-portuario" element={<PortStatus />} />
            <Route path="rutas-foraneas" element={<LongHaulRoutes />} />
            <Route path="noticias" element={<Noticias />} />
            <Route path="directorio" element={<Directorio />} />
            <Route path="posturas" element={<Posturas />} />
            <Route path="vacantes" element={<Vacantes />} />
            <Route path="analitica" element={<Navigate to="/" replace />} />
            <Route path="empresa" element={<Empresa />} />
            <Route path="empresa/onboarding" element={<PrivateRoute><CompanyOnboarding /></PrivateRoute>} />
            <Route path="rutas-inteligentes" element={<PrivateRoute><SmartRoutes /></PrivateRoute>} />
            <Route path="control-aduanal" element={<PrivateRoute><CustomsControl /></PrivateRoute>} />
            <Route path="torre-control" element={<PrivateRoute><ControlTower /></PrivateRoute>} />
            <Route path="anunciate" element={<Anunciate />} />
            <Route path="legal" element={<Legal />} />
            <Route path="comunicados" element={<Comunicados />} />
            <Route path="mapa-terminales" element={<Navigate to="/" replace />} />
            <Route path="directorio-empresarial" element={<DirectorioEmpresarial />} />
            <Route path="directorio-empresarial/:slug" element={<EmpresaPerfil />} />
            <Route path="calculadoras" element={<Calculators />} />
            <Route path="fletes" element={<Freights />} />
            <Route path="documentos" element={<ResourceLibrary />} />
            <Route path="capacitacion" element={<TrainingLibrary />} />
            <Route path="comunidad" element={<Community />} />
            <Route path="marketplace" element={<Marketplace />} />
            {['salarios', 'resenas', 'ia-portuaria'].map(path => (
              <Route key={path} path={path} element={<EcosystemModule />} />
            ))}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="admin" element={<PrivateRoute><AdminRoute><Admin /></AdminRoute></PrivateRoute>} />
            <Route path="admin/verificaciones" element={<PrivateRoute><VerificationRoute><VerificationQueue /></VerificationRoute></PrivateRoute>} />
            <Route path="403" element={<ErrorPage status={403} />} />
            <Route path="500" element={<ErrorPage status={500} />} />
            <Route path="*" element={<ErrorPage status={404} />} />
          </Route>
        </Routes></Suspense>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#161B22', color: '#F0F6FC', border: '1px solid #30363D' },
          success: { iconTheme: { primary: '#22C55E', secondary: '#0D1117' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0D1117' } },
        }}
      />
    </QueryClientProvider>
  )
}

function RouteFallback() { return <div className="grid min-h-[50vh] place-items-center bg-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" aria-label="Cargando" /></div> }
