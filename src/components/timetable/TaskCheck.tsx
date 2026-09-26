import { Check } from 'lucide-react'
import { memo } from 'react'
import type { ISODate } from '../../lib/dates'
import { completionKey } from '../../lib/types'
import { useTrackerData } from '../../store/trackerData'
import { toast } from '../../store/ui'

interface TaskCheckProps {
  taskId: string
  title: string
  date: ISODate
  size?: 'sm' | 'md'
}

/**
 * Round checkbox bound to one (task, date) completion. It subscribes to just
 * its own key, so ticking re-renders only this control (and its label).
 */
export const TaskCheck = memo(function TaskCheck({ taskId, title, date, size = 'md' }: TaskCheckProps) {
  const done = useTaskDone(taskId, date)
  const setCompleted = useTrackerData((s) => s.setCompleted)
  const dim = size === 'sm' ? 'size-5' : 'size-6'

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`${title}: ${done ? 'completed' : 'not completed'}`}
      onClick={(e) => {
        e.stopPropagation()
        setCompleted(taskId, date, !done).catch((err: Error) => toast.error(err.message))
      }}
      // Generous hit area around a small visual circle.
      className={`group/check -m-2 flex shrink-0 items-center justify-center rounded-full p-2`}
    >
      <span
        className={`${dim} flex items-center justify-center rounded-full border-2 transition-all duration-150 ${
          done ? 'border-success bg-success text-white' : 'border-muted/50 text-transparent group-hover/check:border-success'
        }`}
      >
        <Check className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={3.5} aria-hidden="true" />
      </span>
    </button>
  )
})

export function useTaskDone(taskId: string, date: ISODate): boolean {
  return useTrackerData((s) => s.completions[completionKey(taskId, date)] === true)
}
