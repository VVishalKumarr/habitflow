import { AlertTriangle, Check, ChartNoAxesCombined, Clock, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { EmptyState } from '../components/ui/EmptyState'
import { Field } from '../components/ui/Field'
import { Skeleton, Spinner } from '../components/ui/Spinner'
import { normalizeUsername, validateUsername } from '../lib/auth'
import type { Friend } from '../lib/types'
import { useAuth } from '../store/auth'
import { useFriends } from '../store/friends'
import { toast } from '../store/ui'

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink uppercase" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  )
}

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        {title}
        {count ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">{count}</span> : null}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function AddFriend() {
  const send = useFriends((s) => s.send)
  const me = useAuth((s) => s.profile?.username)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const invalid = validateUsername(username)
    if (invalid) return setError(invalid)
    if (normalizeUsername(username) === me) return setError('That’s you! Enter a friend’s username.')
    setError(null)
    setBusy(true)
    try {
      const result = await send(normalizeUsername(username))
      toast.success(result === 'accepted' ? `You and ${normalizeUsername(username)} are now friends.` : 'Friend request sent.')
      setUsername('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Add a friend">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <div className="flex-1">
          <Field
            label="Friend’s username"
            placeholder="e.g. alex_22"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={error}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="btn-primary sm:mt-[1.625rem] sm:h-11" disabled={busy}>
          {busy ? <Spinner className="size-4" /> : <UserPlus className="size-4" aria-hidden="true" />}
          Send request
        </button>
      </form>
    </Section>
  )
}

function Row({ friend, children, detail }: { friend: Friend; children: ReactNode; detail?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={friend.username} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{friend.username}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  )
}

export default function FriendsPage() {
  const navigate = useNavigate()
  const status = useFriends((s) => s.status)
  const error = useFriends((s) => s.error)
  const all = useFriends((s) => s.friends)
  const load = useFriends((s) => s.load)
  const respond = useFriends((s) => s.respond)
  const remove = useFriends((s) => s.remove)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [unfriend, setUnfriend] = useState<Friend | null>(null)

  useEffect(() => {
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const friends = all.filter((f) => f.status === 'accepted')
  const incoming = all.filter((f) => f.status === 'pending' && f.incoming)
  const outgoing = all.filter((f) => f.status === 'pending' && !f.incoming)

  const act = async (id: string, fn: () => Promise<void>, done: string) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(done)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Friends</h1>
        <p className="mt-1 text-muted">Add friends by username and compare your Pomodoro and timetable progress.</p>
      </div>

      <AddFriend />

      {status === 'error' && all.length === 0 ? (
        <div className="card">
          <EmptyState icon={AlertTriangle} title="Couldn’t load friends" message={error ?? ''} action={<button type="button" className="btn-secondary" onClick={load}>Try again</button>} />
        </div>
      ) : status !== 'ready' && all.length === 0 ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          {incoming.length > 0 && (
            <Section title="Friend requests" count={incoming.length}>
              <ul className="divide-y divide-line">
                {incoming.map((f) => (
                  <Row key={f.id} friend={f} detail="Wants to be your friend">
                    <button type="button" className="btn-primary" disabled={busyId === f.id} onClick={() => act(f.id, () => respond(f.id, true), `You and ${f.username} are now friends.`)}>
                      <Check className="size-4" aria-hidden="true" />
                      Accept
                    </button>
                    <button type="button" className="btn-secondary" disabled={busyId === f.id} onClick={() => act(f.id, () => respond(f.id, false), 'Request declined.')}>
                      <X className="size-4" aria-hidden="true" />
                      Decline
                    </button>
                  </Row>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Your friends" count={friends.length}>
            {friends.length === 0 ? (
              <EmptyState icon={Users} title="No friends yet" message="Send a request with their username. Once they accept, you can compare progress." className="py-6" />
            ) : (
              <ul className="divide-y divide-line">
                {friends.map((f) => (
                  <Row key={f.id} friend={f}>
                    <button type="button" className="btn-primary" onClick={() => navigate(`/friends/${f.friend_id}`)}>
                      <ChartNoAxesCombined className="size-4" aria-hidden="true" />
                      Compare
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setUnfriend(f)} aria-label={`Remove ${f.username}`}>
                      <UserMinus className="size-[18px]" aria-hidden="true" />
                    </button>
                  </Row>
                ))}
              </ul>
            )}
          </Section>

          {outgoing.length > 0 && (
            <Section title="Sent requests" count={outgoing.length}>
              <ul className="divide-y divide-line">
                {outgoing.map((f) => (
                  <Row key={f.id} friend={f} detail="Waiting for them to accept">
                    <Clock className="hidden size-4 self-center text-muted sm:block" aria-hidden="true" />
                    <button type="button" className="btn-secondary" disabled={busyId === f.id} onClick={() => act(f.id, () => remove(f.id), 'Request cancelled.')}>
                      Cancel
                    </button>
                  </Row>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      <ConfirmModal
        open={unfriend !== null}
        title={`Remove ${unfriend?.username ?? ''}?`}
        message="You won’t be able to compare progress until one of you sends a new request."
        confirmLabel="Remove"
        onClose={() => setUnfriend(null)}
        onConfirm={async () => {
          if (!unfriend) return
          try {
            await remove(unfriend.id)
            toast.success(`${unfriend.username} removed.`)
            setUnfriend(null)
          } catch (e) {
            toast.error((e as Error).message)
          }
        }}
      />
    </div>
  )
}
