import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { TooltipBox, pct } from './ChartCard'

/** Completed vs not completed, with the rate as the hero label in the middle. */
export function DonutChart({ completed, total }: { completed: number; total: number }) {
  const missed = Math.max(0, total - completed)
  const rate = total ? completed / total : 0
  const data =
    total === 0
      ? [{ name: 'No data', value: 1, color: 'var(--subtle)' }]
      : [
          { name: 'Completed', value: completed, color: 'var(--success)' },
          { name: 'Not completed', value: missed, color: 'var(--line)' },
        ]

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:flex-col xl:flex-row">
      <div className="relative size-48 shrink-0" role="img" aria-label={`${pct(rate)} completed: ${completed} of ${total} scheduled tasks`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="72%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface)"
              strokeWidth={2}
              paddingAngle={total && completed && missed ? 1 : 0}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]
                  return <TooltipBox title={String(p.name)} lines={[{ label: 'Tasks', value: `${p.value} (${pct(Number(p.value) / total)})` }]} />
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight">{pct(rate)}</span>
          <span className="text-xs font-medium tracking-wide text-muted uppercase">completed</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-success" aria-hidden="true" />
          <span className="text-muted">Completed</span>
          <span className="ml-auto pl-6 font-semibold tabular-nums">{completed}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-line" aria-hidden="true" />
          <span className="text-muted">Not completed</span>
          <span className="ml-auto pl-6 font-semibold tabular-nums">{missed}</span>
        </li>
      </ul>
    </div>
  )
}
