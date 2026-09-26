import { ChartNoAxesColumn, ChevronDown, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { Dropdown, MenuDivider, MenuItem } from '../ui/Dropdown'
import { Logo } from './Logo'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/progress', label: 'Progress', icon: ChartNoAxesColumn },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function UserMenu() {
  const username = useAuth((s) => s.profile?.username ?? '')
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()

  return (
    <Dropdown
      id="user-menu"
      align="right"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={id}
          className="flex h-10 items-center gap-2 rounded-xl pr-2 pl-1 transition-colors hover:bg-subtle"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-ink uppercase">
            {username.slice(0, 1)}
          </span>
          <span className="hidden max-w-32 truncate text-sm font-medium md:block">{username}</span>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
          <span className="sr-only">Account menu</span>
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-3 pt-2 pb-2.5">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="truncate font-medium">{username}</p>
          </div>
          <MenuDivider />
          <MenuItem icon={<Settings />} onClick={() => (close(), navigate('/settings'))}>
            Settings
          </MenuItem>
          <MenuItem icon={<LogOut />} danger onClick={() => (close(), signOut())}>
            Log out
          </MenuItem>
        </>
      )}
    </Dropdown>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <NavLink to="/dashboard" aria-label="HabitFlow home" className="rounded-lg">
            <Logo />
          </NavLink>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-subtle hover:text-ink'
                  }`
                }
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-8 md:pb-12 lg:px-8">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-brand-soft' : ''}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
