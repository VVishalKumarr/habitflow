import { DAY_NAMES } from '../../lib/dates'
import { formatSlot } from '../../lib/time'
import { useDialogs } from '../../store/dialogs'
import { useTrackerData } from '../../store/trackerData'
import { useTrackers } from '../../store/trackers'
import { toast } from '../../store/ui'
import { usePrefs } from '../../store/view'
import { ConfirmModal } from '../ui/ConfirmModal'
import { TaskFormModal } from './TaskFormModal'
import { TaskOptionsModal } from './TaskOptionsModal'
import { TimeSlotModal } from './TimeSlotModal'
import { TrackerFormModal } from './TrackerFormModal'

/** Renders whichever dialog is open; lives once in the authenticated shell. */
export function DialogHost() {
  const dialog = useDialogs((s) => s.dialog)
  const close = useDialogs((s) => s.close)
  const { timeFormat } = usePrefs()
  const tasks = useTrackerData((s) => s.tasks)
  const deleteTask = useTrackerData((s) => s.deleteTask)
  const deleteSlot = useTrackerData((s) => s.deleteSlot)
  const trackers = useTrackers((s) => s.trackers)
  const removeTracker = useTrackers((s) => s.remove)

  const run = async (fn: () => Promise<void>, success: string) => {
    try {
      await fn()
      toast.success(success)
      close()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  switch (dialog.kind) {
    case 'none':
      return null
    case 'taskForm':
      return <TaskFormModal key={JSON.stringify(dialog.form)} form={dialog.form} onClose={close} />
    case 'taskOptions':
      return <TaskOptionsModal taskId={dialog.taskId} date={dialog.date} onClose={close} />
    case 'slotForm':
      return <TimeSlotModal slot={dialog.slot} onClose={close} />
    case 'trackerForm':
      return <TrackerFormModal trackerId={dialog.trackerId} onClose={close} />
    case 'deleteTask': {
      const task = tasks.find((t) => t.id === dialog.taskId)
      return (
        <ConfirmModal
          open
          title="Delete task?"
          message={
            <>
              “{task?.title}” will be removed from every {task ? DAY_NAMES[task.day_of_week] : ''}, along with its completion
              history.
            </>
          }
          confirmLabel="Delete task"
          onConfirm={() => run(() => deleteTask(dialog.taskId), 'Task deleted.')}
          onClose={close}
        />
      )
    }
    case 'deleteSlot': {
      const count = tasks.filter((t) => t.time_slot_id === dialog.slot.id).length
      return (
        <ConfirmModal
          open
          title="Delete time slot?"
          message={
            <>
              The {formatSlot(dialog.slot, timeFormat)} row will be removed
              {count > 0 ? ` together with its ${count} task${count > 1 ? 's' : ''} and their history` : ''}.
            </>
          }
          confirmLabel="Delete slot"
          onConfirm={() => run(() => deleteSlot(dialog.slot.id), 'Time slot deleted.')}
          onClose={close}
        />
      )
    }
    case 'deleteTracker': {
      const tracker = trackers.find((t) => t.id === dialog.trackerId)
      return (
        <ConfirmModal
          open
          title="Delete tracker?"
          message={
            <>
              Are you sure you want to delete <strong className="text-ink">“{tracker?.name}”</strong>? All tasks and progress data for
              this tracker will be deleted.
            </>
          }
          confirmLabel="Delete tracker"
          onConfirm={() => run(() => removeTracker(dialog.trackerId), 'Tracker deleted.')}
          onClose={close}
        />
      )
    }
  }
}
