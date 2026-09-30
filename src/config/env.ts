// Reads public build-time settings (VITE_* variables). Everything here ends up
// in the website bundle, so it must never contain secrets.
const e = import.meta.env as Record<string, string | undefined>

export const env = (name: string, fallback = ''): string => (e[name] ?? '').trim() || fallback
export const envFlag = (name: string, fallback = false): boolean => {
  const v = env(name).toLowerCase()
  if (!v) return fallback
  return v === '1' || v === 'true' || v === 'on' || v === 'yes'
}
