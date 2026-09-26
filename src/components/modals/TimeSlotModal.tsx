import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toInputTime, toMinutes, validateSlot } from '../../lib/time'
import type { TimeSlot } from '../../lib/types'
import { useDialogs } from '../../store/dialogs'
import { useTrackerData } from '../../store/trackerData'
import { toast } from '../../store/ui'
import { usePrefs } from '../../store/view'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

const pad = (n: number) => String(n).padStart(2, '0')
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

/** Suggest the next free hour after the last slot. */
function suggest(slots: TimeSlot[]): [string, string] {
  if (slots.length === 0) return ['17:00', '18:00']
  const lastEnd = Math.max(...slots.map((s) => toMinutes(s.end_time)))
  if (lastEnd >= 23 * 60) return ['', '']
  return [fromMinutes(lastEnd), fromMinutes(Math.min(lastEnd + 60, 23 * 60 + 59))]
}

export function TimeSlotModal({ slot, onClose }: { slot: TimeSlot | null; onClose: () => void }) {
  const slots = useTrackerData((s) => s.slots)
  const taskCount = useTrackerData((s) => (slot ? s.tasks.filter((t) => t.time_slot_id === slot.id).length : 0))
  const addSlot = useTrackerData((s) => s.addSlot)
  const updateSlot = useTrackerData((s) => s.updateSlot)
  const openDialog = useDialogs((s) => s.open)
  const { timeFormat } = usePrefs()

  const [initialStart, initialEnd] = slot ? [toInputTime(slot.start_time), toInputTime(slot.end_time)] : suggest(slots)
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const err = validateSlot(start, end, slots, slot?.id, timeFormat)
    setError(err)
    if (err) return
    setBusy(true)
    try {
      if (slot) {
        await updateSlot(slot.id, start, end)
        toast.success('Time slot updated.')
      } else {
        await addSlot(start, end)
        toast.success('Time slot added.')
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
      title={slot ? 'Edit time slot' : 'Add time slot'}
      subtitle="Slots can be any length — they become rows in your timetable."
      footer={
        <>
          {slot && (
            <button
              type="button"
              className="btn-ghost text-danger hover:bg-danger-soft hover:text-danger sm:mr-auto"
              onClick={() => openDialog({ kind: 'deleteSlot', slot })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete slot{taskCount ? ` (${taskCount} task${taskCount > 1 ? 's' : ''})` : ''}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="slot-form" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="size-4" />}
            {slot ? 'Save changes' : 'Add time slot'}
          </button>
        </>
      }
    >
      <form id="slot-form" onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="slot-start" className="field-label">
              Start
            </label>
            <input
              id="slot-start"
              type="time"
              className="input"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-invalid={error ? true : undefined}
              required
            />
          </div>
          <div>
            <label htmlFor="slot-end" className="field-label">
              End
            </label>
            <input
              id="slot-end"
              type="time"
              className="input"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-invalid={error ? true : undefined}
              required
            />
          </div>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
