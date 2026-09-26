import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useUI } from '../../store/ui'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const TONE = { success: 'text-success', error: 'text-danger', info: 'text-brand' }

export function Toaster() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className="animate-sheet pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-pop"
          >
            <Icon className={`mt-0.5 size-5 shrink-0 ${TONE[t.kind]}`} aria-hidden="true" />
            <p className="flex-1 leading-snug">{t.message}</p>
            <button type="button" className="-m-1 rounded-md p-1 text-muted hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
