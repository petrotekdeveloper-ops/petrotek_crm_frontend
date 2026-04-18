import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { formatMoney } from '../../lib/format.js'

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function StatCard({ label, value, hint, accent = 'slate' }) {
  const accents = {
    red: 'border-red-200/70 bg-gradient-to-br from-red-50 via-white to-red-100/60',
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60',
    emerald: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60',
    amber: 'border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/60',
    slate: 'border-slate-200/80 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/70',
  }
  const accentClass = accents[accent] ?? accents.slate
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:mt-2 sm:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

export default function AdminSalesLogs() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)

  const [salesUsers, setSalesUsers] = useState([])
  const [selectedSalesUserId, setSelectedSalesUserId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const selectedUser = useMemo(
    () => salesUsers.find((u) => u._id === selectedSalesUserId) || null,
    [salesUsers, selectedSalesUserId]
  )
  const topPerformer = summary?.topSalesUsers?.[0] ?? null

  const loadSalesUsers = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/api/admin/sales-users')
      setSalesUsers(Array.isArray(data?.salesUsers) ? data.salesUsers : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
        return
      }
      setSalesUsers([])
    }
  }, [navigate])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ date })
    if (selectedSalesUserId) params.set('salesUserId', selectedSalesUserId)
    try {
      const [{ data: logsData }, { data: summaryData }] = await Promise.all([
        adminApi.get(`/api/admin/sales-logs?${params.toString()}`),
        adminApi.get(`/api/admin/sales-logs/summary?${params.toString()}`),
      ])
      setRows(Array.isArray(logsData?.dailySales) ? logsData.dailySales : [])
      setSummary(summaryData?.summary ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
        return
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to load daily sales logs.')
      setSummary(null)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [date, navigate, selectedSalesUserId])

  useEffect(() => {
    loadSalesUsers()
  }, [loadSalesUsers])

  useEffect(() => {
    loadData()
  }, [loadData])

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/admin/login', { replace: true })
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <DashboardShell
      badge="Administration"
      title="Daily sales logs"
      subtitle="Monitor sales team activity by date"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actions={<AdminSectionHeaderNav />}
    >
      {error ? (
        <div className="mb-4 break-words rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm sm:mb-6">
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:w-auto sm:max-w-[11rem] sm:text-sm"
          />
          <select
            value={selectedSalesUserId}
            onChange={(e) => setSelectedSalesUserId(e.target.value)}
            className="min-h-[44px] w-full max-w-[12rem] min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:w-auto sm:max-w-[13rem] sm:text-sm"
          >
            <option value="">All sales users</option>
            {salesUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.phone})
              </option>
            ))}
          </select>
          {selectedUser ? (
            <p className="text-sm leading-snug text-slate-600 sm:ml-1">
              Viewing:{' '}
              <span className="font-semibold text-slate-900">{selectedUser.name}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500 sm:ml-1">Viewing all sales users for this date.</p>
          )}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total logs"
          value={loading ? '…' : String(summary?.totalLogs ?? 0)}
          hint="Entries logged on selected date"
          accent="red"
        />
        <StatCard
          label="Total amount"
          value={loading ? '…' : formatMoney(summary?.totalAmount ?? 0)}
          hint="Combined sales value"
          accent="indigo"
        />
        <StatCard
          label="Top performer"
          value={loading ? '…' : topPerformer?.salesUserName || '—'}
          hint={
            loading
              ? 'Loading top performer...'
              : topPerformer
                ? `${formatMoney(topPerformer.totalAmount)} across ${topPerformer.logCount} logs`
                : 'No performer data for this date'
          }
          accent="emerald"
        />
        <StatCard
          label="Active sales users"
          value={loading ? '…' : String(summary?.activeSalesUsers ?? 0)}
          hint="Distinct reps logged today"
          accent="amber"
        />
      </div>


      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900">Daily sales details</h2>
          <p className="mt-0.5 text-sm text-slate-500">Date: {formatDate(date)} (default is today)</p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500 sm:p-10">Loading daily sales…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500 sm:p-10">No daily sales logs found for this date.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Sales user</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Phone</th>
                    <th className="px-4 py-3 text-right lg:px-6 lg:py-3.5">Amount</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Note</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Logged at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 lg:px-6 lg:py-3.5">
                        {row.salesUserName || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 lg:px-6 lg:py-3.5">
                        {row.salesUserPhone || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 lg:px-6 lg:py-3.5">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="max-w-[280px] truncate px-4 py-3 text-slate-600 lg:max-w-[300px] lg:px-6 lg:py-3.5">
                        {row.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 lg:px-6 lg:py-3.5">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{row.salesUserName || '—'}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-slate-500">{row.salesUserPhone || '—'}</p>
                    </div>
                    <p className="shrink-0 text-lg font-semibold tabular-nums text-red-900">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                  {row.note ? (
                    <p className="mt-2 break-words text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Note:</span> {row.note}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Logged at {formatDate(row.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
