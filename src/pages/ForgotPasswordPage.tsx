import { AlertCircle, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { callFunction } from '../lib/functions'
import { AuthLayout } from './AuthLayout'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return setError('Enter your username or recovery email.')
    setError(null)
    setBusy(true)
    try {
      const res = await callFunction<{ message: string }>('password-reset', { identifier: identifier.trim() })
      setSent(res.message)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We’ll email a reset link to your confirmed recovery email.">
      {sent ? (
        <div className="space-y-6">
          <div role="status" className="flex items-start gap-3 rounded-xl bg-success-soft px-4 py-3.5 text-[15px]">
            <MailCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <p>{sent}</p>
          </div>
          <p className="text-sm text-muted">
            No email? Check your spam folder. If your account has no recovery email, the password can’t be reset — you can create a new account instead.
          </p>
          <Link to="/login" className="btn-secondary h-11 w-full">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          <Field
            label="Username or Email"
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <button type="submit" className="btn-primary h-11 w-full text-[15px]" disabled={busy}>
            {busy && <Spinner className="size-4" />}
            Send Password Reset Link
          </button>
          <p className="text-center text-sm text-muted">
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-brand hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
