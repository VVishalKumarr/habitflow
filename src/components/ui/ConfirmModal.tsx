import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Spinner } from './Spinner'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => Promise<void> | void
  onClose: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onClose }: ConfirmModalProps) {
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={confirm} disabled={busy}>
            {busy && <Spinner className="size-4" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-muted">{message}</div>
    </Modal>
  )
}
