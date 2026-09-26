import { useMemo } from 'react'
import { computeStats, type TrackerStats } from '../lib/stats'
import { useTrackerData } from './trackerData'
import { usePrefs, useToday } from './view'

/** Derived statistics for the selected tracker; recomputed only when tasks/completions change. */
export function useTrackerStats(): TrackerStats {
  const tasks = useTrackerData((s) => s.tasks)
  const completions = useTrackerData((s) => s.completions)
  const { weekStart } = usePrefs()
  const today = useToday()
  return useMemo(() => computeStats(tasks, completions, today, weekStart), [tasks, completions, today, weekStart])
}
