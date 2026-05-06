import { NavLink } from 'react-router-dom'
import { monthLabel } from '../lib/format.js'
import seltecLogo from '../assets/seltecLogo.png'

/** `DashboardShell` props: Seltec users get Seltec logo; otherwise default Petrotek (sales workspace rule). */
export function managerShellLogoProps(user) {
  const isSeltecUser = String(user?.company || '').toLowerCase() === 'seltec'
  return {
    primaryLogoSrc: isSeltecUser ? seltecLogo : undefined,
    primaryLogoAlt: isSeltecUser ? 'Seltec' : 'Petrotek',
  }
}

function navClass(isActive) {
  return `inline-flex items-center px-1 py-2 text-sm font-medium transition ${
    isActive
      ? 'text-blue-700 underline decoration-blue-700 decoration-2 underline-offset-[10px]'
      : 'text-slate-500 hover:text-slate-800'
  }`
}

/**
 * Manager section switcher + month controls on one row (tabs left, month right).
 * Matches {@link AdminSectionHeaderNav} tab styling.
 */
export default function ManagerHeader({ year, month, goPrev, goNext }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <nav
        className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 sm:gap-x-8"
        aria-label="Manager sections"
      >
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          Team daily
        </NavLink>
        <NavLink to="/manager/my-daily" end className={({ isActive }) => navClass(isActive)}>
          My logs
        </NavLink>
        <NavLink to="/manager/team" className={({ isActive }) => navClass(isActive)}>
          Targets & team
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => navClass(isActive)}>
          Chat
        </NavLink>
      </nav>
      <div
        className="flex w-full min-w-0 shrink-0 justify-center sm:w-auto sm:justify-end"
        role="group"
        aria-label="Reporting month"
      >
        <div className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={goPrev}
            className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800 sm:min-w-[8rem] sm:flex-none">
            {monthLabel(year, month)}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
