// PaymentService: one interface, one implementation per provider.
// The rest of the app only calls getPaymentService().
//
// Web      -> configured provider (Razorpay today; Stripe / Lemon Squeezy slots)
// Android  -> Google Play Billing (required by Play for digital subscriptions;
//             never an external web checkout inside the app)
//
// No provider ever marks the user as Pro in the browser: after checkout the
// server verifies the payment and the app re-reads entitlements.
import { paymentsConfig } from '../../config'
import { isNative } from '../native'
import { googlePlayProvider } from './googlePlay'
import { razorpayProvider } from './razorpay'

export type BillingInterval = 'monthly' | 'yearly'

export interface CheckoutResult {
  status: 'completed' | 'cancelled' | 'pending'
}

export interface PaymentProvider {
  id: 'razorpay' | 'stripe' | 'lemonsqueezy' | 'google_play' | 'none'
  /** Human explanation when checkout can't be offered here. */
  unavailableReason: string | null
  checkout: (interval: BillingInterval, ctx: { username: string }) => Promise<CheckoutResult>
  /** Cancel at the end of the paid period (where the provider allows it from the app). */
  cancel?: () => Promise<void>
}

const unavailable = (reason: string): PaymentProvider => ({
  id: 'none',
  unavailableReason: reason,
  checkout: async () => {
    throw new Error(reason)
  },
})

export function getPaymentService(): PaymentProvider {
  if (isNative) return googlePlayProvider()
  switch (paymentsConfig.web) {
    case 'razorpay':
      return paymentsConfig.razorpayKeyId ? razorpayProvider() : unavailable('Online payments aren’t set up yet.')
    case 'stripe':
    case 'lemonsqueezy':
      return unavailable('This payment provider isn’t connected yet.')
    default:
      return unavailable('Online payments aren’t available yet.')
  }
}
