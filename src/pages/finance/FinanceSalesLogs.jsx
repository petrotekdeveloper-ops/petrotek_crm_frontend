import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { financeApi, FINANCE_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
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

function rowSalesDesignation(row) {
  const ref = row?.salesUserId
  const fromRef = isPopulatedUserRef(ref) ? ref.designation : undefined
  const raw = row?.salesUserDesignation ?? fromRef
  const s = String(raw ?? '').trim()
  return s || '—'
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
      <p className="mt-1 break-words text-base font-semibold leading-snug tracking-tight text-slate-900 sm:mt-2 sm:text-2xl sm:leading-tight lg:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 line-clamp-4 text-[10px] leading-snug text-slate-600 sm:line-clamp-none sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default function FinanceSalesLogs() {
  const navigate = useNavigate()
  const token = localStorage.getItem(FINANCE_TOKEN_KEY)
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
        const designation = String(u?.designation || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || designation.includes(q)
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
      const role = selectedUser.designation ? ` · ${selectedUser.designation}` : ''
      setSalesUserQuery(`${selectedUser.name} (${selectedUser.phone})${role}`)
      return
    }
    if (!selectedSalesUserId) {
      setSalesUserQuery('')
    }
  }, [selectedUser, selectedSalesUserId])

  const loadSalesUsers = useCallback(async () => {
    try {
      const { data } = await financeApi.get('/api/finance/sales-users')
      setSalesUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(FINANCE_TOKEN_KEY)
        navigate('/finance/login', { replace: true })
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
        financeApi.get(`/api/finance/sales-logs?${params.toString()}`),
        financeApi.get(`/api/finance/sales-logs/summary?${summaryParams.toString()}`),
      ])
      setRows(Array.isArray(logsData?.dailySales) ? logsData.dailySales : [])
      setSummary(summaryData?.summary ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(FINANCE_TOKEN_KEY)
        navigate('/finance/login', { replace: true })
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
    localStorage.removeItem(FINANCE_TOKEN_KEY)
    navigate('/finance/login', { replace: true })
  }

  if (!token) {
    return <Navigate to="/finance/login" replace />
  }

  return (
    <DashboardShell
      badge="Finance"
      title="Sales logs"
      subtitle={periodSubtitle}
      secondaryLogoSrc={seltecLogo}
      secondaryLogoAlt="Seltec"
      user={{ name: 'Finance' }}
      onLogout={logout}
      actionsPlacement="belowHeading"
      logoutConfirm={{
        enabled: true,
        title: 'Log out from finance?',
        message: 'You will be signed out from the finance portal and returned to the finance sign-in page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
      }}
    >
      {error ? (
        <div className="mb-4 break-words rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm sm:mb-6">
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-100 [-webkit-tap-highlight-color:transparent] sm:mb-6 sm:p-5">
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
            <div className="flex w-full min-w-0 max-w-full items-stretch gap-0 rounded-lg border border-slate-200 bg-white sm:max-w-md sm:flex-1">
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
            <div className="flex w-full min-w-0 max-w-full items-stretch gap-0 rounded-lg border border-slate-200 bg-white sm:max-w-md sm:flex-1">
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, -1))}
                className="min-h-[44px] min-w-[44px] shrink-0 border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous date"
              >
                ←
              </button>
              <input
                id="finance-sales-log-day"
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
          <div className="relative w-full min-w-0 sm:max-w-xs lg:max-w-sm">
            <label htmlFor="finance-sales-user-search" className="sr-only">
              Filter by user
            </label>
            <input
              id="finance-sales-user-search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
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
              placeholder="Search name, phone, or role…"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none [-webkit-appearance:textfield] placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-10 sm:text-sm [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {showSalesUserSuggestions ? (
              <div className="absolute z-20 mt-1 max-h-[min(50vh,14rem)] w-full min-w-0 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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
                  All users (sales and managers)
                </button>
                {filteredSalesUserSuggestions.length > 0 ? (
                  filteredSalesUserSuggestions.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedSalesUserId(u._id)
                        const role = u.designation ? ` · ${u.designation}` : ''
                        setSalesUserQuery(`${u.name} (${u.phone})${role}`)
                        setShowSalesUserSuggestions(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      {u.name} ({u.phone})
                      {u.designation ? (
                        <span className="mt-0.5 block text-xs capitalize text-slate-500">
                          {u.designation}
                        </span>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-slate-500">No matching users</p>
                )}
              </div>
            ) : null}
          </div>
          {selectedUser ? (
            <p className="text-xs leading-relaxed text-slate-600 sm:ml-1 sm:text-sm">
              Viewing:{' '}
              <span className="font-semibold text-slate-900">{selectedUser.name}</span>
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500 sm:ml-1 sm:text-sm">
              {timeScope === 'month'
                ? 'Approved sales & managers · this month'
                : 'Approved sales & managers · this date'}
            </p>
          )}
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 sm:mb-6 sm:gap-3 lg:grid-cols-4 lg:gap-4">
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
                ? `${formatMoney(topPerformer.totalAmount)} across ${topPerformer.logCount} logs${
                    topPerformer.salesUserDesignation
                      ? ` · ${topPerformer.salesUserDesignation}`
                      : ''
                  }`
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
          <h2 className="text-base font-semibold text-slate-900 md:text-[1.0625rem]">
            Sales log details
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {timeScope === 'day' ? formatLocalYmd(dayDate.trim() || todayIso()) : monthPill}
          </p>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500 sm:p-10 sm:text-base">
            Loading sales logs…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500 sm:p-10 sm:text-base">
            {timeScope === 'day'
              ? 'No sales logs found for this date.'
              : 'No sales logs found for this month.'}
          </p>
        ) : (
          <>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm lg:min-w-[880px]">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Sale date</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">User</th>
                    <th className="px-4 py-3 lg:px-6 lg:py-3.5">Role</th>
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
                      <td className="px-4 py-3 text-sm capitalize text-slate-600 lg:px-6 lg:py-3.5">
                        {rowSalesDesignation(row)}
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
            <div className="space-y-3 p-3 sm:p-4 md:hidden">
              {rows.map((row) => (
                <article
                  key={row._id}
                  className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm ring-1 ring-slate-900/[0.02]"
                >
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words text-sm font-semibold leading-snug text-slate-900">
                        {rowSalesName(row)}
                      </p>
                      <p className="text-[11px] text-slate-600 sm:text-xs">
                        <span className="font-medium capitalize">{rowSalesDesignation(row)}</span>
                        {rowSalesPhone(row) !== '—' ? (
                          <>
                            <span className="mx-1.5 text-slate-300" aria-hidden>
                              ·
                            </span>
                            <span className="tabular-nums">{rowSalesPhone(row)}</span>
                          </>
                        ) : null}
                      </p>
                      {isSystemRow(row) ? (
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          No sales log entered
                        </p>
                      ) : null}
                      <p className="text-[11px] text-slate-500 sm:text-xs">
                        Sale date{' '}
                        <span className="font-medium text-slate-700">{formatDate(row.saleDate)}</span>
                      </p>
                    </div>
                    <div className="flex max-w-[42%] shrink-0 flex-col items-end text-right">
                      <p className="break-words text-base font-bold tabular-nums leading-tight text-red-900 sm:text-lg">
                        {formatMoney(row.amount)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewLog(row)}
                    className="mt-3 flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition active:bg-slate-100 sm:min-h-10 sm:text-xs"
                  >
                    View details
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      {viewLog ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-[2px] sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewLog(null)
          }}
        >
          <div
            className="flex max-h-[min(92dvh,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 sm:max-h-[min(92vh,640px)] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-sales-log-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="relative shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-red-50/25 px-3 py-2.5 sm:px-5 sm:py-3">
              <div
                className="absolute bottom-0 left-0 top-0 w-1 bg-red-600 sm:rounded-tl-2xl"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-2 pl-2.5 sm:items-center sm:gap-3 sm:pl-3.5">
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-700/90 sm:text-[10px]">
                    Sales activity
                  </p>
                  <h3
                    id="finance-sales-log-modal-title"
                    className="mt-0.5 break-words text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-xl"
                  >
                    Log details
                  </h3>
                  <p className="mt-0.5 text-xs leading-snug text-slate-600">
                    Entry for{' '}
                    <span className="font-medium text-slate-800">{formatDate(viewLog.saleDate)}</span>
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex sm:gap-2.5">
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

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
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
                    User
                  </dt>
                  <dd className="mt-2 text-base font-semibold leading-snug text-slate-900">
                    {rowSalesName(viewLog)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200/80">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                    </span>
                    Role
                  </dt>
                  <dd className="mt-2 text-base font-medium capitalize text-slate-800">
                    {rowSalesDesignation(viewLog)}
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

            <footer className="shrink-0 border-t border-slate-100 bg-slate-50/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
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
