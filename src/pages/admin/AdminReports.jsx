import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import ReportDetailModal from '../../components/ReportDetailModal.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatSaleDate, monthLabel } from '../../lib/format.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'
import seltecLogo from '../../assets/seltecLogo.png'

const verificationKeys = [
  'customerNamesRecorded',
  'outcomesMentioned',
  'quoteValuesRecorded',
  'orderValuesRecorded',
  'newCustomersClearlyMarked',
  'businessGeneratedVisible',
  'crmUpdated',
  'verifiedByManager',
]

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function yesterdayIso() {
  return shiftYmdDate(todayIso(), -1)
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

function formatLocalYmd(ymd) {
  if (!ymd || typeof ymd !== 'string') return '—'
  const t = ymd.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '—'
  const [y, m, d] = t.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString()
}

function getReview(report) {
  return report?.managementCheck || report?.managementReview || {}
}

function verificationSummary(report) {
  const review = getReview(report)
  const checks = [
    Boolean(review?.customerNamesRecorded),
    Boolean(review?.outcomesMentioned),
    Boolean(review?.quoteValuesRecorded),
    Boolean(review?.orderValuesRecorded),
    Boolean(review?.newCustomersClearlyMarked),
    Boolean(review?.businessGeneratedVisible),
    Boolean(review?.crmUpdated),
    Boolean(review?.verifiedByManager),
  ]
  return `${checks.filter(Boolean).length}/${verificationKeys.length}`
}

function verificationDoneCount(report) {
  const review = getReview(report)
  return verificationKeys.filter((key) => Boolean(review?.[key])).length
}

function reportMatchesSearch(report, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const name = String(report?.user?.name || report?.salesExecutiveName || '').toLowerCase()
  const phone = String(report?.user?.phone || '').toLowerCase()
  const qDigits = q.replace(/\D/g, '')
  const phoneDigits = phone.replace(/\D/g, '')
  if (name.includes(q)) return true
  if (phone.includes(q)) return true
  if (qDigits.length > 0 && phoneDigits.includes(qDigits)) return true
  return false
}

function reportUserId(report) {
  const ref = report?.user
  if (ref && typeof ref === 'object' && ref._id) return String(ref._id)
  if (ref) return String(ref)
  return ''
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
    <div className={`min-w-0 rounded-xl border p-4 shadow-sm sm:rounded-2xl sm:p-5 ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:mt-2 sm:text-2xl lg:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 sm:line-clamp-none sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const actionIconBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 sm:h-8 sm:w-8'

const mobileActionBase =
  'inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50'

const mobileViewBtn = `${mobileActionBase} bg-blue-600 hover:bg-blue-700`

const mobilePdfBtn = `${mobileActionBase} bg-red-600 hover:bg-red-700`

const filterFieldClass =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:py-2 sm:text-sm'

export default function AdminReports() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { year, month, goPrev, goNext } = useMonthState()
  const [timeScope, setTimeScope] = useState('day')
  const [dayDate, setDayDate] = useState(() => yesterdayIso())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])
  const [rosterUsers, setRosterUsers] = useState([])
  const [viewing, setViewing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [pdfPayload, setPdfPayload] = useState(null)
  const pdfRef = useRef(null)

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])
  const periodSubtitle = useMemo(() => {
    if (timeScope === 'day') {
      const d = dayDate.trim() || yesterdayIso()
      return `Single day · ${formatLocalYmd(d)}`
    }
    return `Monthly view · ${monthPill}`
  }, [dayDate, monthPill, timeScope])

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports
    return reports.filter((r) => reportMatchesSearch(r, searchQuery))
  }, [reports, searchQuery])

  const stats = useMemo(() => {
    const total = filteredReports.length
    const fullyChecked = filteredReports.filter((r) => verificationDoneCount(r) === verificationKeys.length).length
    const pending = Math.max(0, total - fullyChecked)
    return { total, fullyChecked, pending }
  }, [filteredReports])

  const submissionStats = useMemo(() => {
    const total = rosterUsers.length
    const rosterIdSet = new Set(rosterUsers.map((u) => String(u._id)))
    const submittedIds = new Set()
    for (const r of reports) {
      const id = reportUserId(r)
      if (id && rosterIdSet.has(id)) submittedIds.add(id)
    }
    return {
      submitted: submittedIds.size,
      total,
      notSubmitted: Math.max(0, total - submittedIds.size),
    }
  }, [reports, rosterUsers])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '500')
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (timeScope === 'month') {
      params.set('year', String(year))
      params.set('month', String(month))
    } else {
      params.set('date', dayDate.trim() || yesterdayIso())
    }
    return params.toString()
  }, [dayDate, month, timeScope, typeFilter, year])

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await adminApi.get(`/api/reports/admin/reports?${query}`)
      const rows = Array.isArray(data?.reports) ? data.reports : []
      setReports(rows)
      if (viewing?._id) {
        const refreshed = rows.find((r) => String(r._id) === String(viewing._id))
        setViewing(refreshed || null)
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load reports.')
      setReports([])
      setViewing(null)
    } finally {
      setLoading(false)
    }
  }, [navigate, query, viewing?._id])

  const loadRosterUsers = useCallback(async () => {
    try {
      const { data } = await adminApi.get('/api/admin/sales-users')
      setRosterUsers(Array.isArray(data?.salesUsers) ? data.salesUsers : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/', { replace: true })
        return
      }
      setRosterUsers([])
    }
  }, [navigate])

  useEffect(() => {
    loadRosterUsers()
  }, [loadRosterUsers])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/', { replace: true })
  }

  function resetFilters() {
    setTypeFilter('all')
    setTimeScope('day')
    setDayDate(yesterdayIso())
    setSearchQuery('')
  }

  async function handleDownloadPdf(report) {
    if (!report?._id) return
    setDownloadingPdfId(String(report._id))
    try {
      await exportDailyReportPdf({
        report,
        fallbackUser: null,
        reportRef: pdfRef,
        setPdfPayload,
        flushSync,
        viewerLabel: 'Admin copy',
      })
    } catch (err) {
      console.error('Report PDF export failed:', err)
      setError('Could not generate PDF. Please try again.')
    } finally {
      setDownloadingPdfId('')
      setPdfPayload(null)
    }
  }

  if (!token) {
    return <Navigate to="/" replace />
  }

  const statsPeriodHint =
    timeScope === 'day'
      ? `For ${formatLocalYmd(dayDate.trim() || yesterdayIso())}`
      : `For ${monthPill}`

  return (
    <DashboardShell
      badge="Administration"
      title="Sales reports"
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

      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Total reports"
          value={loading ? '…' : String(stats.total)}
          hint={statsPeriodHint}
          accent="red"
        />
        <StatCard
          label="Fully verified"
          value={loading ? '…' : String(stats.fullyChecked)}
          hint="All manager checks completed"
          accent="emerald"
        />
        <StatCard
          label="Pending review"
          value={loading ? '…' : String(stats.pending)}
          hint="Needs manager verification"
          accent="amber"
        />
        <StatCard
          label="Sales & managers"
          value={
            loading
              ? '…'
              : `${submissionStats.submitted}/${submissionStats.total}`
          }
          hint={
            loading
              ? 'Loading roster…'
              : `${submissionStats.submitted} submitted · ${submissionStats.notSubmitted} not submitted`
          }
          accent="indigo"
        />
      </div>

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:mb-6 sm:p-5">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {periodSubtitle}
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-end lg:gap-3">
          <div className="flex w-full min-w-0 shrink-0 rounded-lg border border-slate-200 bg-slate-100 p-1 lg:w-auto lg:max-w-[280px]">
            <button
              type="button"
              onClick={() => setTimeScope('day')}
              aria-pressed={timeScope === 'day'}
              className={`min-h-[44px] flex-1 touch-manipulation rounded-md px-3 py-2.5 text-sm font-medium transition sm:min-h-[40px] sm:py-2 ${
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
              className={`min-h-[44px] flex-1 touch-manipulation rounded-md px-3 py-2.5 text-sm font-medium transition sm:min-h-[40px] sm:py-2 ${
                timeScope === 'month'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month
            </button>
          </div>

          {timeScope === 'month' ? (
            <div className="flex w-full min-w-0 shrink-0 items-stretch gap-0 rounded-lg border border-slate-200 bg-white lg:w-auto lg:min-w-[14rem] lg:max-w-[280px]">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-[44px] min-w-[44px] shrink-0 touch-manipulation border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous month"
              >
                ←
              </button>
              <span className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center px-2 py-2 text-center text-sm font-medium text-slate-800 sm:min-h-0">
                {monthPill}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="min-h-[44px] min-w-[44px] shrink-0 touch-manipulation border-l border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Next month"
              >
                →
              </button>
            </div>
          ) : (
            <div className="flex w-full min-w-0 shrink-0 items-stretch gap-0 rounded-lg border border-slate-200 bg-white lg:w-auto lg:min-w-[14rem] lg:max-w-[280px]">
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, -1))}
                className="min-h-[44px] min-w-[44px] shrink-0 touch-manipulation border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous date"
              >
                ←
              </button>
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value || yesterdayIso())}
                className="min-h-[44px] min-w-0 flex-1 touch-manipulation border-0 bg-white px-3 py-2 text-center text-base text-slate-800 outline-none focus:ring-1 focus:ring-slate-300 sm:min-h-0 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, 1))}
                className="min-h-[44px] min-w-[44px] shrink-0 touch-manipulation border-l border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Next date"
              >
                →
              </button>
            </div>
          )}

          <label className="min-w-0 shrink-0 lg:w-[11rem]">
            <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={filterFieldClass}
            >
              <option value="all">All</option>
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </label>

          <label className="min-w-0 lg:min-w-[12rem] lg:flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or phone number…"
              className={filterFieldClass}
            />
          </label>

          <button
            type="button"
            className="min-h-[44px] w-full shrink-0 touch-manipulation rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:min-h-0 sm:py-2 lg:w-auto"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 px-3 py-3 sm:px-5 sm:py-4">
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Report list</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {loading
              ? 'Loading reports…'
              : `${filteredReports.length} report${filteredReports.length === 1 ? '' : 's'} shown`}
          </p>
        </div>

        {loading ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6 sm:py-12">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6 sm:py-12">
            {timeScope === 'day'
              ? 'No reports found for this date.'
              : 'No reports found for this month.'}
          </p>
        ) : filteredReports.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6 sm:py-12">
            No reports match your search.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredReports.map((r) => {
                const verifiedCount = verificationDoneCount(r)
                const isFullyVerified = verifiedCount === verificationKeys.length
                return (
                  <li key={r._id} className="px-3 py-4 sm:px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold leading-snug text-slate-900">
                          {r.user?.name || '—'}
                        </p>
                        {r.user?.designation === 'manager' ? (
                          <p className="mt-0.5 text-xs font-medium text-indigo-700">Manager</p>
                        ) : null}
                        {r.user?.phone ? (
                          <p className="mt-0.5 text-xs tabular-nums text-slate-500">{r.user.phone}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700">
                            {formatSaleDate(r.date)}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium capitalize text-slate-700">
                            {r.type}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-medium ${
                              isFullyVerified
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-900'
                            }`}
                          >
                            Verified {verificationSummary(r)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(r)}
                        className={mobileViewBtn}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                        </svg>
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(r)}
                        disabled={downloadingPdfId === String(r._id)}
                        className={mobilePdfBtn}
                      >
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
                        </svg>
                        {downloadingPdfId === String(r._id) ? 'PDF…' : 'PDF'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-red-600 text-xs font-semibold uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3 lg:px-6">Submitted by</th>
                    <th className="px-4 py-3 lg:px-6">Date</th>
                    <th className="px-4 py-3 lg:px-6">Type</th>
                    <th className="px-4 py-3 lg:px-6">Manager verification</th>
                    <th className="px-4 py-3 text-right lg:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((r) => (
                    <tr key={r._id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 lg:px-6">
                        <p className="font-medium text-slate-900">{r.user?.name || '—'}</p>
                        {r.user?.designation === 'manager' ? (
                          <p className="mt-0.5 text-xs font-medium text-indigo-700">Manager</p>
                        ) : null}
                        {r.user?.phone ? (
                          <p className="mt-0.5 text-xs tabular-nums text-slate-500">{r.user.phone}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700 lg:px-6">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700 lg:px-6">{r.type}</td>
                      <td className="px-4 py-3 text-slate-700 lg:px-6">{verificationSummary(r)}</td>
                      <td className="px-4 py-3 text-right lg:px-6">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="View report"
                            aria-label="View report"
                            onClick={() => setViewing(r)}
                            className={actionIconBtn}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(r)}
                            disabled={downloadingPdfId === String(r._id)}
                            title="Download PDF"
                            aria-label="Download PDF"
                            className={actionIconBtn}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      {viewing ? (
        <ReportDetailModal
          report={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => handleDownloadPdf(viewing)}
          downloading={downloadingPdfId === String(viewing?._id)}
          formatDate={formatSaleDate}
          showManagerCheck
        />
      ) : null}
      {pdfPayload ? <DailyReportPdfHtml ref={pdfRef} {...pdfPayload} aria-hidden /> : null}
    </DashboardShell>
  )
}
