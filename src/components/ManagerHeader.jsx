import { Link, useLocation } from 'react-router-dom'

const inactiveTab =
  'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900'
const activeTab =
  'rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80'

/**
 * Manager section switcher. Active state is derived from the URL so nested routes
 * (e.g. /manager/team/rep/:id) do not incorrectly highlight "Daily activity".
 */
export default function ManagerHeader({ endSlot = null }) {
  const { pathname } = useLocation()
  const dailyActive = pathname === '/'
  const teamActive =
    pathname === '/manager/team' || pathname.startsWith('/manager/team/')

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <nav
        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
        aria-label="Manager sections"
      >
        <Link
          to="/"
          className={dailyActive ? activeTab : inactiveTab}
          aria-current={dailyActive ? 'page' : undefined}
        >
          Daily activity
        </Link>
        <Link
          to="/manager/team"
          className={teamActive ? activeTab : inactiveTab}
          aria-current={teamActive ? 'page' : undefined}
        >
          Targets & team
        </Link>
      </nav>
      {endSlot}
    </div>
  )
}
