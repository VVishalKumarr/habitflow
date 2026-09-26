import { Plus } from 'lucide-react'
import { useRef } from 'react'
import { DAY_NAMES, DAY_SHORT, addDays, dayOfWeek, formatDate, parseISODate, type ISODate } from '../../lib/dates'
import { formatSlot } from '../../lib/time'
import type { TimeFormat, TimeSlot } from '../../lib/types'
import { dialogs } from '../../store/dialogs'
import { useView } from '../../store/view'
import { TaskCard } from './TaskChip'
import { cellKey, useCellMap } from './useCellMap'

export function MobileDaySelector({ dates, selected, today }: { dates: ISODate[]; selected: ISODate; today: ISODate }) {
  const setDate = useView((s) => s.setDate)
  return (
    <div role="tablist" aria-label="Day of week" className="grid grid-cols-7 gap-1">
      {dates.map((d) => {
        const isSel = d === selected
        const isToday = d === today
        const date = parseISODate(d)
        return (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={isSel}
            aria-label={`${DAY_NAMES[date.getDay()]} ${formatDate(d, { month: 'long', day: 'numeric' })}${isToday ? ', today' : ''}`}
            onClick={() => setDate(d)}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-sm transition-colors ${
              isSel ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-subtle'
            }`}
          >
            <span className={`text-[11px] font-semibold tracking-wide uppercase ${isSel ? 'text-white/85' : ''}`}>{DAY_SHORT[date.getDay()]}</span>
            <span className={`text-base leading-none font-semibold ${isSel ? '' : 'text-ink'}`}>{date.getDate()}</span>
            <span className={`size-1.5 rounded-full ${isToday ? (isSel ? 'bg-white' : 'bg-brand') : 'bg-transparent'}`} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

/** Phone / tablet timetable: one day at a time, swipe left/right to change day. */
export function MobileDayView({ slots, date, timeFormat }: { slots: TimeSlot[]; date: ISODate; timeFormat: TimeFormat }) {
  const cells = useCellMap()
  const setDate = useView((s) => s.setDate)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const day = dayOfWeek(date)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setDate(addDays(date, dx < 0 ? 1 : -1))
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-40">
      <h3 className="sr-only">{DAY_NAMES[day]}</h3>
      <ol className="space-y-5">
        {slots.map((slot) => {
          const tasks = cells.get(cellKey(slot.id, day)) ?? []
          return (
            <li key={slot.id}>
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => dialogs.editSlot(slot)}
                  className="-mx-1 rounded-md px-1 text-sm font-semibold text-muted hover:text-ink"
                  aria-label={`Edit time slot ${formatSlot(slot, timeFormat)}`}
                >
                  {formatSlot(slot, timeFormat)}
                </button>
                {tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => dialogs.addTask(slot.id, day)}
                    className="-mr-2 flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-brand hover:bg-brand-soft"
                  >
                    <Plus className="size-4" aria-hidden="true" /> Add
                  </button>
                )}
              </div>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <TaskCard key={t.id} task={t} date={date} />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => dialogs.addTask(slot.id, day)}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-medium text-muted transition-colors hover:border-brand hover:bg-brand-soft/50 hover:text-brand"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add task
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
