import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ADMIN_TOKEN_KEY, api, TOKEN_KEY } from './api'
import Login from './pages/Login.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminServiceLogs from './pages/admin/AdminServiceLogs.jsx'
import AdminSalesLogs from './pages/admin/AdminSalesLogs.jsx'
import FinanceLogin from './pages/finance/FinanceLogin.jsx'
import FinanceSalesLogs from './pages/finance/FinanceSalesLogs.jsx'
import SalesDashboard from './pages/sales/SalesDashboard.jsx'
import DriverDashboard from './pages/driver/DriverDashboard.jsx'
import ServiceDashboard from './pages/service/ServiceDashboard.jsx'
import ManagerDashboard from './pages/manager/ManagerDashboard.jsx'
import ManagerTeamOverview from './pages/manager/ManagerTeamOverview.jsx'
import ManagerRepDetail from './pages/manager/ManagerRepDetail.jsx'
import ManagerMyDailyActivity from './pages/manager/ManagerMyDailyActivity.jsx'
import ManagerServiceHeadAmounts from './pages/manager/ManagerServiceHeadAmounts.jsx'
import ChatPage from './pages/chat/ChatPage.jsx'

function AdminChatApp() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <ChatPage
      mode="admin"
      user={{ name: 'Administrator', designation: 'admin' }}
      onLogout={() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
      }}
    />
  )
}

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
            path="/chat"
            element={
              <ChatPage
                mode="user"
                user={user}
                onLogout={handleLogout}
              />
            }
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
            path="/manager/my-daily"
            element={<ManagerMyDailyActivity user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/manager/team"
            element={<ManagerTeamOverview user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/manager/service-amounts"
            element={<ManagerServiceHeadAmounts user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/chat"
            element={
              <ChatPage
                mode="user"
                user={user}
                onLogout={handleLogout}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )
    }
    if (user.designation === 'driver') {
      return <DriverDashboard user={user} onLogout={handleLogout} />
    }
    if (user.designation === 'service') {
      return <ServiceDashboard user={user} onLogout={handleLogout} />
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
      <Route path="/admin/chat" element={<AdminChatApp />} />
      <Route path="/admin/sales-logs" element={<AdminSalesLogs />} />
      <Route path="/admin/service-logs" element={<AdminServiceLogs />} />
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/finance/login" element={<FinanceLogin />} />
      <Route path="/finance/sales-logs" element={<FinanceSalesLogs />} />
      <Route path="/finance" element={<Navigate to="/finance/login" replace />} />
      <Route path="/*" element={<UserApp />} />
    </Routes>
  )
}
