import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DialogHost } from './components/modals/DialogHost'
import { FullPageLoader, Spinner } from './components/ui/Spinner'
import { Toaster } from './components/ui/Toaster'
import { exitApp, registerBackButton, syncStatusBar } from './lib/native'
import { isConfigured } from './lib/supabase'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SettingsPage from './pages/SettingsPage'
import { useAuth } from './store/auth'
import { useDialogs } from './store/dialogs'
import { useTrackerData } from './store/trackerData'
import { useTrackers } from './store/trackers'
import { popBack } from './store/ui'
import { useView } from './store/view'

// Charts are the heaviest dependency; load them only when the Progress page opens.
const ProgressPage = lazy(() => import('./pages/ProgressPage'))

function RequireAuth() {
  const status = useAuth((s) => s.status)
  if (status === 'loading') return <FullPageLoader />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <AuthenticatedApp />
}

function GuestOnly() {
  const status = useAuth((s) => s.status)
  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Loads trackers once per login and the selected tracker's data whenever it changes. */
function AuthenticatedApp() {
  const userId = useAuth((s) => s.session?.user.id)
  const loadTrackers = useTrackers((s) => s.load)
  const selectedId = useTrackers((s) => s.selectedId)
  const trackersReady = useTrackers((s) => s.status === 'ready')
  const loadData = useTrackerData((s) => s.load)
  const closeDialog = useDialogs((s) => s.close)

  useEffect(() => {
    loadTrackers()
  }, [userId, loadTrackers])

  useEffect(() => {
    if (!trackersReady) return
    closeDialog()
    loadData(selectedId)
  }, [selectedId, trackersReady, loadData, closeDialog])

  return (
    <>
      <AppShell />
      <DialogHost />
    </>
  )
}

/** Resets per-user state on logout and wires the Android back button. */
function AppEffects() {
  const status = useAuth((s) => s.status)
  const theme = useAuth((s) => s.profile?.theme ?? 'light')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (status === 'unauthenticated') {
      useTrackers.getState().reset()
      useTrackerData.getState().reset()
      useDialogs.getState().close()
      useView.getState().goToday()
    }
  }, [status])

  useEffect(() => syncStatusBar(theme), [theme])

  useEffect(
    () =>
      registerBackButton(() => {
        if (popBack()) return
        const path = location.pathname
        if (path === '/progress' || path === '/settings') navigate('/dashboard')
        else if (path === '/register') navigate('/login')
        else exitApp()
      }),
    [location.pathname, navigate],
  )

  // Escape closes the top-most overlay that doesn't handle it itself (e.g. menus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) popBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return null
}

function NotConfigured() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="card max-w-lg p-6">
        <h1 className="text-lg font-semibold">Backend not configured</h1>
        <p className="mt-2 text-sm text-muted">
          Set <code className="rounded bg-subtle px-1">VITE_SUPABASE_URL</code> and <code className="rounded bg-subtle px-1">VITE_SUPABASE_ANON_KEY</code> in a{' '}
          <code className="rounded bg-subtle px-1">.env</code> file (see <code>.env.example</code> and README), then restart the dev server.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => (isConfigured ? init() : undefined), [init])

  if (!isConfigured) return <NotConfigured />

  return (
    <HashRouter>
      <AppEffects />
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/progress"
            element={
              <Suspense
                fallback={
                  <div className="flex justify-center py-20 text-muted">
                    <Spinner />
                  </div>
                }
              >
                <ProgressPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}
