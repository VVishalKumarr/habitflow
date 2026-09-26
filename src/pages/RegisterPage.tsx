import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, validatePassword, validateUsername } from '../lib/auth'
import { useAuth } from '../store/auth'
import { AuthLayout } from './AuthLayout'

type Errors = { username?: string; password?: string; confirm?: string }

export default function RegisterPage() {
  const signUp = useAuth((s) => s.signUp)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const validate = (): Errors => {
    const next: Errors = {}
    const u = validateUsername(username)
    const p = validatePassword(password)
    if (u) next.username = u
    if (p) next.password = p
    if (!confirm) next.confirm = 'Please confirm your password.'
    else if (confirm !== password) next.confirm = 'Passwords do not match.'
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
    } catch (err) {
      const message = (err as Error).message
      if (/username/i.test(message)) setErrors({ username: message })
      else setFormError(message)
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Just a username and a password — nothing else.">
      <form onSubmit={submit} noValidate className="space-y-5">
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
        />
        <Field
          label="Confirm password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        <button type="submit" className="btn-primary h-11 w-full text-[15px]" disabled={busy}>
          {busy && <Spinner className="size-4" />}
          {busy ? 'Creating account…' : 'Create account'}
        </button>
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
