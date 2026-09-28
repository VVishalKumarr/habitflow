import { Download, LogOut, Moon, Sun, Trash2, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Field } from '../components/ui/Field'
import { Spinner } from '../components/ui/Spinner'
import { friendlyError } from '../lib/errors'
import { saveJsonFile } from '../lib/native'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/dates'
import type { Profile } from '../lib/types'
import { useAuth } from '../store/auth'
import { toast } from '../store/ui'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex w-full rounded-xl bg-subtle p-1 sm:w-auto" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors sm:flex-none ${
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

async function exportAll(username: string) {
  const [trackers, slots, tasks, completions, pomodoro] = await Promise.all([
    supabase.from('trackers').select('id, name, created_at, updated_at').order('created_at'),
    supabase.from('time_slots').select('id, tracker_id, start_time, end_time, created_at'),
    supabase.from('tasks').select('id, tracker_id, time_slot_id, day_of_week, title, description, category, created_at, updated_at'),
    (async () => {
      const rows: unknown[] = []
      for (let from = 0; ; from += 1000) {
        const r = await supabase.from('task_completions').select('task_id, completion_date, completed').order('id').range(from, from + 999)
        if (r.error) return r
        rows.push(...r.data)
        if (r.data.length < 1000) return { data: rows, error: null }
      }
    })(),
    supabase
      .from('pomodoro_sessions')
      .select('label, planned_minutes, focus_seconds, completed, session_date, started_at, ended_at')
      .order('ended_at'),
  ])
  for (const r of [trackers, slots, tasks, completions, pomodoro]) if (r.error) throw r.error
  const data = {
    app: 'HabitFlow',
    exported_at: new Date().toISOString(),
    username,
    trackers: (trackers.data ?? []).map((t) => ({
      ...t,
      time_slots: (slots.data ?? []).filter((s) => s.tracker_id === t.id),
      tasks: (tasks.data ?? []).filter((x) => x.tracker_id === t.id),
    })),
    completions: completions.data,
    pomodoro_sessions: pomodoro.data,
  }
  await saveJsonFile(`habitflow-${username}-${todayISO()}.json`, data)
}

export default function SettingsPage() {
  const profile = useAuth((s) => s.profile)!
  const updateProfile = useAuth((s) => s.updateProfile)
  const signOut = useAuth((s) => s.signOut)
  const deleteAccount = useAuth((s) => s.deleteAccount)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [typed, setTyped] = useState('')

  const save = (patch: Partial<Pick<Profile, 'week_start' | 'time_format' | 'theme'>>) =>
    updateProfile(patch)
      .then(() => toast.success('Preferences saved.'))
      .catch((e: Error) => toast.error(e.message))

  const onExport = async () => {
    setExporting(true)
    try {
      await exportAll(profile.username)
      toast.success('Export ready.')
    } catch (e) {
      toast.error(friendlyError(e, 'Export failed.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted">Manage your account and preferences.</p>
      </div>

      <Section title="Account">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-ink uppercase">
            {profile.username.slice(0, 1) || <UserRound />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">Username</p>
            <p className="truncate text-lg font-semibold">{profile.username}</p>
          </div>
          <button type="button" className="btn-secondary" onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <Segmented
            label="Theme"
            value={profile.theme}
            onChange={(theme) => save({ theme })}
            options={[
              { value: 'light', label: 'Light', icon: <Sun className="size-4" aria-hidden="true" /> },
              { value: 'dark', label: 'Dark', icon: <Moon className="size-4" aria-hidden="true" /> },
            ]}
          />
        </Row>
      </Section>

      <Section title="Timetable">
        <Row label="First day of week" hint="Used by the timetable and weekly statistics.">
          <Segmented
            label="First day of week"
            value={profile.week_start}
            onChange={(week_start) => save({ week_start })}
            options={[
              { value: 0, label: 'Sunday' },
              { value: 1, label: 'Monday' },
            ]}
          />
        </Row>
        <Row label="Time format">
          <Segmented
            label="Time format"
            value={profile.time_format}
            onChange={(time_format) => save({ time_format })}
            options={[
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' },
            ]}
          />
        </Row>
      </Section>

      <Section title="Data">
        <Row label="Export data" hint="Download all trackers, tasks, history and focus sessions as JSON.">
          <button type="button" className="btn-secondary" onClick={onExport} disabled={exporting}>
            {exporting ? <Spinner className="size-4" /> : <Download className="size-4" aria-hidden="true" />}
            Export
          </button>
        </Row>
        <div className="border-t border-line pt-5">
          <Row label="Delete account" hint="Permanently deletes your account and all data. This cannot be undone.">
            <button type="button" className="btn border border-danger/40 text-danger hover:bg-danger-soft" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete account
            </button>
          </Row>
        </div>
      </Section>

      <ConfirmModal
        open={confirmDelete}
        title="Delete your account?"
        confirmLabel="Delete forever"
        onClose={() => {
          setConfirmDelete(false)
          setTyped('')
        }}
        onConfirm={async () => {
          if (typed.trim().toLowerCase() !== profile.username) {
            toast.error('Type your username exactly to confirm.')
            return
          }
          try {
            await deleteAccount()
            toast.success('Your account has been deleted.')
          } catch (e) {
            toast.error((e as Error).message)
          }
        }}
        message={
          <div className="space-y-4">
            <p>All trackers, tasks and progress history will be permanently deleted.</p>
            <Field label={`Type “${profile.username}” to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" autoComplete="off" />
          </div>
        }
      />
    </div>
  )
}
