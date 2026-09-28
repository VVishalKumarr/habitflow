import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDate } from '../../lib/dates'
import { formatDuration } from '../../lib/pomodoroStats'
import { SrTable, TooltipBox, pct } from './ChartCard'

export interface ComparePoint {
  date: string
  meSeconds: number
  themSeconds: number
  meRate: number | null
  themRate: number | null
  meDone: number
  meScheduled: number
  themDone: number
  themScheduled: number
}

export const ME_COLOR = 'var(--brand)'
export const THEM_COLOR = 'var(--rival)'

/** Legend for the two series; always shown so identity never relies on colour alone. */
export function CompareLegend({ me, them }: { me: string; them: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: ME_COLOR }} aria-hidden="true" />
        {me}
      </span>
      <span className="flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: THEM_COLOR }} aria-hidden="true" />
        {them}
      </span>
    </div>
  )
}

const xTick = (n: number) => (d: string) =>
  n <= 7 ? formatDate(d, { weekday: 'short' }) : formatDate(d, { month: 'short', day: 'numeric' })
const axisTick = { fill: 'var(--muted)', fontSize: 12 }

export function CompareFocusChart({ data, me, them }: { data: ComparePoint[]; me: string; them: string }) {
  const rows = data.map((d) => ({ ...d, meMin: Math.round(d.meSeconds / 60), themMin: Math.round(d.themSeconds / 60) }))
  const tickEvery = Math.max(1, Math.ceil(rows.length / 7))
  return (
    <>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} interval={tickEvery - 1} tickFormatter={xTick(rows.length)} tick={axisTick} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} unit="m" />
            <Tooltip
              cursor={{ fill: 'var(--subtle)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as (typeof rows)[number]
                return (
                  <TooltipBox
                    title={formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    lines={[
                      { label: me, value: formatDuration(d.meSeconds), swatch: ME_COLOR },
                      { label: them, value: formatDuration(d.themSeconds), swatch: THEM_COLOR },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="meMin" name={me} fill={ME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
            <Bar dataKey="themMin" name={them} fill={THEM_COLOR} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={`Focus minutes per day, ${me} and ${them}`}
        headers={['Date', `${me} (min)`, `${them} (min)`]}
        rows={rows.map((d) => [d.date, d.meMin, d.themMin])}
      />
    </>
  )
}

export function CompareRateChart({ data, me, them }: { data: ComparePoint[]; me: string; them: string }) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 7))
  const dot = (color: string) => ({ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: color })
  return (
    <>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} interval={tickEvery - 1} tickFormatter={xTick(data.length)} tick={axisTick} />
            <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={pct} tickLine={false} axisLine={false} tick={axisTick} />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as ComparePoint
                const line = (rate: number | null, done: number, sched: number) => (rate === null ? 'Nothing scheduled' : `${pct(rate)} (${done}/${sched})`)
                return (
                  <TooltipBox
                    title={formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    lines={[
                      { label: me, value: line(d.meRate, d.meDone, d.meScheduled), swatch: ME_COLOR },
                      { label: them, value: line(d.themRate, d.themDone, d.themScheduled), swatch: THEM_COLOR },
                    ]}
                  />
                )
              }}
            />
            <Line type="monotone" dataKey="meRate" name={me} stroke={ME_COLOR} strokeWidth={2} connectNulls dot={data.length <= 14 ? dot(ME_COLOR) : false} activeDot={dot(ME_COLOR)} isAnimationActive={false} />
            <Line type="monotone" dataKey="themRate" name={them} stroke={THEM_COLOR} strokeWidth={2} connectNulls dot={data.length <= 14 ? dot(THEM_COLOR) : false} activeDot={dot(THEM_COLOR)} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SrTable
        caption={`Timetable completion rate per day, ${me} and ${them}`}
        headers={['Date', me, them]}
        rows={data.map((d) => [d.date, d.meRate === null ? '—' : pct(d.meRate), d.themRate === null ? '—' : pct(d.themRate)])}
      />
    </>
  )
}
