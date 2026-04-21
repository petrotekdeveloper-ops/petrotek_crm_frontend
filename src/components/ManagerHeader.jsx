import { Link, useLocation } from 'react-router-dom'

const inactiveTab =
  'rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:px-3 sm:py-1.5'
const activeTab =
  'rounded-md bg-white px-2.5 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200/80 sm:px-3 sm:py-1.5'

/**
 * Manager section switcher. Active state is derived from the URL so nested routes
 * (e.g. /manager/team/rep/:id) do not incorrectly highlight "Daily activity".
 */
export default function ManagerHeader({ endSlot = null }) {
  const { pathname } = useLocation()
  const teamDailyActive = pathname === '/'
  const myLogsActive = pathname === '/manager/my-daily'
  const teamActive =
    pathname === '/manager/team' || pathname.startsWith('/manager/team/')

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
      <nav
        className="flex w-full min-w-0 items-stretch gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto sm:items-center"
        aria-label="Manager sections"
      >
        <Link
          to="/"
          className={`${teamDailyActive ? activeTab : inactiveTab} min-h-[44px] flex-1 text-center sm:min-h-0 sm:flex-none`}
          aria-current={teamDailyActive ? 'page' : undefined}
        >
          Team daily
        </Link>
        <Link
          to="/manager/my-daily"
          className={`${myLogsActive ? activeTab : inactiveTab} min-h-[44px] flex-1 text-center sm:min-h-0 sm:flex-none`}
          aria-current={myLogsActive ? 'page' : undefined}
        >
          My logs
        </Link>
        <Link
          to="/manager/team"
          className={`${teamActive ? activeTab : inactiveTab} min-h-[44px] flex-1 text-center sm:min-h-0 sm:flex-none`}
          aria-current={teamActive ? 'page' : undefined}
        >
          Targets & team
        </Link>
      </nav>
      {endSlot ? (
        <div className="flex w-full min-w-0 justify-center sm:w-auto sm:justify-end">{endSlot}</div>
      ) : null}
    </div>
  )
}
