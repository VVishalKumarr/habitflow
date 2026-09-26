import { useMemo } from 'react'
import type { Task } from '../../lib/types'
import { useTrackerData } from '../../store/trackerData'

export const cellKey = (slotId: string, day: number) => `${slotId}|${day}`

/** Tasks grouped by timetable cell ("<slotId>|<weekday>"). Stable while tasks don't change. */
export function useCellMap(): Map<string, Task[]> {
  const tasks = useTrackerData((s) => s.tasks)
  return useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const k = cellKey(t.time_slot_id, t.day_of_week)
      const list = map.get(k)
      if (list) list.push(t)
      else map.set(k, [t])
    }
    return map
  }, [tasks])
}
