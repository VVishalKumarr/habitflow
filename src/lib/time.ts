import type { TimeFormat, TimeSlot } from './types'

/** "HH:MM[:SS]" -> minutes since midnight */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** "HH:MM[:SS]" -> "HH:MM" (value for <input type="time">) */
export const toInputTime = (t: string) => t.slice(0, 5)

export function formatTime(t: string, fmt: TimeFormat): string {
  const mins = toMinutes(t)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (fmt === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatSlot(slot: Pick<TimeSlot, 'start_time' | 'end_time'>, fmt: TimeFormat): string {
  const a = formatTime(slot.start_time, fmt)
  const b = formatTime(slot.end_time, fmt)
  if (fmt === '12h' && a.slice(-2) === b.slice(-2)) return `${a.slice(0, -3)} – ${b}`
  return `${a} – ${b}`
}

export const sortSlots = (slots: TimeSlot[]) =>
  [...slots].sort((x, y) => toMinutes(x.start_time) - toMinutes(y.start_time))

/** Returns an error message, or null when the range is valid and free. */
export function validateSlot(
  start: string,
  end: string,
  existing: TimeSlot[],
  ignoreId?: string,
  fmt: TimeFormat = '12h',
): string | null {
  if (!start || !end) return 'Start and end time are required.'
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (e <= s) return 'End time must be after start time.'
  const clash = existing.find(
    (x) => x.id !== ignoreId && toMinutes(x.start_time) < e && s < toMinutes(x.end_time),
  )
  if (clash) return `Overlaps with ${formatSlot(clash, fmt)}. Adjust the times or edit that slot.`
  return null
}
