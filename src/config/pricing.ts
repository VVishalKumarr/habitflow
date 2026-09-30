/**
 * Prices are NOT set here. They are read from the `plans` table (Supabase),
 * in the smallest currency unit (e.g. 9900 = ₹99.00). Change them with SQL:
 *
 *   update public.plans set price_monthly = 14900, price_yearly = 119900 where id = 'pro';
 *
 * This file only formats them.
 */
export function formatPrice(minor: number, currency: string): string {
  const value = minor / 100
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)
  } catch {
    return `${currency} ${value}`
  }
}
