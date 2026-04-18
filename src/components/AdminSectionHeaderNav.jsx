import { NavLink } from 'react-router-dom'

function navClass(isActive) {
  return `inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-red-900 text-white shadow-sm shadow-red-900/20'
      : 'text-slate-600 hover:bg-white hover:text-slate-900'
  }`
}

export default function AdminSectionHeaderNav() {
  return (
    <div className="flex w-full justify-center md:justify-end">
      <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
        <NavLink to="/admin/dashboard" className={({ isActive }) => navClass(isActive)}>
          Dashboard
        </NavLink>
        <NavLink to="/admin/sales-logs" className={({ isActive }) => navClass(isActive)}>
          Sales Logs
        </NavLink>
        <NavLink to="/admin/service-logs" className={({ isActive }) => navClass(isActive)}>
          Service Logs
        </NavLink>
      </div>
    </div>
  )
}
