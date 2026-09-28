import { addDays, startOfWeek, type ISODate } from './dates'
import type { PomodoroSession } from './types'

export interface FocusDay {
  date: ISODate
  seconds: number
  sessions: number
}

export interface LabelStat {
  key: string
  label: string
  seconds: number
  sessions: number
}

export interface PomodoroStats {
  today: FocusDay
  week: FocusDay[]
  weekSeconds: number
  totalSeconds: number
  totalSessions: number
  /** sessions where the timer ran to the end */
  fullSessions: number
  activeDays: number
  /** consecutive days with at least one session; an empty today doesn't break it */
  streak: { current: number; longest: number }
  labels: LabelStat[]
  byDate: Map<ISODate, FocusDay>
}

/** "1h 25m", "25m", "0m" */
export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

const labelKey = (l: string) => l.trim().toLowerCase().replace(/\s+/g, ' ')

export function computePomodoroStats(sessions: PomodoroSession[], today: ISODate, weekStart: number): PomodoroStats {
  const byDate = new Map<ISODate, FocusDay>()
  const labels = new Map<string, LabelStat>()
  let totalSeconds = 0
  let fullSessions = 0

  for (const s of sessions) {
    totalSeconds += s.focus_seconds
    if (s.completed) fullSessions++
    const d = byDate.get(s.session_date) ?? { date: s.session_date, seconds: 0, sessions: 0 }
    d.seconds += s.focus_seconds
    d.sessions++
    byDate.set(s.session_date, d)

    const k = labelKey(s.label)
    const l = labels.get(k) ?? { key: k, label: s.label.trim(), seconds: 0, sessions: 0 }
    l.seconds += s.focus_seconds
    l.sessions++
    labels.set(k, l)
  }

  const day = (date: ISODate): FocusDay => byDate.get(date) ?? { date, seconds: 0, sessions: 0 }
  const week = Array.from({ length: 7 }, (_, i) => day(addDays(startOfWeek(today, weekStart), i)))

  // Streaks over calendar days up to today.
  const dates = [...byDate.keys()].filter((d) => d <= today).sort()
  let longest = 0
  let run = 0
  let prev: ISODate | null = null
  for (const d of dates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = d
  }
  let current = 0
  for (let d = byDate.has(today) ? today : addDays(today, -1); byDate.has(d); d = addDays(d, -1)) current++

  return {
    today: day(today),
    week,
    weekSeconds: week.reduce((a, d) => a + d.seconds, 0),
    totalSeconds,
    totalSessions: sessions.length,
    fullSessions,
    activeDays: byDate.size,
    streak: { current, longest },
    labels: [...labels.values()].sort((a, b) => b.seconds - a.seconds || a.label.localeCompare(b.label)),
    byDate,
  }
}

/** Focus minutes for each of the last `days` days ending today. */
export function focusSeries(byDate: Map<ISODate, FocusDay>, today: ISODate, days: number): FocusDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1)
    return byDate.get(date) ?? { date, seconds: 0, sessions: 0 }
  })
}
