import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../components/ui/Spinner'
import { friendlyError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { useAuth } from '../store/auth'
import { AuthLayout } from './AuthLayout'

/** Opened from the confirmation email: /verify-email?token=… (works signed in or out). */
export default function VerifyEmailPage() {
  const signedIn = useAuth((s) => s.status === 'authenticated')
  const [state, setState] = useState<{ kind: 'busy' } | { kind: 'ok'; email: string } | { kind: 'error'; message: string }>({ kind: 'busy' })
  const once = useRef(false)

  useEffect(() => {
    if (once.current) return
    once.current = true
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    window.history.replaceState(null, '', window.location.pathname)
    supabase
      .rpc('confirm_recovery_email', { p_token: token })
      .then(({ data, error }) =>
        setState(error ? { kind: 'error', message: friendlyError(error) } : { kind: 'ok', email: String(data) }),
      )
  }, [])

  const next = signedIn ? (
    <Link to="/settings" className="btn-primary h-11 w-full">
      Go to Settings
    </Link>
  ) : (
    <Link to="/login" className="btn-primary h-11 w-full">
      Back to login
    </Link>
  )

  if (state.kind === 'busy') {
    return (
      <AuthLayout title="Confirming email" subtitle="One moment…">
        <div className="flex justify-center py-6 text-muted" role="status">
          <Spinner />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={state.kind === 'ok' ? 'Email confirmed' : 'Couldn’t confirm email'}
      subtitle={state.kind === 'ok' ? 'You can now reset your password with this email if you ever forget it.' : 'The link may have expired or already been used.'}
    >
      <div
        role="status"
        className={`mb-6 flex items-start gap-3 rounded-xl px-4 py-3.5 text-[15px] ${state.kind === 'ok' ? 'bg-success-soft' : 'bg-danger-soft text-danger'}`}
      >
        {state.kind === 'ok' ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        )}
        <p className="min-w-0 break-words">
          {state.kind === 'ok' ? `${state.email} is now your recovery email.` : `${state.message} You can send a new link from Settings → Account.`}
        </p>
      </div>
      {next}
    </AuthLayout>
  )
}
