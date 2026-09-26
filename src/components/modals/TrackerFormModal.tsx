import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrackers, validateTrackerName } from '../../store/trackers'
import { toast } from '../../store/ui'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

const SUGGESTIONS = ['Home Routine', 'Exam Schedule', 'Gym Routine', 'Work Schedule', 'Vacation Routine']

/** Create a tracker (trackerId = null) or rename an existing one. */
export function TrackerFormModal({ trackerId, onClose }: { trackerId: string | null; onClose: () => void }) {
  const tracker = useTrackers((s) => s.trackers.find((t) => t.id === trackerId))
  const create = useTrackers((s) => s.create)
  const rename = useTrackers((s) => s.rename)
  const navigate = useNavigate()
  const [name, setName] = useState(tracker?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isRename = Boolean(trackerId)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const err = validateTrackerName(name)
    setError(err)
    if (err) return
    setBusy(true)
    try {
      if (isRename && trackerId) {
        await rename(trackerId, name)
        toast.success('Tracker renamed.')
      } else {
        await create(name)
        toast.success(`“${name.trim()}” created.`)
        navigate('/dashboard')
      }
      onClose()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isRename ? 'Rename tracker' : 'Create a new tracker'}
      subtitle={isRename ? undefined : 'Each tracker has its own timetable, tasks and statistics.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="tracker-form" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="size-4" />}
            {isRename ? 'Save name' : 'Create tracker'}
          </button>
        </>
      }
    >
      <form id="tracker-form" onSubmit={submit} noValidate className="space-y-4">
        <Field
          label={isRename ? 'New name' : 'Tracker name'}
          placeholder="e.g. Home Routine"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
        {!isRename && (
          <div className="flex flex-wrap gap-2" aria-label="Suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="h-9 rounded-full border border-line px-3.5 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </form>
    </Modal>
  )
}
