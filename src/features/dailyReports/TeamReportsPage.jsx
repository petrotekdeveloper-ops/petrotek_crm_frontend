import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import ReportDetailModal from './components/ReportDetailModal.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatSaleDate, monthLabel } from '../../lib/format.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'
import { getManagerTheme } from '../../lib/managerTheme.js'

const KPI_KEYS = [
  'newCustomers',
  'existingFollowUps',
  'customerVisits',
  'callsMade',
  'quotationsSent',
  'ordersReceived',
  'collectionFollowUps',
]

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
  const checks = verificationKeys.map((key) => Boolean(review?.[key]))
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
    blue: 'border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-blue-100/60',
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

export default function ManagerTeamReports({ user, onLogout }) {
  const theme = getManagerTheme(user)

  const { year, month, goPrev, goNext } = useMonthState()
  const [timeScope, setTimeScope] = useState('day')
  const [dayDate, setDayDate] = useState(() => yesterdayIso())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])
  const [rosterUsers, setRosterUsers] = useState([])
  const [viewing, setViewing] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
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

  const rosterYm = useMemo(() => {
    if (timeScope === 'month') return { year, month }
    const d = dayDate.trim() || yesterdayIso()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { year, month }
    const [y, m] = d.split('-').map(Number)
    return { year: y, month: m }
  }, [dayDate, month, timeScope, year])

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
      const { data } = await api.get(`/api/reports/manager/team?${query}`)
      const next = Array.isArray(data?.reports) ? data.reports : []
      setReports(next)
      return next
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load team reports.')
      setReports([])
      return []
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  useEffect(() => {
    let cancelled = false
    async function loadRoster() {
      try {
        const { data } = await api.get(
          `/api/manager/team-summary?year=${rosterYm.year}&month=${rosterYm.month}`
        )
        if (cancelled) return
        const members = Array.isArray(data?.members) ? data.members : []
        setRosterUsers(
          members.map((m) => ({
            _id: m.userId,
            name: m.name,
            phone: m.phone,
          }))
        )
      } catch {
        if (!cancelled) setRosterUsers([])
      }
    }
    loadRoster()
    return () => {
      cancelled = true
    }
  }, [rosterYm.month, rosterYm.year])

  function handleVerificationChange(key, value) {
    setViewing((x) => {
      if (!x) return x
      return {
        ...x,
        managementCheck: {
          ...(x.managementCheck || getReview(x)),
          [key]: value,
        },
      }
    })
  }

  function handleKpiManagerCommentChange(kpiKey, value) {
    setViewing((x) => {
      if (!x) return x
      return {
        ...x,
        dailyTargetAchievement: {
          ...(x.dailyTargetAchievement || {}),
          [kpiKey]: {
            ...(x.dailyTargetAchievement?.[kpiKey] || {}),
            managerComments: value,
          },
        },
      }
    })
  }

  async function saveVerification() {
    if (!viewing) return
    setSaving(true)
    setError('')
    try {
      const review = getReview(viewing)
      const { data } = await api.put(`/api/reports/manager/team/${viewing._id}/verification`, {
        customerNamesRecorded: Boolean(review.customerNamesRecorded),
        outcomesMentioned: Boolean(review.outcomesMentioned),
        quoteValuesRecorded: Boolean(review.quoteValuesRecorded),
        orderValuesRecorded: Boolean(review.orderValuesRecorded),
        newCustomersClearlyMarked: Boolean(review.newCustomersClearlyMarked),
        businessGeneratedVisible: Boolean(review.businessGeneratedVisible),
        crmUpdated: Boolean(review.crmUpdated),
        verifiedByManager: Boolean(review.verifiedByManager),
        managerRemarks: review.managerRemarks || '',
        managerInitials: review.managerInitials || '',
        dailyTargetAchievement: KPI_KEYS.reduce((acc, key) => {
          acc[key] = {
            managerComments: String(viewing.dailyTargetAchievement?.[key]?.managerComments ?? ''),
          }
          return acc
        }, {}),
      })
      const next = await loadReports()
      const refreshed =
        data?.report ??
        next.find((r) => String(r._id) === String(viewing._id))
      if (refreshed) setViewing(refreshed)
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save verification.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf(report) {
    if (!report?._id) return
    setDownloadingPdfId(String(report._id))
    try {
      await exportDailyReportPdf({
        report,
        fallbackUser: user,
        reportRef: pdfRef,
        setPdfPayload,
        flushSync,
        viewerLabel: 'Manager copy',
      })
    } catch (err) {
      console.error('Report PDF export failed:', err)
      setError('Could not generate PDF. Please try again.')
    } finally {
      setDownloadingPdfId('')
      setPdfPayload(null)
    }
  }

  function resetFilters() {
    setTimeScope('day')
    setDayDate(yesterdayIso())
    setTypeFilter('all')
    setSearchQuery('')
  }

  const statsPeriodHint = periodSubtitle

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Team reports"
      subtitle={periodSubtitle}
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader user={user} />}
    >
      {error ? (
        <div className="mb-4 break-words rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm sm:mb-6">
          {error}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Total reports"
          value={loading ? '…' : String(stats.total)}
          hint={statsPeriodHint}
          accent={theme.statAccent}
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
          label="Team submissions"
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
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
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
              <div className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center px-3 text-center text-sm font-medium text-slate-800 sm:min-h-0">
                {monthPill}
              </div>
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
            <div className="flex w-full min-w-0 max-w-md items-stretch rounded-lg border border-slate-200 bg-white sm:flex-1">
              <button
                type="button"
                onClick={() => setDayDate((current) => shiftYmdDate(current, -1))}
                className="min-h-[44px] min-w-[44px] shrink-0 border-r border-slate-200 px-2 text-sm text-slate-600 transition hover:bg-slate-50 sm:min-h-0 sm:min-w-10 sm:py-2"
                aria-label="Previous date"
              >
                ←
              </button>
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value || yesterdayIso())}
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

          <label className="w-full min-w-0 sm:w-auto sm:min-w-[11rem]">
            <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="all">All</option>
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </label>

          <label className="w-full min-w-0 sm:max-w-xs sm:flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-600">Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name or phone number…"
              className={`min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-800 shadow-sm outline-none sm:min-h-0 sm:text-sm ${theme.searchFocus}`}
            />
          </label>

          <button
            type="button"
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:min-h-0"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            {timeScope === 'day'
              ? 'No reports found for this date.'
              : 'No reports found for this month.'}
          </p>
        ) : filteredReports.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No reports match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className={theme.tableHeadSimple}>
                <tr>
                  <th className="px-4 py-3">Sales user</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Manager verification</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((r) => (
                  <tr key={r._id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.user?.name || '—'}</p>
                      {r.user?.phone ? (
                        <p className="mt-0.5 text-xs tabular-nums text-slate-500">{r.user.phone}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatSaleDate(r.date)}</td>
                    <td className="px-4 py-3 capitalize text-slate-700">{r.type}</td>
                    <td className="px-4 py-3 text-slate-700">{verificationSummary(r)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="View and verify report"
                          aria-label="View and verify report"
                          onClick={() => setViewing(r)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
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
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
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
          verificationEditable
          onVerificationChange={handleVerificationChange}
          onKpiManagerCommentChange={handleKpiManagerCommentChange}
          onSaveVerification={saveVerification}
          savingVerification={saving}
        />
      ) : null}
      {pdfPayload ? <DailyReportPdfHtml ref={pdfRef} {...pdfPayload} aria-hidden /> : null}
    </DashboardShell>
  )
}
