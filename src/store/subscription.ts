import { create } from 'zustand'
import { FEATURE_UPSELL, type Feature, type LimitKey } from '../config'
import { friendlyError, setPlanErrorHandler } from '../lib/errors'
import { supabase } from '../lib/supabase'

export type PlanState = 'FREE' | 'PRO' | 'TRIAL' | 'EXPIRED'

/** What the server says this user may do (see my_entitlements() in the database). */
export interface Entitlements {
  plan: 'free' | 'pro'
  state: PlanState
  provider: string | null
  status: string | null
  expires_at: string | null
  cancel_at_period_end: boolean
  limits: Partial<Record<LimitKey, number | null>>
  features: Feature[]
  trial_available: boolean
}

export interface Plan {
  id: 'free' | 'pro'
  name: string
  currency: string
  /** smallest currency unit (paise) */
  price_monthly: number
  price_yearly: number
  trial_days: number
  limits: Partial<Record<LimitKey, number | null>>
  features: Feature[]
  razorpay_plan_monthly: string | null
  razorpay_plan_yearly: string | null
  google_play_product_id: string | null
}

/** Used until the server answers, and if it can't be reached: most restrictive. */
const FREE_FALLBACK: Entitlements = {
  plan: 'free',
  state: 'FREE',
  provider: null,
  status: null,
  expires_at: null,
  cancel_at_period_end: false,
  limits: {},
  features: ['basic_statistics'],
  trial_available: false,
}

interface SubscriptionState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  ent: Entitlements
  plans: Plan[]
  plansStatus: 'idle' | 'loading' | 'ready' | 'error'
  load: () => Promise<void>
  loadPlans: () => Promise<void>
  startTrial: () => Promise<void>
  reset: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  status: 'idle',
  ent: FREE_FALLBACK,
  plans: [],
  plansStatus: 'idle',

  load: async () => {
    set({ status: 'loading' })
    const { data, error } = await supabase.rpc('my_entitlements')
    if (error) set({ status: 'error', ent: FREE_FALLBACK })
    else set({ status: 'ready', ent: { ...FREE_FALLBACK, ...(data as Entitlements) } })
  },

  loadPlans: async () => {
    if (get().plansStatus === 'ready' || get().plansStatus === 'loading') return
    set({ plansStatus: 'loading' })
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, currency, price_monthly, price_yearly, trial_days, limits, features, razorpay_plan_monthly, razorpay_plan_yearly, google_play_product_id')
    if (error) set({ plansStatus: 'error' })
    else set({ plansStatus: 'ready', plans: (data as Plan[]).sort((a) => (a.id === 'free' ? -1 : 1)) })
  },

  startTrial: async () => {
    const { data, error } = await supabase.rpc('start_trial')
    if (error) throw new Error(friendlyError(error))
    set({ ent: { ...FREE_FALLBACK, ...(data as Entitlements) } })
  },

  reset: () => set({ status: 'idle', ent: FREE_FALLBACK }),
}))

export function useSubscription(): Entitlements & { loading: boolean; isPro: boolean } {
  const ent = useSubscriptionStore((s) => s.ent)
  const status = useSubscriptionStore((s) => s.status)
  return { ...ent, loading: status === 'idle' || status === 'loading', isPro: ent.plan === 'pro' }
}

/* ------------------------------------------------------------------ */
/* Upgrade dialog                                                      */
/* ------------------------------------------------------------------ */

interface UpgradeState {
  open: boolean
  message: string
  show: (key?: Feature | LimitKey, message?: string) => void
  close: () => void
}

export const useUpgrade = create<UpgradeState>((set) => ({
  open: false,
  message: '',
  show: (key, message) =>
    set({ open: true, message: message ?? (key && FEATURE_UPSELL[key]) ?? 'This feature is available with HabitFlow Pro.' }),
  close: () => set({ open: false }),
}))

/* ------------------------------------------------------------------ */
/* Feature checks (one place for every Pro check in the UI)            */
/* ------------------------------------------------------------------ */

export function hasFeature(feature: Feature): boolean {
  return useSubscriptionStore.getState().ent.features.includes(feature)
}

export function useFeatureAccess() {
  const features = useSubscriptionStore((s) => s.ent.features)
  const limits = useSubscriptionStore((s) => s.ent.limits)
  return {
    hasFeature: (f: Feature) => features.includes(f),
    /** null = unlimited, undefined = unknown yet */
    limit: (k: LimitKey) => limits[k],
    /**
     * Returns true when allowed; otherwise opens the upgrade dialog and returns false.
     * While the plan is still loading, server-enforced features are allowed (the
     * database refuses them if needed, so Pro members never see a false prompt).
     * Features checked only in the browser pass `{ clientOnly: true }` and are
     * refused silently until the plan is known.
     */
    requireFeature: (f: Feature, opts: { message?: string; clientOnly?: boolean } = {}) => {
      if (features.includes(f)) return true
      const status = useSubscriptionStore.getState().status
      if (status === 'idle' || status === 'loading') return !opts.clientOnly
      const message = opts.message
      useUpgrade.getState().show(f, message)
      return false
    },
  }
}

// Server-side plan errors (from any request) open the upgrade dialog.
setPlanErrorHandler((key) => useUpgrade.getState().show(key))
