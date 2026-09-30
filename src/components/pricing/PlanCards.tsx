import { Check } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { FEATURE_LABELS, type Feature } from '../../config'
import { formatPrice } from '../../config/pricing'
import { useSubscriptionStore, type Plan } from '../../store/subscription'
import { Skeleton } from '../ui/Spinner'

export type Interval = 'monthly' | 'yearly'

/** Human bullet points for a plan, built from its limits + features (all from the database). */
export function planBullets(plan: Plan, free?: Plan): string[] {
  const out: string[] = []
  const t = plan.limits.trackers
  out.push(t == null ? 'Unlimited trackers' : `${t} tracker${t === 1 ? '' : 's'}`)
  out.push('Weekly timetable, tasks & streaks', 'Pomodoro focus timer')
  const h = plan.limits.history_days
  out.push(h == null ? 'Full history' : `${h}-day detailed history`)
  const f = plan.limits.friends
  out.push(f == null ? 'Unlimited friends' : `Up to ${f} friends`)
  const extras = plan.features.filter((x) => x !== 'basic_statistics' && x !== 'unlimited_trackers' && x !== 'full_history' && !(free?.features.includes(x)))
  for (const x of extras) out.push(FEATURE_LABELS[x as Feature] ?? x)
  if (plan.id === 'free') out.push('Basic statistics')
  return out
}

export function useIntervalToggle(): [Interval, ReactNode] {
  const [interval, setInterval] = useState<Interval>('yearly')
  const toggle = (
    <div className="inline-flex rounded-xl bg-subtle p-1" role="radiogroup" aria-label="Billing period">
      {(['monthly', 'yearly'] as const).map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={interval === i}
          onClick={() => setInterval(i)}
          className={`h-9 rounded-lg px-4 text-sm font-medium transition-colors ${interval === i ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {i === 'monthly' ? 'Monthly' : 'Yearly'}
        </button>
      ))}
    </div>
  )
  return [interval, toggle]
}

export function PlanCards({ interval, proAction, freeAction }: { interval: Interval; proAction: ReactNode; freeAction: ReactNode }) {
  const plans = useSubscriptionStore((s) => s.plans)
  const status = useSubscriptionStore((s) => s.plansStatus)
  const loadPlans = useSubscriptionStore((s) => s.loadPlans)
  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  const free = plans.find((p) => p.id === 'free')
  const pro = plans.find((p) => p.id === 'pro')

  if (status === 'error') return <p className="text-center text-muted">Pricing couldn’t be loaded. Please try again later.</p>
  if (!free || !pro) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const monthlyOfYearly = Math.round(pro.price_yearly / 12)
  const saving = pro.price_monthly > 0 ? Math.round((1 - pro.price_yearly / (pro.price_monthly * 12)) * 100) : 0

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="card flex flex-col p-6 sm:p-8" aria-labelledby="plan-free">
        <h2 id="plan-free" className="text-lg font-semibold">
          {free.name}
        </h2>
        <p className="mt-3 text-4xl font-semibold tracking-tight">{formatPrice(0, free.currency)}</p>
        <p className="mt-1 text-sm text-muted">Free forever</p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {planBullets(free).map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px]">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 [&>*]:w-full">{freeAction}</div>
      </section>

      <section className="card relative flex flex-col border-2 border-brand p-6 sm:p-8" aria-labelledby="plan-pro">
        <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>
        <h2 id="plan-pro" className="text-lg font-semibold">
          {pro.name}
        </h2>
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-4xl font-semibold tracking-tight">
            {formatPrice(interval === 'yearly' ? pro.price_yearly : pro.price_monthly, pro.currency)}
          </span>
          <span className="text-muted">/{interval === 'yearly' ? 'year' : 'month'}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          {interval === 'yearly'
            ? `${formatPrice(monthlyOfYearly, pro.currency)}/month billed yearly${saving > 0 ? ` · save ${saving}%` : ''}`
            : `or ${formatPrice(pro.price_yearly, pro.currency)}/year`}
          {pro.trial_days > 0 && ` · ${pro.trial_days}-day free trial`}
        </p>
        <ul className="mt-6 flex-1 space-y-2.5">
          {planBullets(pro, free).map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[15px]">
              <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-2 [&>*]:w-full">{proAction}</div>
      </section>
    </div>
  )
}
