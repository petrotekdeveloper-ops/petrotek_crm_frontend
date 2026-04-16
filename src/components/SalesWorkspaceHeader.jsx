import { Link, useLocation } from 'react-router-dom'

const inactiveTab =
  'rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:px-3 sm:py-1.5'
const activeTab =
  'rounded-md bg-white px-2.5 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5'

/**
 * Sales section switcher: home = performance + log entry, activity = daily logs list.
 */
export default function SalesWorkspaceHeader({ endSlot = null }) {
  const { pathname } = useLocation()
  const perfActive = pathname === '/' || pathname === ''
  const activityActive = pathname === '/sales/activity'

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      <nav
        className="flex w-full min-w-0 items-stretch gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto sm:items-center"
        aria-label="Sales sections"
      >
        <Link
          to="/"
          className={`${perfActive ? activeTab : inactiveTab} min-h-[44px] flex-1 text-center sm:min-h-0 sm:flex-none`}
          aria-current={perfActive ? 'page' : undefined}
        >
          Performance
        </Link>
        <Link
          to="/sales/activity"
          className={`${activityActive ? activeTab : inactiveTab} min-h-[44px] flex-1 text-center sm:min-h-0 sm:flex-none`}
          aria-current={activityActive ? 'page' : undefined}
        >
          Daily activity
        </Link>
      </nav>
      {endSlot ? (
        <div className="flex w-full min-w-0 justify-center sm:w-auto sm:justify-end">{endSlot}</div>
      ) : null}
    </div>
  )
}
