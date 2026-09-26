import { memo } from 'react'
import { CATEGORY_STYLE } from '../../lib/category'
import type { ISODate } from '../../lib/dates'
import type { Task } from '../../lib/types'
import { dialogs } from '../../store/dialogs'
import { TaskCheck, useTaskDone } from './TaskCheck'

/** Compact task entry used inside desktop timetable cells. */
export const TaskChip = memo(function TaskChip({ task, date }: { task: Task; date: ISODate }) {
  const done = useTaskDone(task.id, date)
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border-l-[3px] py-1 pr-1.5 pl-2 transition-colors ${CATEGORY_STYLE[task.category].bar} ${
        done ? 'bg-success-soft' : 'bg-subtle hover:bg-line/60'
      }`}
    >
      <TaskCheck taskId={task.id} title={task.title} date={date} size="sm" />
      <button
        type="button"
        onClick={() => dialogs.taskOptions(task.id, date)}
        title={task.title}
        className={`min-w-0 flex-1 truncate rounded py-1 text-left text-[13px] leading-tight font-medium ${
          done ? 'text-muted line-through decoration-muted/60' : 'text-ink'
        }`}
      >
        {task.title}
      </button>
    </div>
  )
})

/** Larger, touch-friendly task card used in the mobile day view and Today panel. */
export const TaskCard = memo(function TaskCard({ task, date }: { task: Task; date: ISODate }) {
  const done = useTaskDone(task.id, date)
  return (
    <div
      className={`flex min-h-14 items-center gap-3 rounded-xl border border-l-4 border-line px-3.5 transition-colors ${CATEGORY_STYLE[task.category].bar} ${
        done ? 'bg-success-soft/70' : 'bg-surface'
      }`}
    >
      <TaskCheck taskId={task.id} title={task.title} date={date} />
      <button
        type="button"
        onClick={() => dialogs.taskOptions(task.id, date)}
        className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2 text-left"
      >
        <span className={`truncate text-[15px] font-medium ${done ? 'text-muted line-through decoration-muted/60' : ''}`}>{task.title}</span>
        {task.description && <span className="truncate text-sm text-muted">{task.description}</span>}
      </button>
    </div>
  )
})
