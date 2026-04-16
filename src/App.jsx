import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api, TOKEN_KEY } from './api'
import Login from './pages/Login.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import SalesDashboard from './pages/sales/SalesDashboard.jsx'
import SalesDailyActivity from './pages/sales/SalesDailyActivity.jsx'
import DriverDashboard from './pages/driver/DriverDashboard.jsx'
import ManagerDashboard from './pages/manager/ManagerDashboard.jsx'
import ManagerTeamOverview from './pages/manager/ManagerTeamOverview.jsx'
import ManagerRepDetail from './pages/manager/ManagerRepDetail.jsx'

function UserApp() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/api/users/me')
      setUser(data.user ?? null)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setChecking(false)
      return
    }
    loadMe().finally(() => setChecking(false))
  }, [loadMe])

  function handleLoggedIn() {
    loadMe()
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Loading…
      </div>
    )
  }

  if (user) {
    if (user.designation === 'sales') {
      return (
        <Routes>
          <Route
            path="/"
            element={<SalesDashboard user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/sales/activity"
            element={<SalesDailyActivity user={user} onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )
    }
    if (user.designation === 'manager') {
      return (
        <Routes>
          <Route
            path="/"
            element={<ManagerDashboard user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/manager/team/rep/:repId"
            element={<ManagerRepDetail user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/manager/team"
            element={<ManagerTeamOverview user={user} onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )
    }
    if (user.designation === 'driver') {
      return <DriverDashboard user={user} onLogout={handleLogout} />
    }
    return (
      <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">CRM</p>
              <h1 className="text-lg font-semibold">Welcome</h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-600">Signed in as</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500 capitalize">{user.designation}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              A dedicated dashboard for your role is not available in this app yet. Use admin tools or
              contact your administrator if you need access to other features.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <Login onLoggedIn={handleLoggedIn} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/*" element={<UserApp />} />
    </Routes>
  )
}
