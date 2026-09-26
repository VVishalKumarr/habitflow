import { Flame, Target } from 'lucide-react'
import { DAY_SHORT, dayOfWeek } from '../../lib/dates'
import type { DayStat } from '../../lib/stats'

interface Props {
  completed: number
  scheduled: number
  weekRate: number
  streak: number
  week: DayStat[]
  today: string
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function TodayProgressCard({ completed, scheduled, weekRate, streak, week, today }: Props) {
  const rate = scheduled ? completed / scheduled : 0
  const pct = Math.round(rate * 100)
  const allDone = scheduled > 0 && completed === scheduled

  return (
    <section className="card flex flex-col p-5 sm:p-6" aria-labelledby="today-progress-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="today-progress-title" className="text-sm font-medium text-muted">
            Today’s progress
          </h2>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{pct}%</p>
        </div>
        <p className="rounded-full bg-subtle px-3 py-1 text-sm font-medium tabular-nums">
          {completed} / {scheduled} done
        </p>
      </div>
      <div className="mt-4">
        <ProgressBar value={rate} label="Today’s completion" />
      </div>
      <p className="mt-3 text-sm text-muted">
        {scheduled === 0
          ? 'Nothing scheduled today.'
          : allDone
            ? 'Everything done for today — nice work!'
            : `${scheduled - completed} task${scheduled - completed === 1 ? '' : 's'} left today.`}
      </p>
      <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label="This week by day">
        {week.map((d) => {
          const r = d.scheduled ? d.completed / d.scheduled : 0
          const isToday = d.date === today
          return (
            <li key={d.date} className="flex flex-col items-center gap-1.5">
              <span
                className={`relative flex h-9 w-full max-w-9 items-end overflow-hidden rounded-lg bg-subtle ${isToday ? 'ring-2 ring-brand/40' : ''}`}
                title={`${d.completed} of ${d.scheduled} done`}
              >
                <span className="w-full rounded-lg bg-brand transition-[height] duration-500" style={{ height: `${Math.round(r * 100)}%` }} />
              </span>
              <span className={`text-[11px] font-medium ${isToday ? 'text-brand' : 'text-muted'}`}>
                {DAY_SHORT[dayOfWeek(d.date)].slice(0, 2)}
                <span className="sr-only">
                  : {d.completed} of {d.scheduled} done
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <div className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
          <Target className="size-5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-muted">This week</p>
            <p className="font-semibold tabular-nums">{Math.round(weekRate * 100)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-subtle px-3 py-2.5">
          <Flame className="size-5 shrink-0 text-cat-work" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-muted">Streak</p>
            <p className="font-semibold tabular-nums">
              {streak} day{streak === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
