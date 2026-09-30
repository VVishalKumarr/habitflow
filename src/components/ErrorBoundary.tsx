import { AlertTriangle } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { reportError } from '../lib/monitoring'

interface State {
  failed: boolean
}

/** Catches rendering crashes, reports them (scrubbed) and offers a reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error, { area: 'render' })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="card max-w-md p-6 text-center" role="alert">
          <AlertTriangle className="mx-auto size-8 text-danger" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
          <p className="mt-1 text-sm text-muted">Your data is safe. Reloading usually fixes this.</p>
          <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
