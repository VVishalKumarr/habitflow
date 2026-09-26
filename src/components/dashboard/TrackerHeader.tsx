import { Check, ChevronsUpDown, EllipsisVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { dialogs } from '../../store/dialogs'
import { useTrackers } from '../../store/trackers'
import { Dropdown, MenuDivider, MenuItem } from '../ui/Dropdown'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

/** Tracker switcher: lists all trackers, lets you jump between them. */
export function TrackerSelector() {
  const trackers = useTrackers((s) => s.trackers)
  const selectedId = useTrackers((s) => s.selectedId)
  const select = useTrackers((s) => s.select)

  return (
    <Dropdown
      id="tracker-switcher"
      menuClassName="w-72 max-w-[calc(100vw-2rem)]"
      trigger={({ open, toggle, id }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={id} className="btn-secondary h-10">
          <ChevronsUpDown className="size-4 text-muted" aria-hidden="true" />
          Switch tracker
        </button>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pt-2 pb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">My trackers</p>
          <div className="max-h-72 overflow-y-auto">
            {trackers.map((t) => (
              <MenuItem
                key={t.id}
                active={t.id === selectedId}
                icon={t.id === selectedId ? <Check /> : <span />}
                onClick={() => {
                  select(t.id)
                  close()
                }}
              >
                {t.name}
              </MenuItem>
            ))}
          </div>
          <MenuDivider />
          <MenuItem icon={<Plus />} onClick={() => (close(), dialogs.createTracker())}>
            Create new tracker
          </MenuItem>
        </>
      )}
    </Dropdown>
  )
}

export function TrackerHeader({ username }: { username: string }) {
  const tracker = useTrackers((s) => s.trackers.find((t) => t.id === s.selectedId))
  if (!tracker) return null

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-muted">
          {greeting()}, <span className="font-medium text-ink">{username}</span>
        </p>
        <div className="mt-1 flex items-center gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{tracker.name}</h1>
          <button type="button" className="icon-btn hidden sm:inline-flex" onClick={() => dialogs.renameTracker(tracker.id)} aria-label="Rename tracker">
            <Pencil className="size-4" />
          </button>
          <Dropdown
            id="tracker-actions"
            align="right"
            className="ml-auto sm:hidden"
            trigger={({ open, toggle, id }) => (
              <button type="button" className="icon-btn" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={id} aria-label="Tracker options">
                <EllipsisVertical className="size-5" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Pencil />} onClick={() => (close(), dialogs.renameTracker(tracker.id))}>
                  Rename tracker
                </MenuItem>
                <MenuItem icon={<Trash2 />} danger onClick={() => (close(), dialogs.deleteTracker(tracker.id))}>
                  Delete tracker
                </MenuItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TrackerSelector />
        <button type="button" className="btn-primary h-10" onClick={dialogs.createTracker}>
          <Plus className="size-4" aria-hidden="true" />
          New tracker
        </button>
        <button
          type="button"
          className="icon-btn hidden border border-line hover:border-danger/40 hover:bg-danger-soft hover:text-danger sm:inline-flex"
          onClick={() => dialogs.deleteTracker(tracker.id)}
          aria-label="Delete tracker"
          title="Delete tracker"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
