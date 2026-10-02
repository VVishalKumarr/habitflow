/**
 * Prices are NOT set here. They live in the `plans` table (Supabase), per
 * region, in the smallest currency unit (e.g. 4900 = ₹49.00, 199 = $1.99):
 *
 *   update public.plans
 *   set prices = jsonb_set(prices, '{IN,monthly}', '5900')   -- Plus in India: ₹59/month
 *   where id = 'plus';
 *
 * This file only picks the right regional price and formats it.
 */
import type { Region } from '../lib/region'

export interface RegionPrice {
  currency: string
  monthly: number
  yearly: number
}

export function priceFor(prices: Partial<Record<string, RegionPrice>> | undefined, region: Region): RegionPrice | null {
  return prices?.[region] ?? prices?.default ?? null
}

export function formatPrice(minor: number, currency: string): string {
  const value = minor / 100
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}
