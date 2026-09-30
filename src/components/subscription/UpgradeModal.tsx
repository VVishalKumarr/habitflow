import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { analytics } from '../../lib/analytics'
import { useUpgrade } from '../../store/subscription'
import { Modal } from '../ui/Modal'

/** Gentle "Pro Feature" prompt. Never blocks access to existing data. */
export function UpgradeModal() {
  const open = useUpgrade((s) => s.open)
  const message = useUpgrade((s) => s.message)
  const close = useUpgrade((s) => s.close)
  const navigate = useNavigate()

  return (
    <Modal
      open={open}
      onClose={close}
      title="Pro Feature"
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={close}>
            Maybe Later
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              analytics.track('upgrade_clicked', { source: 'upgrade_modal' })
              close()
              navigate('/pro')
            }}
          >
            See Pro Features
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Sparkles className="size-5" aria-hidden="true" />
        </span>
        <div className="text-[15px] leading-relaxed">
          <p className="font-medium">{message}</p>
          <p className="mt-1 text-muted">This feature is available with HabitFlow Pro. Everything you already have stays as it is.</p>
        </div>
      </div>
    </Modal>
  )
}
