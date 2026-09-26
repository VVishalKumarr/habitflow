import { CalendarCheck2 } from 'lucide-react'
import { DAY_NAMES, dayOfWeek, formatDate, type ISODate } from '../../lib/dates'
import { formatSlot } from '../../lib/time'
import type { TimeFormat, TimeSlot } from '../../lib/types'
import { TaskCard } from '../timetable/TaskChip'
import { cellKey, useCellMap } from '../timetable/useCellMap'

/** Today's tasks grouped by time — the fastest place to tick things off. */
export function TodayPanel({ slots, today, timeFormat }: { slots: TimeSlot[]; today: ISODate; timeFormat: TimeFormat }) {
  const cells = useCellMap()
  const day = dayOfWeek(today)
  const groups = slots.map((s) => ({ slot: s, tasks: cells.get(cellKey(s.id, day)) ?? [] })).filter((g) => g.tasks.length > 0)

  return (
    <section className="card flex min-h-0 flex-col p-5 sm:p-6" aria-labelledby="today-title">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="today-title" className="text-sm font-semibold tracking-wide uppercase">
          Today — {DAY_NAMES[day]}
        </h2>
        <span className="text-sm text-muted">{formatDate(today, { month: 'short', day: 'numeric' })}</span>
      </div>
      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-muted">
          <CalendarCheck2 className="mb-2 size-8 text-muted/50" aria-hidden="true" />
          No tasks scheduled for today.
        </div>
      ) : (
        <ol className="mt-4 max-h-[340px] space-y-4 overflow-y-auto pr-1">
          {groups.map(({ slot, tasks }) => (
            <li key={slot.id}>
              <p className="mb-1.5 text-xs font-semibold text-muted">{formatSlot(slot, timeFormat)}</p>
              <div className="space-y-2">
                {tasks.map((t) => (
                  <TaskCard key={t.id} task={t} date={today} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
