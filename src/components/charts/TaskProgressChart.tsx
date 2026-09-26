import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../../lib/dates'
import type { HabitStat } from '../../lib/stats'
import { SrTable, TooltipBox, pct } from './ChartCard'

/** Running completion rate for one habit + a strip of its most recent scheduled days. */
export function TaskProgressChart({ habit }: { habit: HabitStat }) {
  let done = 0
  const data = habit.history.map((h, i) => {
    if (h.done) done++
    return { date: h.date, done: h.done, rate: done / (i + 1) }
  })
  const recent = habit.history.slice(-28)

  if (data.length === 0) {
    return <p className="rounded-xl bg-subtle px-4 py-6 text-center text-sm text-muted">No scheduled days yet — history appears once this task’s day comes around.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-medium">Recent days</p>
        <ol className="flex flex-wrap gap-1.5" aria-label="Recent scheduled days">
          {recent.map((h) => (
            <li
              key={h.date}
              title={`${formatDate(h.date, { weekday: 'short', month: 'short', day: 'numeric' })}: ${h.done ? 'done' : 'missed'}`}
              className={`size-6 rounded-md ${h.done ? 'bg-success' : 'border border-line bg-subtle'}`}
            >
              <span className="sr-only">
                {formatDate(h.date, { month: 'short', day: 'numeric' })}: {h.done ? 'done' : 'missed'}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Completion rate over time</p>
        <div className="h-52 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={(d: string) => formatDate(d, { month: 'short', day: 'numeric' })}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
              />
              <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} tickFormatter={pct} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
              <Tooltip
                cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof data)[number]
                  return (
                    <TooltipBox
                      title={formatDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                      lines={[
                        { label: 'That day', value: d.done ? 'Done' : 'Missed' },
                        { label: 'Running rate', value: pct(d.rate) },
                      ]}
                    />
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--brand)"
                strokeWidth={2}
                dot={data.length <= 16 ? { r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--brand)' } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)', fill: 'var(--brand)' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <SrTable caption={`${habit.title} history`} headers={['Date', 'Done', 'Running rate']} rows={data.map((d) => [d.date, d.done ? 'yes' : 'no', pct(d.rate)])} />
      </div>
    </div>
  )
}
