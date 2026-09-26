import type { Category } from './types'

/** Static class names per category (kept literal so Tailwind can see them). */
export const CATEGORY_STYLE: Record<Category, { dot: string; bar: string; label: string }> = {
  study: { dot: 'bg-cat-study', bar: 'border-l-cat-study', label: 'Study' },
  exercise: { dot: 'bg-cat-exercise', bar: 'border-l-cat-exercise', label: 'Exercise' },
  work: { dot: 'bg-cat-work', bar: 'border-l-cat-work', label: 'Work' },
  personal: { dot: 'bg-cat-personal', bar: 'border-l-cat-personal', label: 'Personal' },
  other: { dot: 'bg-cat-other', bar: 'border-l-cat-other', label: 'Other' },
}
