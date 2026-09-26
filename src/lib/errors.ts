/** Turn Supabase / network errors into short, human messages. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { message?: string; code?: string } | null
  const msg = e?.message ?? ''
  if (!msg && !e?.code) return fallback
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Network error — check your connection and try again.'
  if (e?.code === '23P01' || /overlaps/i.test(msg)) return 'That time slot overlaps an existing slot.'
  if (e?.code === '23505') return 'That already exists.'
  if (e?.code === '23514') return 'Some values are invalid.'
  if (/jwt|not authenticated|refresh token/i.test(msg)) return 'Your session expired. Please log in again.'
  return msg || fallback
}
