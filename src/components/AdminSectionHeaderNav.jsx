import { NavLink } from 'react-router-dom'

function navClass(isActive) {
  return `inline-flex items-center px-1 py-2 text-sm font-medium transition ${
    isActive
      ? 'text-blue-700 underline decoration-blue-700 decoration-2 underline-offset-[10px]'
      : 'text-slate-500 hover:text-slate-800'
  }`
}

export default function AdminSectionHeaderNav() {
  return (
    <nav
      className="flex w-full min-w-0 flex-wrap items-center gap-x-6 gap-y-1 sm:gap-x-8"
      aria-label="Admin sections"
    >
      <NavLink to="/admin/sales-logs" className={({ isActive }) => navClass(isActive)}>
        Dashboard
      </NavLink>
      <NavLink to="/admin/dashboard" className={({ isActive }) => navClass(isActive)}>
        User management
      </NavLink>
      <NavLink to="/admin/service-logs" className={({ isActive }) => navClass(isActive)}>
        Service Logs
      </NavLink>
      <NavLink to="/admin/chat" className={({ isActive }) => navClass(isActive)}>
        Chat
      </NavLink>
    </nav>
  )
}
