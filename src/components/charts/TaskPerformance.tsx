import { ChevronRight } from 'lucide-react'
import { CATEGORY_STYLE } from '../../lib/category'
import type { HabitStat } from '../../lib/stats'
import { pct } from './ChartCard'

/** Ranked list of habits by completion rate; each row opens the habit detail. */
export function TaskPerformance({ habits, onSelect }: { habits: HabitStat[]; onSelect: (key: string) => void }) {
  return (
    <ul className="-mx-2 space-y-0.5">
      {habits.map((h) => (
        <li key={h.key}>
          <button
            type="button"
            onClick={() => onSelect(h.key)}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-subtle"
            aria-label={`${h.title}: ${pct(h.rate)} completed, ${h.completedDays} of ${h.scheduledDays} days. View details`}
          >
            <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[10rem_1fr_auto_3.5rem]">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className={`size-2.5 shrink-0 rounded-full ${CATEGORY_STYLE[h.category].dot}`} aria-hidden="true" />
                <span className="truncate text-sm font-medium">{h.title}</span>
              </span>
              <span className="col-span-2 row-start-2 h-2.5 overflow-hidden rounded-full bg-subtle group-hover:bg-line/70 sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden="true">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round(h.rate * 100)}%` }} />
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {pct(h.rate)}
                <span className="ml-1.5 text-xs font-normal text-muted sm:hidden">
                  {h.completedDays}/{h.scheduledDays}
                </span>
              </span>
              <span className="hidden text-right text-xs text-muted tabular-nums sm:block">
                {h.completedDays}/{h.scheduledDays}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
