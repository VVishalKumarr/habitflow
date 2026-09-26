import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'
export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface UIState {
  toasts: Toast[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useUI = create<UIState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++
    set({ toasts: [...get().toasts.slice(-3), { id, kind, message }] })
    setTimeout(() => get().dismiss(id), kind === 'error' ? 6000 : 3500)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (m: string) => useUI.getState().push('success', m),
  error: (m: string) => useUI.getState().push('error', m),
  info: (m: string) => useUI.getState().push('info', m),
}

/**
 * Stack of "close" handlers for open overlays. The Android back button (and
 * Escape) closes the top-most overlay before navigating.
 */
const backStack: (() => void)[] = []

export function pushBackHandler(fn: () => void) {
  backStack.push(fn)
  return () => {
    const i = backStack.lastIndexOf(fn)
    if (i >= 0) backStack.splice(i, 1)
  }
}

/** Runs the top-most handler; returns false when nothing was open. */
export function popBack(): boolean {
  const fn = backStack[backStack.length - 1]
  if (!fn) return false
  fn()
  return true
}
