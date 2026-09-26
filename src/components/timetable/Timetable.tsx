import { Pencil, Plus } from 'lucide-react'
import { memo } from 'react'
import { DAY_NAMES, DAY_SHORT, dayOfWeek, parseISODate, type ISODate } from '../../lib/dates'
import { formatTime } from '../../lib/time'
import type { Task, TimeFormat, TimeSlot } from '../../lib/types'
import { dialogs } from '../../store/dialogs'
import { TaskChip } from './TaskChip'
import { cellKey, useCellMap } from './useCellMap'

interface TimetableProps {
  slots: TimeSlot[]
  dates: ISODate[]
  today: ISODate
  timeFormat: TimeFormat
}

const EMPTY: Task[] = []

const Cell = memo(function Cell({ slot, date, tasks, label }: { slot: TimeSlot; date: ISODate; tasks: Task[]; label: string }) {
  const day = dayOfWeek(date)
  if (tasks.length === 0) {
    return (
      <button
        type="button"
        onClick={() => dialogs.addTask(slot.id, day)}
        aria-label={`Add task on ${label}`}
        className="group flex h-full min-h-14 w-full items-center justify-center rounded-lg text-muted/40 transition-colors hover:bg-brand-soft hover:text-brand focus-visible:bg-brand-soft focus-visible:text-brand"
      >
        <Plus className="size-4 transition-transform group-hover:scale-110" aria-hidden="true" />
      </button>
    )
  }
  return (
    <div className="group/cell flex h-full flex-col gap-1">
      {tasks.map((t) => (
        <TaskChip key={t.id} task={t} date={date} />
      ))}
      <button
        type="button"
        onClick={() => dialogs.addTask(slot.id, day)}
        aria-label={`Add another task on ${label}`}
        className="flex h-6 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover/cell:opacity-100 hover:bg-subtle hover:text-brand focus-visible:opacity-100"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
})

/** Desktop weekly grid: time slots down, days across. */
export function Timetable({ slots, dates, today, timeFormat }: TimetableProps) {
  const cells = useCellMap()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] table-fixed border-separate border-spacing-0">
        <caption className="sr-only">Weekly timetable</caption>
        <colgroup>
          <col className="w-[128px]" />
          {dates.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="border-b border-line px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted uppercase">
              Time
            </th>
            {dates.map((d) => {
              const isToday = d === today
              const date = parseISODate(d)
              return (
                <th key={d} scope="col" className="border-b border-line px-1.5 py-2.5">
                  <div
                    className={`mx-auto flex w-fit flex-col items-center rounded-xl px-3 py-1 ${isToday ? 'bg-brand text-white' : ''}`}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <span className={`text-xs font-semibold tracking-wide uppercase ${isToday ? 'text-white/85' : 'text-muted'}`}>
                      {DAY_SHORT[date.getDay()]}
                    </span>
                    <span className="text-base leading-tight font-semibold">{date.getDate()}</span>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, i) => (
            <tr key={slot.id}>
              <th
                scope="row"
                className={`group px-4 py-2 text-left align-top font-normal ${i < slots.length - 1 ? 'border-b border-line' : ''}`}
              >
                <div className="flex items-start justify-between gap-1 pt-1">
                  <div className="text-sm leading-tight">
                    <div className="font-semibold">{formatTime(slot.start_time, timeFormat)}</div>
                    <div className="text-muted">{formatTime(slot.end_time, timeFormat)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dialogs.editSlot(slot)}
                    className="-mt-1 -mr-2 flex size-8 items-center justify-center rounded-lg text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-subtle hover:text-ink focus-visible:opacity-100"
                    aria-label={`Edit time slot ${formatTime(slot.start_time, timeFormat)} to ${formatTime(slot.end_time, timeFormat)}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </th>
              {dates.map((d) => {
                const day = dayOfWeek(d)
                return (
                  <td
                    key={d}
                    className={`p-1.5 align-top ${i < slots.length - 1 ? 'border-b border-line' : ''} ${d === today ? 'bg-brand-soft/35' : ''}`}
                  >
                    <Cell
                      slot={slot}
                      date={d}
                      tasks={cells.get(cellKey(slot.id, day)) ?? EMPTY}
                      label={`${DAY_NAMES[day]} ${formatTime(slot.start_time, timeFormat)}`}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
