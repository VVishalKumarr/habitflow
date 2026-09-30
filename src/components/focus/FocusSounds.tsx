import { CloudRain, Coffee, Lock, Pause, Play, Trees, Volume2, Waves, Wind } from 'lucide-react'
import { SOUNDS, type SoundId } from '../../config/sounds'
import { useFocusSound } from '../../store/focusSound'
import { useFeatureAccess } from '../../store/subscription'

const ICONS: Record<SoundId, typeof CloudRain> = { rain: CloudRain, white_noise: Wind, ocean: Waves, forest: Trees, cafe: Coffee }

/** Background sounds while focusing (Pro). */
export function FocusSounds() {
  const { hasFeature, requireFeature } = useFeatureAccess()
  const playing = useFocusSound((s) => s.playing)
  const volume = useFocusSound((s) => s.volume)
  const { play, stop, setVolume } = useFocusSound.getState()
  const allowed = hasFeature('focus_sounds')

  const toggle = (id: SoundId) => {
    if (!requireFeature('focus_sounds', { clientOnly: true })) return
    if (playing === id) stop()
    else play(id)
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="focus-sounds">
      <h2 id="focus-sounds" className="flex items-center gap-2 font-semibold">
        Focus Sounds
        {!allowed && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-ink">Pro</span>}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SOUNDS.map((s) => {
          const Icon = ICONS[s.id]
          const on = playing === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              aria-pressed={on}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                on ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line hover:bg-subtle'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">{s.label}</span>
              {!allowed ? (
                <Lock className="size-3.5 text-muted" aria-label="Pro" />
              ) : on ? (
                <Pause className="size-3.5" aria-label="Playing — tap to pause" />
              ) : (
                <Play className="size-3.5 text-muted" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
      {allowed && (
        <div className="mt-4 flex items-center gap-3">
          <Volume2 className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <label htmlFor="sound-volume" className="sr-only">
            Volume
          </label>
          <input
            id="sound-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full accent-[var(--brand)]"
          />
        </div>
      )}
    </section>
  )
}
