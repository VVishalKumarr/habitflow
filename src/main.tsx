import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { analytics } from './lib/analytics'
import { initMonitoring, reportError } from './lib/monitoring'
import { applyTheme, storedTheme } from './store/auth'

// Apply the last-used theme before first paint to avoid a flash.
applyTheme(storedTheme())

// Old links used hash routes (…/#/dashboard); move them to real paths.
if (window.location.hash.startsWith('#/')) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.replaceState(null, '', `${base}${window.location.hash.slice(1)}`)
}

initMonitoring()
analytics.init()
window.addEventListener('unhandledrejection', (e) => reportError(e.reason, { area: 'promise' }))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
