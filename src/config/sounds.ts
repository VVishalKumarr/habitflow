import { env } from './env'

export type SoundId = 'rain' | 'white_noise' | 'ocean' | 'forest' | 'cafe'

export interface SoundDef {
  id: SoundId
  label: string
  /** 'generated' sounds are synthesised in the browser (no audio files, no licensing). */
  kind: 'generated' | 'file'
  /** For 'file' sounds: URL of a looping audio file you have the rights to use. */
  url?: string
}

/**
 * Rain, white noise and ocean are generated live with the Web Audio API.
 * Forest and café need real recordings: set VITE_SOUND_FOREST_URL /
 * VITE_SOUND_CAFE_URL to properly licensed loops (e.g. CC0 files you host).
 * Sounds without a source are hidden rather than faked.
 */
export const SOUNDS: SoundDef[] = [
  { id: 'rain', label: 'Rain', kind: 'generated' },
  { id: 'white_noise', label: 'White noise', kind: 'generated' },
  { id: 'ocean', label: 'Ocean', kind: 'generated' },
  { id: 'forest', label: 'Forest', kind: 'file', url: env('VITE_SOUND_FOREST_URL') },
  { id: 'cafe', label: 'Café', kind: 'file', url: env('VITE_SOUND_CAFE_URL') },
].filter((s) => s.kind === 'generated' || s.url) as SoundDef[]
