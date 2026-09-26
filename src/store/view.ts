import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { addDays, todayISO, type ISODate } from '../lib/dates'
import type { TimeFormat, WeekStart } from '../lib/types'
import { useAuth } from './auth'

/** Which date the timetable is focused on; the visible week is derived from it. */
interface ViewState {
  selectedDate: ISODate
  setDate: (d: ISODate) => void
  shiftWeek: (dir: -1 | 1) => void
  goToday: () => void
}

export const useView = create<ViewState>((set, get) => ({
  selectedDate: todayISO(),
  setDate: (selectedDate) => set({ selectedDate }),
  shiftWeek: (dir) => set({ selectedDate: addDays(get().selectedDate, dir * 7) }),
  goToday: () => set({ selectedDate: todayISO() }),
}))

export function usePrefs(): { weekStart: WeekStart; timeFormat: TimeFormat } {
  const weekStart = useAuth((s) => s.profile?.week_start ?? 0)
  const timeFormat = useAuth((s) => s.profile?.time_format ?? '12h')
  return { weekStart, timeFormat }
}

/** Current local date that rolls over at midnight. */
export function useToday(): ISODate {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 30_000)
    const onVisible = () => document.visibilityState === 'visible' && setToday(todayISO())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return today
}
