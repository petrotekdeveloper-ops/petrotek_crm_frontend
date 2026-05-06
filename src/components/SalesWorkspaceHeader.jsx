/**
 * Sales workspace header with single merged page navigation.
 */
import { NavLink } from 'react-router-dom'

function navClass(isActive) {
  return `inline-flex items-center px-1 py-2 text-sm font-medium transition ${
    isActive
      ? 'text-blue-700 underline decoration-blue-700 decoration-2 underline-offset-[10px]'
      : 'text-slate-500 hover:text-slate-800'
  }`
}

export default function SalesWorkspaceHeader({ endSlot = null }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <nav
        className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-1 sm:gap-x-8"
        aria-label="Sales sections"
      >
        <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
          Dashboard
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => navClass(isActive)}>
          Chat
        </NavLink>
      </nav>
      {endSlot ? (
        <div className="flex w-full min-w-0 justify-center sm:w-auto sm:justify-end">
          {endSlot}
        </div>
      ) : null}
    </div>
  )
}
