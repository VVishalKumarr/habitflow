import { create } from 'zustand'

/**
 * Pricing region. 'IN' shows Indian prices (₹); 'default' covers everywhere
 * else (US$). Detected from the device time zone, and the visitor can switch.
 * Add a region by adding its key to plans.prices in the database and a rule here.
 */
export type Region = 'IN' | 'default'

const KEY = 'habitflow-region'

function detect(): Region {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'IN' || saved === 'default') return saved
  } catch {
    /* storage unavailable */
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'IN'
  } catch {
    /* fall through */
  }
  return 'default'
}

interface RegionState {
  region: Region
  setRegion: (r: Region) => void
}

export const useRegion = create<RegionState>((set) => ({
  region: detect(),
  setRegion: (region) => {
    try {
      localStorage.setItem(KEY, region)
    } catch {
      /* ignore */
    }
    set({ region })
  },
}))

export const REGION_LABEL: Record<Region, string> = { IN: 'India (₹)', default: 'International ($)' }
