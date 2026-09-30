import { env } from './env'

export type WebPaymentProvider = 'razorpay' | 'stripe' | 'lemonsqueezy' | 'none'

/**
 * Which checkout the website uses. Only public identifiers belong here;
 * secret keys are Supabase function secrets (see SETUP.md).
 * Android uses Google Play Billing regardless of this setting.
 */
export const paymentsConfig = {
  web: (env('VITE_PAYMENT_PROVIDER', 'none').toLowerCase() as WebPaymentProvider) ?? 'none',
  razorpayKeyId: env('VITE_RAZORPAY_KEY_ID'),
  stripePublishableKey: env('VITE_STRIPE_PUBLISHABLE_KEY'),
  googlePlayProductId: env('VITE_GOOGLE_PLAY_PRODUCT_ID'),
}
