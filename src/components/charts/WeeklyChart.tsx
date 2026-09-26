import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DAY_SHORT, dayOfWeek, formatDate } from '../../lib/dates'
import type { DayStat } from '../../lib/stats'
import { SrTable, TooltipBox, pct } from './ChartCard'

/** Completion % for each day of the current week (single series). */
export function WeeklyChart({ week, today }: { week: DayStat[]; today: string }) {
  const data = week.map((d) => ({
    ...d,
    label: DAY_SHORT[dayOfWeek(d.date)],
    rate: d.scheduled ? d.completed / d.scheduled : 0,
    future: d.date > today,
  }))

  return (
    <>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={pct}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--subtle)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof data)[number]
                return (
                  <TooltipBox
                    title={formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    lines={[
                      { label: 'Completed', value: `${d.completed} of ${d.scheduled}` },
                      { label: 'Rate', value: d.scheduled ? pct(d.rate) : '—' },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="rate" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption="Completion by day this week"
        headers={['Day', 'Completed', 'Scheduled', 'Rate']}
        rows={data.map((d) => [d.label, d.completed, d.scheduled, pct(d.rate)])}
      />
    </>
  )
}
