import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import seltecLogo from '../../assets/seltecLogo.png'

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

function formatNumber(n) {
  const x = Number(n || 0)
  return Number.isFinite(x) ? x.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'
}

function StatCard({ label, value, hint, accent = 'slate' }) {
  const accents = {
    red: 'border-red-200/70 bg-gradient-to-br from-red-50 via-white to-red-100/60',
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60',
    emerald: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60',
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
        <p className="mt-1 break-words text-[11px] text-slate-500 sm:text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

const filterControlClass =
  'min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:py-2 sm:text-sm'

export default function AdminServiceLogs() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { year, month, goPrev, goNext } = useMonthState()

  const [serviceUsers, setServiceUsers] = useState([])
  const [selectedServiceUserId, setSelectedServiceUserId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [summary, setSummary] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])

  const loadServiceUsers = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/api/admin/service-users')
      setServiceUsers(Array.isArray(data?.serviceUsers) ? data.serviceUsers : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      setServiceUsers([])
    }
  }, [navigate])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    })
    if (selectedServiceUserId) params.set('serviceUserId', selectedServiceUserId)
    if (statusFilter) params.set('status', statusFilter)

    const summaryParams = new URLSearchParams({
      year: String(year),
      month: String(month),
    })
    if (selectedServiceUserId) summaryParams.set('serviceUserId', selectedServiceUserId)

    try {
      const [{ data: logsData }, { data: summaryData }] = await Promise.all([
        adminApi.get(`/api/admin/service-logs?${params.toString()}`),
        adminApi.get(`/api/admin/service-logs/summary?${summaryParams.toString()}`),
      ])
      setLogs(Array.isArray(logsData?.serviceLogs) ? logsData.serviceLogs : [])
      setSummary(summaryData?.summary ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to load service log analytics.')
      setLogs([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [month, navigate, selectedServiceUserId, statusFilter, year])

  useEffect(() => {
    loadServiceUsers()
  }, [loadServiceUsers])

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
      title="Service log analytics"
      subtitle={`Monitoring and monthly summary · ${monthPill}`}
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
        <div className="mb-4 break-words rounded-xl border border-red-200/80 bg-red-50 px-3 py-3 text-sm text-red-900 shadow-sm sm:mb-6 sm:px-4">
          {error}
        </div>
      ) : null}

      <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

          <select
            value={selectedServiceUserId}
            onChange={(e) => setSelectedServiceUserId(e.target.value)}
            className={`${filterControlClass} sm:min-w-0 sm:flex-1 md:max-w-xl`}
          >
            <option value="">All service users</option>
            {serviceUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.phone})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Filter status (e.g. complete)"
            className={`${filterControlClass} sm:w-auto sm:min-w-[11rem] md:max-w-xs`}
            autoComplete="off"
          />
        </div>
      </section>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label="Total logs"
          value={loading ? '…' : formatNumber(summary?.totalLogs)}
          hint="Entries in selected month"
          accent="red"
        />
        <StatCard
          label="Total KM"
          value={loading ? '…' : formatNumber(summary?.totalKm)}
          hint="Accumulated distance for selected logs"
          accent="indigo"
        />
        <StatCard
          label="Unique customers"
          value={loading ? '…' : formatNumber(summary?.uniqueCustomers)}
          hint="Distinct customer names in month"
          accent="emerald"
        />
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600 sm:text-sm">
          Status distribution
        </h2>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">Loading status summary…</p>
        ) : !summary?.byStatus?.length ? (
          <p className="mt-2 text-sm text-slate-500">No status data for this month.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.byStatus.map((row) => (
              <span
                key={`${row.status}-${row.count}`}
                className="max-w-full break-words rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800"
              >
                {row.status}: {row.count}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Service log details</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
            Entries for the selected month and filters.
          </p>
        </div>

        {loading ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6">
            Loading service logs…
          </p>
        ) : logs.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6">
            No service logs found for this selection.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {logs.map((row) => (
                <li key={row._id} className="px-3 py-4 sm:px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatDate(row.date)}
                      </p>
                      <p className="mt-1 break-words font-semibold leading-snug text-slate-900">
                        {row.customer}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600">{row.service}</p>
                      <div className="mt-2 text-sm text-slate-700">
                        <p className="font-medium">{row.serviceUserName || '—'}</p>
                        <p className="text-xs text-slate-500">{row.serviceUserPhone || '—'}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
                        {formatNumber(row.km)}
                      </p>
                      <p className="text-xs font-normal text-slate-500">km</p>
                    </div>
                  </div>
                  {row.spares ? (
                    <p className="mt-2 break-words text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Spares:</span> {row.spares}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex max-w-full break-words rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">
                      {row.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      Logged {formatDate(row.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm lg:min-w-[980px]">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Date</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Service user</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Customer</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Service</th>
                    <th className="px-3 py-3.5 text-right md:px-4 lg:px-6">KM</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Spares</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Status</th>
                    <th className="px-3 py-3.5 md:px-4 lg:px-6">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-3 py-3.5 font-medium text-slate-900 md:px-4 lg:px-6">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-3.5 text-slate-700 md:px-4 lg:px-6">
                        <p className="font-medium">{row.serviceUserName || '—'}</p>
                        <p className="text-xs text-slate-500">{row.serviceUserPhone || '—'}</p>
                      </td>
                      <td className="px-3 py-3.5 text-slate-700 md:px-4 lg:px-6">{row.customer}</td>
                      <td className="max-w-[200px] truncate px-3 py-3.5 text-slate-700 md:max-w-[240px] md:px-4 lg:px-6 lg:max-w-none">
                        {row.service}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-slate-900 md:px-4 lg:px-6">
                        {formatNumber(row.km)}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3.5 text-slate-600 md:max-w-[220px] md:px-4 lg:px-6">
                        {row.spares || '—'}
                      </td>
                      <td className="px-3 py-3.5 md:px-4 lg:px-6">
                        <span className="inline-flex max-w-[140px] truncate rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 lg:max-w-none">
                          {row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-600 md:px-4 lg:px-6">
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
