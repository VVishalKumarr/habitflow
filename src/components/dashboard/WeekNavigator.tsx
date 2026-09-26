import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange, type ISODate } from '../../lib/dates'
import { useView } from '../../store/view'

export function WeekNavigator({ weekStartDate, isCurrentWeek }: { weekStartDate: ISODate; isCurrentWeek: boolean }) {
  const shiftWeek = useView((s) => s.shiftWeek)
  const goToday = useView((s) => s.goToday)

  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-surface sm:flex-none">
        <button type="button" className="icon-btn rounded-r-none" onClick={() => shiftWeek(-1)} aria-label="Previous week">
          <ChevronLeft className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate px-1 text-center text-sm font-semibold sm:w-56 sm:flex-none" aria-live="polite">
          {formatWeekRange(weekStartDate)}
        </p>
        <button type="button" className="icon-btn rounded-l-none" onClick={() => shiftWeek(1)} aria-label="Next week">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <button type="button" className="btn-secondary h-10 px-3.5" onClick={goToday} disabled={isCurrentWeek}>
        Today
      </button>
    </div>
  )
}
