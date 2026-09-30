import { create } from 'zustand'
import { SOUNDS, type SoundId } from '../config/sounds'

// Rain / white noise / ocean are synthesised with the Web Audio API, so no
// audio files (or licences) are needed. Forest / café play a configured file.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let stopCurrent: (() => void) | null = null

function audio(): { ctx: AudioContext; master: GainNode } {
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctx()
    master = ctx.createGain()
    master.connect(ctx.destination)
  }
  return { ctx, master: master! }
}

function noiseBuffer(c: AudioContext, colour: 'white' | 'pink' | 'brown'): AudioBuffer {
  const len = c.sampleRate * 4
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (colour === 'white') d[i] = w * 0.5
      else if (colour === 'brown') {
        last = (last + 0.02 * w) / 1.02
        d[i] = last * 3.5
      } else {
        // Paul Kellet's pink noise filter
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.969 * b2 + w * 0.153852
        b3 = 0.8665 * b3 + w * 0.3104856
        b4 = 0.55 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.016898
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
        b6 = w * 0.115926
      }
    }
  }
  return buf
}

function startGenerated(id: SoundId): () => void {
  const { ctx: c, master: out } = audio()
  const src = c.createBufferSource()
  src.loop = true
  const nodes: AudioNode[] = []
  const chain = (...n: AudioNode[]) => {
    let prev: AudioNode = src
    for (const x of n) {
      prev.connect(x)
      prev = x
      nodes.push(x)
    }
    prev.connect(out)
  }

  if (id === 'white_noise') {
    src.buffer = noiseBuffer(c, 'white')
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 9000
    chain(lp)
  } else if (id === 'rain') {
    src.buffer = noiseBuffer(c, 'pink')
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 500
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 7000
    chain(hp, lp)
  } else {
    // ocean: brown noise swelling like waves
    src.buffer = noiseBuffer(c, 'brown')
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1100
    const swell = c.createGain()
    swell.gain.value = 0.55
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.09
    const depth = c.createGain()
    depth.gain.value = 0.4
    lfo.connect(depth)
    depth.connect(swell.gain)
    lfo.start()
    nodes.push(lfo)
    chain(lp, swell)
  }
  src.start()
  return () => {
    try {
      src.stop()
    } catch {
      /* already stopped */
    }
    src.disconnect()
    for (const n of nodes) {
      if (n instanceof OscillatorNode) n.stop()
      n.disconnect()
    }
  }
}

function startFile(url: string): () => void {
  const { ctx: c, master: out } = audio()
  const el = new Audio(url)
  el.loop = true
  el.crossOrigin = 'anonymous'
  const node = c.createMediaElementSource(el)
  node.connect(out)
  el.play().catch(() => {})
  return () => {
    el.pause()
    node.disconnect()
  }
}

interface FocusSoundState {
  playing: SoundId | null
  volume: number
  play: (id: SoundId) => void
  stop: () => void
  setVolume: (v: number) => void
}

const VOL_KEY = 'habitflow-sound-volume'

export const useFocusSound = create<FocusSoundState>((set, get) => ({
  playing: null,
  volume: (() => {
    try {
      const v = Number(localStorage.getItem(VOL_KEY))
      return v > 0 && v <= 1 ? v : 0.5
    } catch {
      return 0.5
    }
  })(),

  play: (id) => {
    const def = SOUNDS.find((s) => s.id === id)
    if (!def) return
    stopCurrent?.()
    const { ctx: c, master: out } = audio()
    c.resume().catch(() => {})
    out.gain.value = get().volume
    stopCurrent = def.kind === 'file' && def.url ? startFile(def.url) : startGenerated(id)
    set({ playing: id })
  },

  stop: () => {
    stopCurrent?.()
    stopCurrent = null
    set({ playing: null })
  },

  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v))
    if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05)
    try {
      localStorage.setItem(VOL_KEY, String(volume))
    } catch {
      /* ignore */
    }
    set({ volume })
  },
}))
