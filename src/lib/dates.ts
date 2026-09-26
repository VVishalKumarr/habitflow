/**
 * All calendar dates are handled as local "YYYY-MM-DD" strings. Internally a
 * Date at local noon is used so DST shifts can never move a day.
 */
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const todayISO = (): ISODate => toISODate(new Date())

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export const dayOfWeek = (s: ISODate) => parseISODate(s).getDay()

export function startOfWeek(s: ISODate, weekStart: number): ISODate {
  const diff = (dayOfWeek(s) - weekStart + 7) % 7
  return addDays(s, -diff)
}

export function weekDates(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Local calendar date of a timestamp (e.g. a row's created_at). */
export const localDateOf = (timestamp: string): ISODate => toISODate(new Date(timestamp))

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / 86_400_000)
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Weekday indexes in display order for the user's first day of week. */
export const orderedDays = (weekStart: number) => Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)

export function formatDate(s: ISODate, opts: Intl.DateTimeFormatOptions): string {
  return parseISODate(s).toLocaleDateString(undefined, opts)
}

export function formatWeekRange(start: ISODate): string {
  const a = parseISODate(start)
  const b = parseISODate(addDays(start, 6))
  const month = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' })
  if (a.getFullYear() !== b.getFullYear())
    return `${month(a)} ${a.getDate()}, ${a.getFullYear()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`
  if (a.getMonth() === b.getMonth()) return `${month(a)} ${a.getDate()} – ${b.getDate()}, ${b.getFullYear()}`
  return `${month(a)} ${a.getDate()} – ${month(b)} ${b.getDate()}, ${b.getFullYear()}`
}
