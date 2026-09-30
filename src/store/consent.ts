import { create } from 'zustand'
import { adsConfig, analyticsConfig, consentConfig } from '../config'
import { isNative } from '../lib/native'

export interface ConsentChoices {
  analytics: boolean
  advertising: boolean
}

interface StoredConsent extends ConsentChoices {
  version: number
  updatedAt: string
}

interface ConsentState extends ConsentChoices {
  /** the visitor has made a choice (or no choice is needed) */
  decided: boolean
  /** the Cookie Settings dialog is open */
  settingsOpen: boolean
  save: (choices: ConsentChoices) => void
  openSettings: () => void
  closeSettings: () => void
}

const KEY = 'habitflow-consent'

/** EEA, UK and Switzerland time zones: opt-in consent is required there. */
const STRICT_TZ = /^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Azores|Faroe)|Arctic\/Longyearbyen)/

function inStrictRegion(): boolean {
  try {
    return STRICT_TZ.test(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '')
  } catch {
    return true
  }
}

/** Anything optional configured at all? If not, there is nothing to consent to. */
export const optionalTechConfigured = () =>
  analyticsConfig.provider !== 'none' || (!isNative && Boolean(adsConfig.adsenseClientId))

export const consentRequired = () => consentConfig.mode === 'all' || inStrictRegion()

function read(): StoredConsent | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as StoredConsent | null
    return s && s.version === consentConfig.version ? s : null
  } catch {
    return null
  }
}

function initial(): ConsentChoices & { decided: boolean } {
  const saved = read()
  if (saved) return { analytics: saved.analytics, advertising: saved.advertising, decided: true }
  if (!optionalTechConfigured()) return { analytics: false, advertising: false, decided: true }
  if (!consentRequired()) return { analytics: true, advertising: true, decided: true }
  return { analytics: false, advertising: false, decided: false }
}

export const useConsent = create<ConsentState>((set) => ({
  ...initial(),
  settingsOpen: false,
  save: (choices) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...choices, version: consentConfig.version, updatedAt: new Date().toISOString() }))
    } catch {
      /* storage unavailable: the choice applies to this visit only */
    }
    set({ ...choices, decided: true, settingsOpen: false })
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
