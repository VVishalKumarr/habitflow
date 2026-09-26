import { useEffect, useRef, useState, type ReactNode } from 'react'
import { pushBackHandler } from '../../store/ui'

interface DropdownProps {
  /** Render prop for the trigger button. */
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
  menuClassName?: string
  id: string
}

/** Minimal accessible popover menu (click-outside, Escape and Android back close it). */
export function Dropdown({ trigger, children, align = 'left', className = '', menuClassName = '', id }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const removeBack = pushBackHandler(() => setOpen(false))
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    // Move focus into the menu for keyboard users.
    requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[role="menu"] button')?.focus())
    return () => {
      removeBack()
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menu"] button:not([disabled])') ?? [])
    const i = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div
          id={id}
          role="menu"
          onKeyDown={onMenuKey}
          className={`animate-sheet absolute top-full z-40 mt-2 min-w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  active,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick: () => void
  danger?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none ${
        danger ? 'text-danger' : active ? 'font-medium text-brand' : 'text-ink'
      }`}
    >
      {icon && <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-[18px]">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}

export const MenuDivider = () => <div className="my-1.5 h-px bg-line" role="separator" />
