import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { PublicLayout } from './components/layout/PublicLayout'
import { ConsentBanner, CookieSettingsModal } from './components/consent/ConsentBanner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DialogHost } from './components/modals/DialogHost'
import { UpgradeModal } from './components/subscription/UpgradeModal'
import { FullPageLoader, Spinner } from './components/ui/Spinner'
import { Toaster } from './components/ui/Toaster'
import { analytics } from './lib/analytics'
import { exitApp, isNative, registerBackButton, syncStatusBar } from './lib/native'
import { isConfigured } from './lib/supabase'
import DashboardPage from './pages/DashboardPage'
import FocusPage from './pages/FocusPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import FriendsPage from './pages/FriendsPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SettingsPage from './pages/SettingsPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import { useAuth } from './store/auth'
import { useDialogs } from './store/dialogs'
import { useFocusSound } from './store/focusSound'
import { useFriends } from './store/friends'
import { formatClock, MODE_LABEL, usePomodoro, useRemaining } from './store/pomodoro'
import { usePomodoroSessions } from './store/pomodoroSessions'
import { useSubscriptionStore } from './store/subscription'
import { useTrackerData } from './store/trackerData'
import { useTrackers } from './store/trackers'
import { popBack } from './store/ui'
import { useView } from './store/view'

// Charts and long public pages load on demand.
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const ProPage = lazy(() => import('./pages/ProPage'))
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })))
const HelpIndexPage = lazy(() => import('./pages/HelpPages').then((m) => ({ default: m.HelpIndexPage })))
const HelpArticlePage = lazy(() => import('./pages/HelpPages').then((m) => ({ default: m.HelpArticlePage })))

const pageFallback = (
  <div className="flex justify-center py-20 text-muted">
    <Spinner />
  </div>
)
const lazyPage = (node: React.ReactNode) => <Suspense fallback={pageFallback}>{node}</Suspense>

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

/** Pages like /pro use the app shell when signed in and the public layout otherwise. */
function AdaptiveLayout() {
  const status = useAuth((s) => s.status)
  if (status === 'loading') return <FullPageLoader />
  return status === 'authenticated' ? <AuthenticatedApp /> : <PublicLayout />
}

/** On Android the app opens straight into the app, not the marketing page. */
function Home() {
  const status = useAuth((s) => s.status)
  if (isNative) {
    if (status === 'loading') return <FullPageLoader />
    return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
  }
  return <LandingPage />
}

/** Loads per-user data once per login and the selected tracker's data whenever it changes. */
function AuthenticatedApp() {
  const userId = useAuth((s) => s.session?.user.id)
  const loadTrackers = useTrackers((s) => s.load)
  const selectedId = useTrackers((s) => s.selectedId)
  const trackersReady = useTrackers((s) => s.status === 'ready')
  const loadData = useTrackerData((s) => s.load)
  const closeDialog = useDialogs((s) => s.close)

  useEffect(() => {
    loadTrackers()
    usePomodoroSessions.getState().load()
    useFriends.getState().load()
    useSubscriptionStore.getState().load()
  }, [userId, loadTrackers])

  useEffect(() => {
    if (!trackersReady) return
    closeDialog()
    loadData(selectedId)
  }, [selectedId, trackersReady, loadData, closeDialog])

  return (
    <>
      <PomodoroRunner />
      <AppShell />
      <DialogHost />
    </>
  )
}

/** Finishes the Pomodoro timer on time on every page and shows it in the tab title. */
function PomodoroRunner() {
  const running = usePomodoro((s) => s.endAt !== null)
  const mode = usePomodoro((s) => s.mode)
  const remaining = useRemaining(1000)

  useEffect(() => {
    const tick = () => usePomodoro.getState().tick()
    tick()
    const id = setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    const base = 'HabitFlow — Habit Tracker'
    document.title = running ? `${formatClock(remaining)} · ${MODE_LABEL[mode]} — ${base}` : base
  }, [running, remaining, mode])

  return null
}

/** Resets per-user state on logout, applies themes, records page views and wires the Android back button. */
function AppEffects() {
  const status = useAuth((s) => s.status)
  const theme = useAuth((s) => s.profile?.theme ?? 'light')
  const accent = useAuth((s) => s.profile?.accent_theme ?? 'default')
  const themesAllowed = useSubscriptionStore((s) => s.ent.features.includes('custom_themes'))
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (status === 'unauthenticated') {
      useTrackers.getState().reset()
      useTrackerData.getState().reset()
      useDialogs.getState().close()
      useView.getState().goToday()
      usePomodoro.getState().resetAll()
      usePomodoroSessions.getState().reset()
      useFriends.getState().reset()
      useSubscriptionStore.getState().reset()
      useFocusSound.getState().stop()
    }
  }, [status])

  useEffect(() => syncStatusBar(theme), [theme])

  // Pro colour themes; everyone else (or an expired plan) sees the default.
  useEffect(() => {
    const value = status === 'authenticated' && themesAllowed ? accent : 'default'
    if (value === 'default') delete document.documentElement.dataset.accent
    else document.documentElement.dataset.accent = value
  }, [accent, themesAllowed, status])

  useEffect(() => {
    analytics.page(location.pathname)
  }, [location.pathname])

  useEffect(
    () =>
      registerBackButton(() => {
        if (popBack()) return
        const path = location.pathname
        if (path.startsWith('/friends/')) navigate('/friends')
        else if (path.startsWith('/help/')) navigate('/help')
        else if (path === '/register' || path === '/forgot-password') navigate('/login')
        else if (path !== '/dashboard' && path !== '/login' && path !== '/') navigate(useAuth.getState().status === 'authenticated' ? '/dashboard' : '/login')
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
          <code className="rounded bg-subtle px-1">.env</code> file (see <code>.env.example</code> and SETUP.md), then restart the dev server.
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
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <AppEffects />
        <Routes>
          {/* Public site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/privacy" element={lazyPage(<PrivacyPage />)} />
            <Route path="/terms" element={lazyPage(<TermsPage />)} />
            <Route path="/help" element={lazyPage(<HelpIndexPage />)} />
            <Route path="/help/:slug" element={lazyPage(<HelpArticlePage />)} />
          </Route>
          <Route element={<AdaptiveLayout />}>
            <Route path="/pro" element={lazyPage(<ProPage />)} />
            <Route path="/upgrade" element={<Navigate to="/pro" replace />} />
          </Route>

          {/* Account flows (no ads, no distractions) */}
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* App */}
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/progress" element={lazyPage(<ProgressPage />)} />
            <Route path="/focus" element={<FocusPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:friendId" element={lazyPage(<ComparePage />)} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <UpgradeModal />
        <CookieSettingsModal />
        <ConsentBanner />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
