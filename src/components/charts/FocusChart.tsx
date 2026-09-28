import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../../lib/dates'
import { formatDuration, type FocusDay } from '../../lib/pomodoroStats'
import { SrTable, TooltipBox } from './ChartCard'

/** Focus minutes per day (single series). */
export function FocusChart({ data, caption }: { data: FocusDay[]; caption: string }) {
  const rows = data.map((d) => ({ ...d, minutes: Math.round(d.seconds / 60) }))
  const tickEvery = Math.max(1, Math.ceil(rows.length / 7))

  return (
    <>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={tickEvery - 1}
              tickFormatter={(d: string) =>
                rows.length <= 7 ? formatDate(d, { weekday: 'short' }) : formatDate(d, { month: 'short', day: 'numeric' })
              }
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} unit="m" />
            <Tooltip
              cursor={{ fill: 'var(--subtle)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof rows)[number]
                return (
                  <TooltipBox
                    title={formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    lines={[
                      { label: 'Focus time', value: formatDuration(d.seconds) },
                      { label: 'Sessions', value: String(d.sessions) },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="minutes" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption={caption} headers={['Date', 'Focus minutes', 'Sessions']} rows={rows.map((d) => [d.date, d.minutes, d.sessions])} />
    </>
  )
}
