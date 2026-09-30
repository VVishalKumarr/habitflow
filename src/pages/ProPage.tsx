import { CheckCircle2, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlanCards, useIntervalToggle } from '../components/pricing/PlanCards'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Spinner } from '../components/ui/Spinner'
import { analytics } from '../lib/analytics'
import { formatDate } from '../lib/dates'
import { getPaymentService } from '../lib/payments'
import { useAuth } from '../store/auth'
import { useSubscription, useSubscriptionStore } from '../store/subscription'
import { toast } from '../store/ui'

const FAQ = [
  ['Do I lose anything if I stay on Free?', 'No. Free is free forever. Limits only apply to adding new things — your existing trackers and history are never deleted.'],
  ['What happens if Pro ends?', 'You keep all your data. Pro-only features switch off and the free limits apply to new items again.'],
  ['Can I cancel any time?', 'Yes. Cancelling stops the next renewal; Pro stays active until the end of the period you paid for.'],
  ['How is payment handled?', 'By our payment provider. We never see or store your card or UPI details. In the Android app, Pro is bought through Google Play.'],
]

export default function ProPage() {
  const signedIn = useAuth((s) => s.status === 'authenticated')
  const username = useAuth((s) => s.profile?.username ?? '')
  const sub = useSubscription()
  const load = useSubscriptionStore((s) => s.load)
  const startTrial = useSubscriptionStore((s) => s.startTrial)
  const trialDays = useSubscriptionStore((s) => s.plans.find((p) => p.id === 'pro')?.trial_days ?? 0)
  const [interval, toggle] = useIntervalToggle()
  const [busy, setBusy] = useState<'checkout' | 'trial' | 'cancel' | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const payments = getPaymentService()

  useEffect(() => {
    if (signedIn) load()
  }, [signedIn, load])

  const upgrade = async () => {
    analytics.track('upgrade_clicked', { source: 'pro_page', interval })
    setBusy('checkout')
    try {
      const res = await payments.checkout(interval, { username })
      if (res.status === 'cancelled') return
      await load()
      analytics.track('subscription_started', { interval, provider: payments.id })
      toast.success(res.status === 'completed' ? 'Welcome to Pro! Your features are unlocked.' : 'Payment received — Pro will switch on as soon as it’s confirmed.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const trial = async () => {
    setBusy('trial')
    try {
      await startTrial()
      analytics.track('trial_started')
      toast.success('Your Pro trial has started.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const cancel = async () => {
    try {
      await payments.cancel?.()
      await load()
      toast.success('Your subscription won’t renew. Pro stays active until the end of this period.')
      setConfirmCancel(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  let proAction
  if (!signedIn) {
    proAction = (
      <Link to="/register" className="btn-primary h-11" onClick={() => analytics.track('upgrade_clicked', { source: 'pro_page_signed_out' })}>
        Create a free account to upgrade
      </Link>
    )
  } else if (sub.isPro) {
    proAction = (
      <>
        <p className="flex items-center justify-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium">
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
          {sub.state === 'TRIAL' ? 'You’re on a Pro trial' : 'You’re on Pro'}
          {sub.expires_at && ` · ${sub.cancel_at_period_end || sub.state === 'TRIAL' ? 'ends' : 'renews'} ${formatDate(sub.expires_at.slice(0, 10), { month: 'short', day: 'numeric', year: 'numeric' })}`}
        </p>
        {sub.provider === 'razorpay' && !sub.cancel_at_period_end && payments.cancel && (
          <button type="button" className="btn-ghost" onClick={() => setConfirmCancel(true)}>
            Cancel subscription
          </button>
        )}
        {sub.provider === 'google_play' && <p className="text-center text-sm text-muted">Manage this subscription in Google Play → Payments & subscriptions.</p>}
      </>
    )
  } else {
    proAction = (
      <>
        {payments.unavailableReason ? (
          <p className="flex items-start gap-2 rounded-xl bg-subtle px-4 py-3 text-sm text-muted">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {payments.unavailableReason}
          </p>
        ) : (
          <button type="button" className="btn-primary h-11" onClick={upgrade} disabled={busy !== null}>
            {busy === 'checkout' && <Spinner className="size-4" />}
            Upgrade to Pro
          </button>
        )}
        {sub.trial_available && trialDays > 0 && (
          <button type="button" className="btn-secondary h-11" onClick={trial} disabled={busy !== null}>
            {busy === 'trial' && <Spinner className="size-4" />}
            Start {trialDays}-day free trial
          </button>
        )}
        {sub.state === 'EXPIRED' && <p className="text-center text-sm text-muted">Your Pro access has ended. Your data is all still here.</p>}
      </>
    )
  }

  const freeAction = !signedIn ? (
    <Link to="/register" className="btn-secondary h-11">
      Create Free Account
    </Link>
  ) : !sub.isPro ? (
    <p className="rounded-xl bg-subtle px-4 py-3 text-center text-sm font-medium">Your current plan</p>
  ) : null

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">HabitFlow Pro</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">Everything you need is free. Pro adds unlimited trackers, deeper statistics, reports, themes and focus sounds — and removes ads.</p>
        <div className="mt-6">{toggle}</div>
      </div>

      <div className="mt-10">
        <PlanCards interval={interval} proAction={proAction} freeAction={freeAction} />
      </div>

      <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="pro-faq">
        <h2 id="pro-faq" className="text-xl font-semibold">
          Questions
        </h2>
        <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <div key={q} className="p-5">
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1 text-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ConfirmModal
        open={confirmCancel}
        title="Cancel Pro?"
        message="Your subscription won’t renew. You keep Pro until the end of the current period, and all your data stays."
        confirmLabel="Cancel subscription"
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancel}
      />
    </div>
  )
}
