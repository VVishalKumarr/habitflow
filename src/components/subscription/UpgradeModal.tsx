import { Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Feature, LimitKey } from '../../config'
import { analytics } from '../../lib/analytics'
import { useSubscriptionStore, useUpgrade, type Plan } from '../../store/subscription'
import { Modal } from '../ui/Modal'

const LIMIT_KEYS = new Set<string>(['trackers', 'friends', 'history_days'])

/** Paid plans that unlock this feature, or raise this limit above the user's current one. */
function plansFor(key: Feature | LimitKey | null, plans: Plan[], currentRank: number): Plan[] {
  if (!key) return plans.filter((p) => p.rank > currentRank)
  return plans.filter((p) => {
    if (p.rank <= currentRank) return false
    if (LIMIT_KEYS.has(key)) {
      const cur = plans.find((x) => x.rank === currentRank)?.limits[key as LimitKey]
      const lim = p.limits[key as LimitKey]
      return lim === null || (lim !== undefined && cur != null && lim > cur)
    }
    return p.features.includes(key as Feature)
  })
}

/** Gentle upgrade prompt. Never blocks access to existing data. */
export function UpgradeModal() {
  const open = useUpgrade((s) => s.open)
  const message = useUpgrade((s) => s.message)
  const key = useUpgrade((s) => s.key)
  const close = useUpgrade((s) => s.close)
  const plans = useSubscriptionStore((s) => s.plans)
  const rank = useSubscriptionStore((s) => s.ent.rank)
  const loadPlans = useSubscriptionStore((s) => s.loadPlans)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) loadPlans()
  }, [open, loadPlans])

  const names = plansFor(key, plans, rank).map((p) => p.name)
  const included = names.length ? `Included in ${names.join(' and ')}.` : 'Available on a paid plan.'

  return (
    <Modal
      open={open}
      onClose={close}
      title="Upgrade to unlock"
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close}>
            Maybe Later
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              analytics.track('upgrade_clicked', { source: 'upgrade_modal', feature: key ?? '' })
              close()
              navigate('/pro')
            }}
          >
            See plans
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <div className="text-[15px] leading-relaxed">
          <p className="font-medium">{message}</p>
          <p className="mt-1 text-muted">{included} Everything you already have stays as it is.</p>
        </div>
      </div>
    </Modal>
  )
}
