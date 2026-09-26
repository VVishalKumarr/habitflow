/**
 * The UI only deals in usernames. Supabase Auth needs an e-mail shaped login,
 * so each username maps to a synthetic, never-contacted address. The database
 * trigger (supabase/schema.sql) enforces the same mapping server-side.
 */
export const LOGIN_DOMAIN = 'habitflow.local'

export const USERNAME_MIN = 3
export const USERNAME_MAX = 24
export const PASSWORD_MIN = 8

export const normalizeUsername = (u: string) => u.trim().toLowerCase()
export const usernameToLogin = (u: string) => `${normalizeUsername(u)}@${LOGIN_DOMAIN}`

export function validateUsername(raw: string): string | null {
  const u = normalizeUsername(raw)
  if (!u) return 'Username is required.'
  if (u.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters.`
  if (u.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters.`
  if (!/^[a-z0-9_.-]+$/.test(u)) return 'Use only letters, numbers, dots, dashes and underscores.'
  return null
}

export function validatePassword(p: string): string | null {
  if (!p) return 'Password is required.'
  if (p.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`
  if (p.length > 72) return 'Password must be at most 72 characters.'
  return null
}
