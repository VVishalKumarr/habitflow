import { useId, useState, type FormEvent } from 'react'
import { CATEGORY_STYLE } from '../../lib/category'
import { DAY_NAMES, orderedDays } from '../../lib/dates'
import { formatSlot } from '../../lib/time'
import { CATEGORIES, type Category } from '../../lib/types'
import type { TaskFormState } from '../../store/dialogs'
import { useTrackerData } from '../../store/trackerData'
import { toast } from '../../store/ui'
import { usePrefs } from '../../store/view'
import { Field } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/Spinner'

/** Add, edit (incl. moving to another day/slot) or duplicate a task. */
export function TaskFormModal({ form, onClose }: { form: TaskFormState; onClose: () => void }) {
  const slots = useTrackerData((s) => s.slots)
  const source = useTrackerData((s) => (form.mode === 'add' ? undefined : s.tasks.find((t) => t.id === form.taskId)))
  const addTask = useTrackerData((s) => s.addTask)
  const updateTask = useTrackerData((s) => s.updateTask)
  const { weekStart, timeFormat } = usePrefs()
  const ids = { day: useId(), slot: useId(), desc: useId() }

  const [title, setTitle] = useState(source ? (form.mode === 'duplicate' ? source.title : source.title) : '')
  const [description, setDescription] = useState(source?.description ?? '')
  const [category, setCategory] = useState<Category>(source?.category ?? 'other')
  const [day, setDay] = useState<number>(
    form.mode === 'add' ? form.day : form.mode === 'duplicate' && source ? (source.day_of_week + 1) % 7 : (source?.day_of_week ?? 0),
  )
  const [slotId, setSlotId] = useState(form.mode === 'add' ? form.slotId : (source?.time_slot_id ?? slots[0]?.id ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (form.mode !== 'add' && !source) return null
  const slot = slots.find((s) => s.id === slotId)

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const clean = title.trim()
    if (!clean) return setError('Task name is required.')
    if (clean.length > 100) return setError('Task name must be at most 100 characters.')
    setError(null)
    setBusy(true)
    const input = { title: clean, description: description.trim() || null, category, day_of_week: day, time_slot_id: slotId }
    try {
      if (form.mode === 'edit') {
        await updateTask(form.taskId, input)
        toast.success('Task updated.')
      } else {
        await addTask(input)
        toast.success(form.mode === 'duplicate' ? `Duplicated to ${DAY_NAMES[day]}.` : 'Task added.')
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
      setBusy(false)
    }
  }

  const title_ = form.mode === 'add' ? 'Add task' : form.mode === 'edit' ? 'Edit task' : 'Duplicate task'
  const subtitle = slot ? `${DAY_NAMES[day]} · ${formatSlot(slot, timeFormat)}` : DAY_NAMES[day]

  return (
    <Modal
      open
      onClose={onClose}
      title={title_}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn-primary" disabled={busy}>
            {busy && <Spinner className="size-4" />}
            {form.mode === 'add' ? 'Add task' : form.mode === 'edit' ? 'Save changes' : 'Duplicate'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} noValidate className="space-y-4">
        <Field
          label="Task name"
          placeholder="e.g. Study Mathematics"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          error={error}
        />

        <div>
          <label htmlFor={ids.desc} className="field-label">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id={ids.desc}
            className="input h-auto min-h-20 resize-y py-2.5"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="field-label">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const selected = c.value === category
              return (
                <label
                  key={c.value}
                  className={`flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                    selected ? 'border-brand bg-brand-soft font-medium text-brand-ink' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.value}
                    checked={selected}
                    onChange={() => setCategory(c.value)}
                    className="sr-only"
                  />
                  <span className={`size-2.5 rounded-full ${CATEGORY_STYLE[c.value].dot}`} aria-hidden="true" />
                  {c.label}
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids.day} className="field-label">
              Day
            </label>
            <select id={ids.day} className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {orderedDays(weekStart).map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.slot} className="field-label">
              Time
            </label>
            <select id={ids.slot} className="input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatSlot(s, timeFormat)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-muted">Repeats every {DAY_NAMES[day]}. Completion is tracked separately for each date.</p>
      </form>
    </Modal>
  )
}
