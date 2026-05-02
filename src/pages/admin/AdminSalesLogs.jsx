import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney } from '../../lib/format.js'
import petrotekLogo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftYmdDate(ymd, days) {
  const value = ymd?.trim() || todayIso()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return todayIso()
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return todayIso()
  dt.setDate(dt.getDate() + days)
  const nextY = dt.getFullYear()
  const nextM = String(dt.getMonth() + 1).padStart(2, '0')
  const nextD = String(dt.getDate()).padStart(2, '0')
  return `${nextY}-${nextM}-${nextD}`
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

function isPopulatedUserRef(ref) {
  return Boolean(
    ref &&
      typeof ref === 'object' &&
      !Array.isArray(ref) &&
      ('name' in ref || 'phone' in ref)
  )
}

/** Sales user name/phone for listing (handles blanks and nested populate). */
function rowSalesName(row) {
  const ref = row?.salesUserId
  const fromRef = isPopulatedUserRef(ref) ? ref.name : undefined
  const raw = row?.salesUserName ?? fromRef
  const s = String(raw ?? '').trim()
  return s || '—'
}

function rowSalesPhone(row) {
  const ref = row?.salesUserId
  const fromRef = isPopulatedUserRef(ref) ? ref.phone : undefined
  const raw = row?.salesUserPhone ?? fromRef
  const s = String(raw ?? '').trim()
  return s || '—'
}

function rowSalesUserKey(row) {
  const ref = row?.salesUserId
  if (isPopulatedUserRef(ref)) return String(ref._id ?? ref.id ?? '')
  return String(ref ?? '')
}

function isSystemRow(row) {
  return Boolean(row?.isSystemGenerated)
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
    <div className={`min-w-0 rounded-xl border p-3 shadow-sm sm:rounded-2xl sm:p-5 ${accentClass}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:mt-2 sm:text-2xl lg:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-slate-500 sm:line-clamp-none sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default function AdminSalesLogs() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { year, month, goPrev, goNext } = useMonthState()

  /** 'month' = year/month API; 'day' = single calendar day via date= */
  const [timeScope, setTimeScope] = useState('day')
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
  const logParticipation = useMemo(() => {
    const usersInView = new Set()
    const usersWithLogs = new Set()

    for (const row of rows) {
      const key = rowSalesUserKey(row)
      if (!key) continue
      usersInView.add(key)
      if (!isSystemRow(row)) usersWithLogs.add(key)
    }

    return {
      done: usersWithLogs.size,
      notDone: Math.max(0, usersInView.size - usersWithLogs.size),
    }
  }, [rows])

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

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
          <div className="flex w-full min-w-0 rounded-lg border border-slate-200 bg-slate-100 p-1 sm:w-auto sm:max-w-[280px]">
            <button
              type="button"
              onClick={() => setTimeScope('day')}
              aria-pressed={timeScope === 'day'}
              className={`min-h-[40px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                timeScope === 'day'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              aria-pressed={timeScope === 'month'}
              className={`min-h-[40px] flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                timeScope === 'month'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>

          {timeScope === 'month' ? (
            <div className="flex w-full min-w-0 max-w-md items-stretch gap-0 rounded-lg border border-slate-200 bg-white sm:flex-1">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-[44px] min-w-[44px] shrink-0 border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous month"
              >
                ←
              </button>
              <span className="flex min-w-0 flex-1 items-center justify-center px-2 py-2 text-center text-sm font-medium text-slate-800">
                {monthPill}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="min-h-[44px] min-w-[44px] shrink-0 border-l border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Next month"
              >
                →
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 max-w-md items-stretch gap-0 rounded-lg border border-slate-200 bg-white sm:flex-1">
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, -1))}
                className="min-h-[44px] min-w-[44px] shrink-0 border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous date"
              >
                ←
              </button>
              <input
                id="sales-log-day"
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value || todayIso())}
                className="min-h-[44px] min-w-0 flex-1 border-0 bg-white px-3 py-2 text-center text-base text-slate-800 outline-none focus:ring-1 focus:ring-slate-300 sm:min-h-0 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, 1))}
                className="min-h-[44px] min-w-[44px] shrink-0 border-l border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Next date"
              >
                →
              </button>
            </div>
          )}
          <div className="relative w-full max-w-sm min-w-0 sm:max-w-xs">
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

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:grid-cols-4 lg:gap-4">
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
          label="Done log / no log"
          value={
            loading
              ? '…'
              : `${logParticipation.done}/${logParticipation.notDone}`
          }
          hint={
            timeScope === 'day'
              ? 'Users who entered a log / users with 0 for this date'
              : 'Users with at least one log / users with 0 logs this month'
          }
          accent="amber"
        />
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100 sm:rounded-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-3 sm:px-6 sm:py-4">
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
                        {rowSalesName(row)}
                        {isSystemRow(row) ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            No log
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 lg:px-6 lg:py-3.5">
                        {rowSalesPhone(row)}
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
            <ul className="divide-y divide-slate-100 p-2 sm:p-0 md:hidden">
              {rows.map((row) => (
                <li key={row._id} className="rounded-lg px-2 py-3 sm:px-4 sm:py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                        {rowSalesName(row)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] tabular-nums text-slate-500 sm:text-xs">
                        {rowSalesPhone(row)}
                      </p>
                      {isSystemRow(row) ? (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          No sales log entered
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-red-900 sm:text-lg">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 sm:text-xs">
                    Sale date {formatDate(row.saleDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setViewLog(row)}
                    className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:min-h-[36px] sm:w-auto"
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewLog(null)
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 sm:max-h-[min(92vh,640px)] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-log-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="relative shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-red-50/25 px-4 py-2.5 sm:px-5 sm:py-3">
              <div
                className="absolute bottom-0 left-0 top-0 w-1 bg-red-600 sm:rounded-tl-2xl"
                aria-hidden
              />
              <div className="flex items-center justify-between gap-3 pl-3 sm:pl-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-700/90 sm:text-[10px]">
                    Sales activity
                  </p>
                  <h3
                    id="sales-log-modal-title"
                    className="mt-0.5 truncate text-lg font-bold leading-tight tracking-tight text-slate-900 sm:text-xl"
                  >
                    Log details
                  </h3>
                  <p className="mt-0.5 text-xs leading-snug text-slate-600">
                    Entry for{' '}
                    <span className="font-medium text-slate-800">{formatDate(viewLog.saleDate)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                  <img
                    src={petrotekLogo}
                    alt="Petrotek"
                    className="h-7 w-auto max-w-[4.5rem] object-contain object-right sm:h-8 sm:max-w-[5.5rem]"
                  />
                  <img
                    src={seltecLogo}
                    alt="Seltec"
                    className="h-7 w-auto max-w-[4.5rem] object-contain object-right sm:h-8 sm:max-w-[5.5rem]"
                  />
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-red-100/90 bg-gradient-to-br from-red-50/90 via-white to-red-50/40 p-4 shadow-sm ring-1 ring-red-900/5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount</p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-red-900 sm:text-4xl">
                  {formatMoney(viewLog.amount)}
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    Sales user
                  </dt>
                  <dd className="mt-2 text-base font-semibold leading-snug text-slate-900">
                    {rowSalesName(viewLog)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </span>
                    Phone
                  </dt>
                  <dd className="mt-2 text-base font-medium tabular-nums text-slate-800">
                    {rowSalesPhone(viewLog)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    Sale date
                  </dt>
                  <dd className="mt-2 text-base font-medium text-slate-800">{formatDate(viewLog.saleDate)}</dd>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Logged at
                  </dt>
                  <dd className="mt-2 text-sm font-medium leading-relaxed text-slate-800 sm:text-base">
                    {isSystemRow(viewLog)
                      ? 'System generated zero entry'
                      : formatDateTime(viewLog.createdAt)}
                  </dd>
                </div>
              </dl>

              {viewLog.note && String(viewLog.note).trim() ? (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Note</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {String(viewLog.note).trim()}
                  </p>
                </div>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={() => setViewLog(null)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 sm:min-h-0 sm:w-auto"
                >
                  Close
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
