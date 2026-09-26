import { addDays, dayOfWeek, localDateOf, startOfWeek, type ISODate } from './dates'
import { completionKey, type Category, type Task } from './types'

export type CompletionMap = Record<string, boolean>

export interface DayStat {
  date: ISODate
  scheduled: number
  completed: number
}

export interface StreakInfo {
  current: number
  longest: number
}

export interface HabitStat {
  key: string
  title: string
  category: Category
  taskIds: string[]
  /** Scheduled days up to today (a day counts once even if the habit appears twice). */
  scheduledDays: number
  completedDays: number
  rate: number
  streak: StreakInfo
  /** Chronological scheduled days with whether every occurrence was done. */
  history: { date: ISODate; done: boolean }[]
}

export interface TrackerStats {
  firstDate: ISODate | null
  today: DayStat
  week: DayStat[]
  totals: { scheduled: number; completed: number; rate: number }
  weekTotals: { scheduled: number; completed: number; rate: number }
  streak: StreakInfo
  /** Daily series from firstDate to today. */
  daily: DayStat[]
  habits: HabitStat[]
}

const rate = (done: number, total: number) => (total === 0 ? 0 : done / total)

/**
 * A recurring task is "scheduled" on a date when the weekday matches and the
 * date is on/after the day it was created. A completion recorded before that
 * (e.g. back-filled history) also counts as a scheduled occurrence.
 */
function isScheduled(task: Task, created: ISODate, date: ISODate, completions: CompletionMap): boolean {
  if (task.day_of_week !== dayOfWeek(date)) return false
  return date >= created || completions[completionKey(task.id, date)] === true
}

export const habitKey = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ')

/** Streaks over an ordered list of scheduled units; an unfinished `today` does not break the current streak. */
function streaks(units: { date: ISODate; done: boolean }[], today: ISODate): StreakInfo {
  let longest = 0
  let run = 0
  for (const u of units) {
    run = u.done ? run + 1 : 0
    if (run > longest) longest = run
  }
  let current = 0
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i]
    if (u.done) current++
    else if (u.date === today && current === 0) continue
    else break
  }
  return { current, longest }
}

export function computeDay(tasks: Task[], completions: CompletionMap, date: ISODate): DayStat {
  let scheduled = 0
  let completed = 0
  for (const t of tasks) {
    if (!isScheduled(t, localDateOf(t.created_at), date, completions)) continue
    scheduled++
    if (completions[completionKey(t.id, date)]) completed++
  }
  return { date, scheduled, completed }
}

export function computeStats(
  tasks: Task[],
  completions: CompletionMap,
  today: ISODate,
  weekStart: number,
): TrackerStats {
  const created = new Map(tasks.map((t) => [t.id, localDateOf(t.created_at)]))
  const taskIds = new Set(tasks.map((t) => t.id))

  // Earliest relevant date: first task creation or first recorded completion.
  let firstDate: ISODate | null = null
  for (const d of created.values()) if (!firstDate || d < firstDate) firstDate = d
  for (const [key, done] of Object.entries(completions)) {
    if (!done) continue
    const [id, date] = key.split('|')
    if (taskIds.has(id) && (!firstDate || date < firstDate)) firstDate = date
  }
  if (firstDate && firstDate > today) firstDate = today

  const byDow: Task[][] = Array.from({ length: 7 }, () => [])
  for (const t of tasks) byDow[t.day_of_week].push(t)

  const dayStat = (date: ISODate): DayStat => {
    let scheduled = 0
    let completed = 0
    for (const t of byDow[dayOfWeek(date)]) {
      if (!isScheduled(t, created.get(t.id)!, date, completions)) continue
      scheduled++
      if (completions[completionKey(t.id, date)]) completed++
    }
    return { date, scheduled, completed }
  }

  const daily: DayStat[] = []
  if (firstDate) {
    for (let d = firstDate; d <= today; d = addDays(d, 1)) daily.push(dayStat(d))
  }

  const totalsScheduled = daily.reduce((a, d) => a + d.scheduled, 0)
  const totalsCompleted = daily.reduce((a, d) => a + d.completed, 0)

  const weekStartDate = startOfWeek(today, weekStart)
  const week = Array.from({ length: 7 }, (_, i) => dayStat(addDays(weekStartDate, i)))
  const weekScheduled = week.reduce((a, d) => a + d.scheduled, 0)
  const weekCompleted = week.reduce((a, d) => a + d.completed, 0)

  // A day counts toward the streak when everything scheduled that day was done.
  const perfectDays = daily
    .filter((d) => d.scheduled > 0)
    .map((d) => ({ date: d.date, done: d.completed === d.scheduled }))

  // Habits = tasks grouped by title, so "Exercise" on Mon/Wed/Fri is one habit.
  const groups = new Map<string, Task[]>()
  for (const t of tasks) {
    const k = habitKey(t.title)
    const g = groups.get(k)
    if (g) g.push(t)
    else groups.set(k, [t])
  }

  const habits: HabitStat[] = []
  for (const [key, group] of groups) {
    const history: { date: ISODate; done: boolean }[] = []
    for (const d of daily) {
      let any = false
      let all = true
      for (const t of group) {
        if (!isScheduled(t, created.get(t.id)!, d.date, completions)) continue
        any = true
        if (!completions[completionKey(t.id, d.date)]) all = false
      }
      if (any) history.push({ date: d.date, done: all })
    }
    const completedDays = history.filter((h) => h.done).length
    habits.push({
      key,
      title: group[0].title.trim(),
      category: group[0].category,
      taskIds: group.map((t) => t.id),
      scheduledDays: history.length,
      completedDays,
      rate: rate(completedDays, history.length),
      streak: streaks(history, today),
      history,
    })
  }
  habits.sort((a, b) => b.rate - a.rate || b.completedDays - a.completedDays || a.title.localeCompare(b.title))

  return {
    firstDate,
    today: dayStat(today),
    week,
    totals: { scheduled: totalsScheduled, completed: totalsCompleted, rate: rate(totalsCompleted, totalsScheduled) },
    weekTotals: { scheduled: weekScheduled, completed: weekCompleted, rate: rate(weekCompleted, weekScheduled) },
    streak: streaks(perfectDays, today),
    daily,
    habits,
  }
}
