import { AlertCircle, Info } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { analytics } from '../lib/analytics'
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, validatePassword, validateUsername } from '../lib/auth'
import { callFunction } from '../lib/functions'
import { useAuth } from '../store/auth'
import { toast } from '../store/ui'
import { AuthLayout } from './AuthLayout'

type Errors = { username?: string; password?: string; confirm?: string; email?: string }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function RegisterPage() {
  const signUp = useAuth((s) => s.signUp)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  const onStart = () => {
    if (started.current) return
    started.current = true
    analytics.track('signup_started')
  }

  const validate = (): Errors => {
    const next: Errors = {}
    const u = validateUsername(username)
    const p = validatePassword(password)
    if (u) next.username = u
    if (p) next.password = p
    if (!confirm) next.confirm = 'Please confirm your password.'
    else if (confirm !== password) next.confirm = 'Passwords do not match.'
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address, or leave it empty.'
    return next
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await signUp(username, password)
      analytics.track('signup_completed', { source: email.trim() ? 'with_email' : 'no_email' })
    } catch (err) {
      const message = (err as Error).message
      if (/username/i.test(message)) setErrors({ username: message })
      else setFormError(message)
      setBusy(false)
      return
    }
    // The account exists now; the recovery email is a separate, optional step.
    if (email.trim()) {
      callFunction('account-email', { email: email.trim(), password })
        .then(() => toast.success(`Check ${email.trim()} for a link to confirm your recovery email.`))
        .catch((err: Error) =>
          toast.info(`Your account is ready, but the recovery email wasn’t set: ${err.message} You can add it later in Settings.`),
        )
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="A username and a password is all you need.">
      <form onSubmit={submit} onFocus={onStart} noValidate className="space-y-5">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {formError}
          </div>
        )}
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={USERNAME_MAX}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          hint={`${USERNAME_MIN}–${USERNAME_MAX} characters: letters, numbers, . _ -`}
          required
        />
        <Field
          label="Password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters.`}
          required
        />
        <Field
          label="Confirm password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          required
        />
        <div>
          <Field
            label="Email (optional)"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            If you don't add an email, password recovery will not be available unless you add one later.
          </p>
        </div>
        <button type="submit" className="btn-primary h-11 w-full text-[15px]" disabled={busy}>
          {busy && <Spinner className="size-4" />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-muted">
          By creating an account you agree to the{' '}
          <Link to="/terms" className="underline hover:text-ink">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
