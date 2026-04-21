import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney } from '../../lib/format.js'
import seltecLogo from '../../assets/seltecLogo.png'

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

/** YYYY-MM-DD from date input — interpret as local calendar day for labels */
function formatLocalYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—'
  const t = ymd.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return formatDate(ymd)
  const [y, m, d] = t.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString()
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
  const { year, month, goPrev, goNext } = useMonthState()

  /** 'month' = year/month API; 'day' = single calendar day via date= */
  const [timeScope, setTimeScope] = useState('month')
  const [dayDate, setDayDate] = useState(todayIso)

  const [salesUsers, setSalesUsers] = useState([])
  const [selectedSalesUserId, setSelectedSalesUserId] = useState('')
  const [salesUserQuery, setSalesUserQuery] = useState('')
  const [showSalesUserSuggestions, setShowSalesUserSuggestions] = useState(false)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [viewLog, setViewLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])
  const periodSubtitle = useMemo(() => {
    if (timeScope === 'day') {
      const d = dayDate.trim() ? dayDate : todayIso()
      return `Single day · ${formatLocalYmd(d)}`
    }
    return `Monthly activity · ${monthPill}`
  }, [dayDate, monthPill, timeScope])

  const selectedUser = useMemo(
    () => salesUsers.find((u) => u._id === selectedSalesUserId) || null,
    [salesUsers, selectedSalesUserId]
  )
  const filteredSalesUserSuggestions = useMemo(() => {
    const q = salesUserQuery.trim().toLowerCase()
    if (!q) return salesUsers.slice(0, 8)
    return salesUsers
      .filter((u) => {
        const name = String(u?.name || '').toLowerCase()
        const phone = String(u?.phone || '').toLowerCase()
        return name.includes(q) || phone.includes(q)
      })
      .slice(0, 8)
  }, [salesUsers, salesUserQuery])
  const topPerformer = summary?.topSalesUsers?.[0] ?? null

  useEffect(() => {
    if (selectedUser) {
      setSalesUserQuery(`${selectedUser.name} (${selectedUser.phone})`)
      return
    }
    if (!selectedSalesUserId) {
      setSalesUserQuery('')
    }
  }, [selectedUser, selectedSalesUserId])

  const loadSalesUsers = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/api/admin/sales-users')
      setSalesUsers(Array.isArray(data?.salesUsers) ? data.salesUsers : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      setSalesUsers([])
    }
  }, [navigate])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (timeScope === 'day') {
      const d = dayDate.trim() || todayIso()
      params.set('date', d)
    } else {
      params.set('year', String(year))
      params.set('month', String(month))
    }
    if (selectedSalesUserId) params.set('salesUserId', selectedSalesUserId)

    const summaryParams = new URLSearchParams(params)

    try {
      const [{ data: logsData }, { data: summaryData }] = await Promise.all([
        adminApi.get(`/api/admin/sales-logs?${params.toString()}`),
        adminApi.get(`/api/admin/sales-logs/summary?${summaryParams.toString()}`),
      ])
      setRows(Array.isArray(logsData?.dailySales) ? logsData.dailySales : [])
      setSummary(summaryData?.summary ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(
        typeof msg === 'string'
          ? msg
          : timeScope === 'day'
            ? 'Failed to load sales logs for this date.'
            : 'Failed to load sales logs for this month.'
      )
      setSummary(null)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [dayDate, month, navigate, selectedSalesUserId, timeScope, year])

  useEffect(() => {
    loadSalesUsers()
  }, [loadSalesUsers])

  useEffect(() => {
    loadData()
  }, [loadData])

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/', { replace: true })
  }

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <DashboardShell
      badge="Administration"
      title="Sales logs"
      subtitle={periodSubtitle}
      secondaryLogoSrc={seltecLogo}
      secondaryLogoAlt="Seltec"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actionsPlacement="belowHeading"
      logoutConfirm={{
        enabled: true,
        title: 'Log out from admin panel?',
        message: 'You will be signed out from the admin panel and returned to the main login page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
      }}
      actions={<AdminSectionHeaderNav />}
    >
      {error ? (
        <div className="mb-4 break-words rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm sm:mb-6">
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label="Time range"
          >
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                timeScope === 'month'
                  ? 'bg-white text-red-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('day')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                timeScope === 'day'
                  ? 'bg-white text-red-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
          </div>

          {timeScope === 'month' ? (
            <div className="w-full sm:w-auto">
              <div className="flex w-full max-w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto sm:justify-center">
                <button
                  type="button"
                  onClick={goPrev}
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium text-slate-800 sm:min-w-[9rem] sm:flex-none">
                  {monthPill}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center">
              <label htmlFor="sales-log-day" className="text-xs font-medium text-slate-500 sm:sr-only">
                Sale date
              </label>
              <input
                id="sales-log-day"
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value || todayIso())}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:w-auto sm:max-w-[11rem] sm:text-sm"
              />
            </div>
          )}
          <div className="relative w-full max-w-sm min-w-0">
            <input
              type="text"
              value={salesUserQuery}
              onChange={(e) => {
                const next = e.target.value
                setSalesUserQuery(next)
                setShowSalesUserSuggestions(true)
                if (!next.trim()) {
                  setSelectedSalesUserId('')
                }
              }}
              onFocus={() => setShowSalesUserSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSalesUserSuggestions(false), 120)}
              placeholder="Search sales user by name or phone"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:text-sm"
            />
            {showSalesUserSuggestions ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedSalesUserId('')
                    setSalesUserQuery('')
                    setShowSalesUserSuggestions(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  All sales users
                </button>
                {filteredSalesUserSuggestions.length > 0 ? (
                  filteredSalesUserSuggestions.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedSalesUserId(u._id)
                        setSalesUserQuery(`${u.name} (${u.phone})`)
                        setShowSalesUserSuggestions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      {u.name} ({u.phone})
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-500">No matching sales users</p>
                )}
              </div>
            ) : null}
          </div>
          {selectedUser ? (
            <p className="text-sm leading-snug text-slate-600 sm:ml-1">
              Viewing:{' '}
              <span className="font-semibold text-slate-900">{selectedUser.name}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500 sm:ml-1">
              {timeScope === 'month'
                ? 'Viewing all sales users for this month.'
                : 'Viewing all sales users for this date.'}
            </p>
          )}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total logs"
          value={loading ? '…' : String(summary?.totalLogs ?? 0)}
          hint={
            timeScope === 'day'
              ? 'Entries logged on the selected date'
              : 'Entries logged in the selected month'
          }
          accent="red"
        />
        <StatCard
          label="Total amount"
          value={loading ? '…' : formatMoney(summary?.totalAmount ?? 0)}
          hint={
            timeScope === 'day'
              ? 'Combined sales value for this date'
              : 'Combined sales value for the month'
          }
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
                : timeScope === 'day'
                  ? 'No performer data for this date'
                  : 'No performer data for this month'
          }
          accent="emerald"
        />
        <StatCard
          label="Active sales users"
          value={loading ? '…' : String(summary?.activeSalesUsers ?? 0)}
          hint={
            timeScope === 'day'
              ? 'Distinct reps with at least one log on this date'
              : 'Distinct reps with at least one log this month'
          }
          accent="amber"
        />
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900">Sales log details</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {timeScope === 'day' ? formatLocalYmd(dayDate.trim() || todayIso()) : monthPill}
          </p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500 sm:p-10">Loading sales logs…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500 sm:p-10">
            {timeScope === 'day'
              ? 'No sales logs found for this date.'
              : 'No sales logs found for this month.'}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Sale date</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Sales user</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Phone</th>
                    <th className="px-4 py-3 text-right lg:px-6 lg:py-3.5">Amount</th>
                    <th className="px-4 py-3 text-right lg:px-6 lg:py-3.5">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600 lg:px-6 lg:py-3.5">
                        {formatDate(row.saleDate)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 lg:px-6 lg:py-3.5">
                        {row.salesUserName || '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 lg:px-6 lg:py-3.5">
                        {row.salesUserPhone || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 lg:px-6 lg:py-3.5">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-right lg:px-6 lg:py-3.5">
                        <button
                          type="button"
                          onClick={() => setViewLog(row)}
                          className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          View
                        </button>
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
                  <p className="mt-2 text-xs text-slate-500">
                    Sale date {formatDate(row.saleDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewLog(row)}
                    className="mt-2 inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {viewLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Sales log details</h3>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sales user</dt>
                <dd className="mt-1 text-slate-900">{viewLog.salesUserName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                <dd className="mt-1 text-slate-700">{viewLog.salesUserPhone || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</dt>
                <dd className="mt-1 text-slate-900">{formatMoney(viewLog.amount)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sale date</dt>
                <dd className="mt-1 text-slate-700">{formatDate(viewLog.saleDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logged at</dt>
                <dd className="mt-1 text-slate-700">{formatDateTime(viewLog.createdAt)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
