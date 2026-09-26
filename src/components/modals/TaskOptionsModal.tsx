import { CheckCircle2, Circle, Copy, Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CATEGORY_STYLE } from '../../lib/category'
import { formatDate, type ISODate } from '../../lib/dates'
import { formatSlot } from '../../lib/time'
import { completionKey } from '../../lib/types'
import { useDialogs } from '../../store/dialogs'
import { useTrackerData } from '../../store/trackerData'
import { toast } from '../../store/ui'
import { usePrefs } from '../../store/view'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

function Action({ icon, label, onClick, danger, busy }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium transition-colors ${
        danger ? 'text-danger hover:bg-danger-soft' : 'hover:bg-subtle'
      }`}
    >
      <span className="flex size-5 items-center justify-center [&_svg]:size-5">{busy ? <Spinner /> : icon}</span>
      {label}
    </button>
  )
}

export function TaskOptionsModal({ taskId, date, onClose }: { taskId: string; date: ISODate; onClose: () => void }) {
  const task = useTrackerData((s) => s.tasks.find((t) => t.id === taskId))
  const slot = useTrackerData((s) => s.slots.find((x) => x.id === task?.time_slot_id))
  const done = useTrackerData((s) => s.completions[completionKey(taskId, date)] === true)
  const setCompleted = useTrackerData((s) => s.setCompleted)
  const openDialog = useDialogs((s) => s.open)
  const { timeFormat } = usePrefs()
  const [busy, setBusy] = useState(false)

  if (!task) return null

  const toggle = async () => {
    setBusy(true)
    try {
      await setCompleted(task.id, date, !done)
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={task.title}
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          {slot && <span>· {formatSlot(slot, timeFormat)}</span>}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-muted">
          <span className={`size-2 rounded-full ${CATEGORY_STYLE[task.category].dot}`} aria-hidden="true" />
          {CATEGORY_STYLE[task.category].label}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
            done ? 'bg-success-soft text-success' : 'bg-subtle text-muted'
          }`}
        >
          {done ? 'Completed' : 'Not completed'}
        </span>
      </div>
      {task.description && <p className="mb-4 text-sm leading-relaxed whitespace-pre-line text-muted">{task.description}</p>}

      <div className="-mx-2 space-y-0.5">
        <Action
          icon={done ? <Circle /> : <CheckCircle2 className="text-success" />}
          label={done ? 'Mark incomplete' : 'Mark complete'}
          onClick={toggle}
          busy={busy}
        />
        <Action icon={<Pencil />} label="Edit or move task" onClick={() => openDialog({ kind: 'taskForm', form: { mode: 'edit', taskId } })} />
        <Action icon={<Copy />} label="Duplicate to another day" onClick={() => openDialog({ kind: 'taskForm', form: { mode: 'duplicate', taskId } })} />
        <Action icon={<Trash2 />} label="Delete task" danger onClick={() => openDialog({ kind: 'deleteTask', taskId })} />
      </div>
    </Modal>
  )
}
