import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import seltecLogo from '../../assets/seltecLogo.png'

function formatProfileDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function DetailField({ label, children, mono, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div
        className={`mt-1.5 text-sm font-medium leading-snug text-slate-900 ${mono ? 'break-all font-mono text-[13px] font-normal' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, accent = 'slate' }) {
  const accents = {
    red: 'border-red-200/70 bg-gradient-to-br from-red-50 via-white to-red-100/60',
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60',
    emerald: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60',
    amber: 'border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/60',
    slate: 'border-slate-200/80 bg-gradient-to-br from-slate-50/80 via-white to-slate-100/70',
  }
  return (
    <div className={`min-w-0 rounded-xl border p-3 shadow-sm sm:rounded-2xl sm:p-5 ${accents[accent] ?? accents.slate}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:mt-2 sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] leading-snug text-slate-500 sm:text-xs">{hint}</p> : null}
    </div>
  )
}

function AdminMonthControl({ year, month, goPrev, goNext }) {
  return (
    <div
      className="inline-flex w-full max-w-md items-stretch rounded-lg border border-slate-200 bg-white sm:w-auto"
      role="group"
      aria-label="Reporting month"
    >
      <button
        type="button"
        onClick={goPrev}
        className="min-h-[44px] min-w-[44px] shrink-0 border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="flex min-w-0 flex-1 items-center justify-center px-3 py-2 text-center text-sm font-medium text-slate-800">
        {monthLabel(year, month)}
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
  )
}

export default function AdminUserSalesDetail() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { userId } = useParams()
  const { state } = useLocation()

  const initialMonth =
    state?.year != null && state?.month != null ? { year: state.year, month: state.month } : undefined
  const { year, month, goPrev, goNext } = useMonthState(initialMonth)
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userDetailOpen, setUserDetailOpen] = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setError('')
    setLoading(true)
    try {
      const { data: body } = await adminApi.get(`/api/admin/users/${userId}/daily-sales?${ymQuery}`)
      setData(body)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('User not found.')
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        const msg = err.response?.data?.error
        setError(typeof msg === 'string' ? msg : 'This user does not have daily sales logs.')
      } else {
        setError('Could not load user details and daily activity.')
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [userId, ymQuery, navigate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setUserDetailOpen(false)
  }, [year, month, userId])

  useEffect(() => {
    if (!userDetailOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setUserDetailOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [userDetailOpen])

  const selectedUser = data?.user ?? {
    userId: state?.userId ?? userId,
    name: state?.userName ?? 'User',
    phone: state?.userPhone ?? '—',
  }

  const rows = useMemo(() => {
    const list = Array.isArray(data?.dailySales) ? data.dailySales : []
    return list.filter(
      (row) => String(row?.salesUserId ?? '') === String(selectedUser?.userId ?? userId ?? '')
    )
  }, [data, selectedUser?.userId, userId])

  const logStats = useMemo(() => {
    const logged = rows.filter((r) => !r.isSystemGenerated)
    const missing = rows.filter((r) => r.isSystemGenerated)
    return {
      loggedCount: logged.length,
      missingCount: missing.length,
      totalDays: rows.length,
    }
  }, [rows])

  const monthlyTarget = data?.monthlyTargetAmount ?? null
  const hasTarget = Boolean(data?.hasTarget)
  const pct =
    monthlyTarget != null && monthlyTarget > 0
      ? Math.min(100, Math.round(((data?.monthTotal ?? 0) / monthlyTarget) * 100))
      : null

  if (!token) {
    return <Navigate to="/" replace />
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/', { replace: true })
  }

  return (
    <DashboardShell
      badge="Administration"
      title={selectedUser.name}
      subtitle={`Sales activity · ${monthLabel(year, month)}`}
      secondaryLogoSrc={seltecLogo}
      secondaryLogoAlt="Seltec"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actionsPlacement="belowHeading"
      actions={<AdminSectionHeaderNav />}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-16 text-center shadow-sm ring-1 ring-slate-100 sm:px-6">
          <div className="mx-auto mb-3 h-8 w-8 animate-pulse rounded-full bg-slate-200" />
          <p className="text-sm font-medium text-slate-600">Loading user sales profile…</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4 sm:space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/40 px-4 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-800/90">
                    Sales user profile
                  </p>
                  <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {selectedUser.name}
                  </h2>
                  <p className="mt-0.5 truncate text-sm tabular-nums text-slate-600">{selectedUser.phone || '—'}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <AdminMonthControl year={year} month={month} goPrev={goPrev} goNext={goNext} />
                  <button
                    type="button"
                    onClick={() => setUserDetailOpen(true)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:min-h-0"
                  >
                    View profile
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Month total"
              value={formatMoney(data?.monthTotal ?? 0)}
              hint={`Achieved in ${monthLabel(year, month)}`}
              accent="red"
            />
            <StatCard
              label="Monthly target"
              value={monthlyTarget != null ? formatMoney(monthlyTarget) : '—'}
              hint={
                hasTarget
                  ? data?.user?.designation === 'manager'
                    ? 'Manager default target'
                    : 'Set by assigned manager'
                  : 'No target configured'
              }
              accent="indigo"
            />
            <StatCard
              label="Progress"
              value={pct != null ? `${pct}%` : '—'}
              hint={
                data?.remaining != null
                  ? `${formatMoney(data.remaining)} remaining`
                  : hasTarget
                    ? 'Target vs achieved'
                    : 'Set a target to track progress'
              }
              accent="emerald"
            />
            <StatCard
              label="Log entries"
              value={`${logStats.loggedCount}/${logStats.totalDays}`}
              hint={`${logStats.missingCount} day${logStats.missingCount === 1 ? '' : 's'} without a log`}
              accent="amber"
            />
          </div>

          {hasTarget && pct != null ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-slate-900">Target progress</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatMoney(data?.monthTotal ?? 0)} of {formatMoney(monthlyTarget)} · {monthLabel(year, month)}
                  </p>
                </div>
                <p className="text-2xl font-bold tabular-nums text-red-700">{pct}%</p>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-700 via-red-600 to-red-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-4 shadow-sm sm:px-6">
              <p className="text-sm font-medium text-amber-950">No monthly target set for this period.</p>
              <p className="mt-1 text-sm text-amber-900/80">
                {data?.user?.designation === 'manager'
                  ? 'Assign a manager default target in user management to enable progress tracking.'
                  : 'The assigned manager can set a per-month target for this sales user.'}
              </p>
            </section>
          )}

          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100 sm:rounded-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-3 sm:px-6 sm:py-4">
              <h3 className="text-base font-semibold text-slate-900">Daily activity</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                All calendar days in {monthLabel(year, month)} — including days with no log submitted
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500 sm:p-10">No daily logs found for this month.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-red-600 text-xs font-semibold uppercase tracking-wide text-white">
                      <tr>
                        <th className="px-4 py-3.5 lg:px-6">Date</th>
                        <th className="px-4 py-3.5 text-right lg:px-6">Amount</th>
                        <th className="px-4 py-3.5 lg:px-6">Status</th>
                        <th className="px-4 py-3.5 lg:px-6">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr
                          key={row._id}
                          className={`transition hover:bg-slate-50/80 ${row.isSystemGenerated ? 'bg-slate-50/40' : 'bg-white'}`}
                        >
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 lg:px-6">
                            {formatSaleDate(row.saleDate)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-slate-900 lg:px-6">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="px-4 py-3.5 lg:px-6">
                            {row.isSystemGenerated ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                No log
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                Logged
                              </span>
                            )}
                          </td>
                          <td className="max-w-md px-4 py-3.5 text-slate-600 lg:px-6">
                            <span className="line-clamp-2">{row.note?.trim() || '—'}</span>
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
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {formatSaleDate(row.saleDate)}
                          </p>
                          {row.isSystemGenerated ? (
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              No log
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                              Logged
                            </span>
                          )}
                        </div>
                        <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                          {formatMoney(row.amount)}
                        </p>
                      </div>
                      {row.note?.trim() ? (
                        <p className="mt-2 text-sm text-slate-600">{row.note.trim()}</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">—</p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      ) : null}

      {userDetailOpen && data?.user ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-user-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close user details"
            onClick={() => setUserDetailOpen(false)}
          />
          <div className="relative z-[81] flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[min(92vh,760px)] sm:rounded-2xl">
            <header className="relative shrink-0 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-white to-red-50/25 px-5 py-4 sm:px-6">
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-red-600 sm:rounded-tl-2xl" aria-hidden />
              <button
                type="button"
                onClick={() => setUserDetailOpen(false)}
                className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 sm:right-4 sm:top-4"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="pl-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-700/90">Account profile</p>
                <h2 id="admin-user-detail-title" className="mt-1 pr-10 text-xl font-bold tracking-tight text-slate-900">
                  {data.user.name}
                </h2>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailField label="Phone">{data.user.phone || '—'}</DetailField>
                <DetailField label="Company">{data.user.company || '—'}</DetailField>
                <DetailField label="Email" mono className="sm:col-span-2">
                  {data.user.email?.trim() || '—'}
                </DetailField>
                <DetailField label="Role">
                  <span className="capitalize">{data.user.designation || '—'}</span>
                </DetailField>
                <DetailField label="Approval">{data.user.approvalStatus || '—'}</DetailField>
                <DetailField label="Manager" className="sm:col-span-2">
                  {data.user.managerName
                    ? `${data.user.managerName}${data.user.managerPhone ? ` · ${data.user.managerPhone}` : ''}`
                    : '—'}
                </DetailField>
                <DetailField label="Date of birth">{formatProfileDate(data.user.dob)}</DetailField>
              </div>
            </div>
            <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setUserDetailOpen(false)}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 sm:min-h-0"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
