import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import { resolveLogoForPdf } from '../../lib/pdfLogo.js'
import { runPdfExport } from '../../lib/runPdfExport.js'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import AdminMonthlySalesLogsReportHtml from '../../reports/AdminMonthlySalesLogsReportHtml.jsx'
import petrotekLogo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

function yesterdayInputValue() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoDatePart(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function isManagerDailyRow(row, manager) {
  if (!manager) return false
  const managerId = manager._id ?? manager.id
  if (managerId != null && row?.salesUserId != null) {
    return String(row.salesUserId) === String(managerId)
  }
  return Boolean(manager.name && row?.repName === manager.name)
}

function compareTeamDailyRows(a, b, manager) {
  const aIsManager = isManagerDailyRow(a, manager)
  const bIsManager = isManagerDailyRow(b, manager)
  if (aIsManager !== bIsManager) return aIsManager ? -1 : 1
  const byName = (a.repName || '').localeCompare(b.repName || '', undefined, {
    sensitivity: 'base',
  })
  if (byName !== 0) return byName
  return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
}

/** System placeholders and any user-entered log with amount 0. */
function isZeroDailyLog(row) {
  if (row?.isSystemGenerated || row?.entryKind === 'system-zero') return true
  return Number(row?.amount ?? 0) === 0
}

function countsTowardTodaysSales(row) {
  return !isZeroDailyLog(row)
}

function isSystemGeneratedDailyRow(row) {
  return Boolean(row?.isSystemGenerated || row?.entryKind === 'system-zero')
}

function countUsersWithLoggedEntries(rows) {
  return new Set(rows.filter(countsTowardTodaysSales).map((row) => row.repName)).size
}

const DETAIL_PANEL_Z = 120
const NOTE_PREVIEW_MAX = 48

function truncateNote(text, max = NOTE_PREVIEW_MAX) {
  const s = String(text ?? '').trim()
  if (!s) return '—'
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

function saleEntryStatusLabel(row) {
  if (row?.isSystemGenerated || row?.entryKind === 'system-zero') {
    return 'No log entered (system)'
  }
  if (Number(row?.amount ?? 0) === 0) return 'Logged — zero amount'
  return 'Logged'
}

function MessageIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

function buildAllowedParticipantIds(user, summary, participantIdsFromApi) {
  const ids = new Set(
    (Array.isArray(participantIdsFromApi) ? participantIdsFromApi : []).map(String)
  )
  const managerId = user?._id ?? user?.id
  if (managerId != null) ids.add(String(managerId))
  for (const m of summary?.members ?? []) {
    if (m?.userId != null) ids.add(String(m.userId))
  }
  return ids
}

/** Keep only the signed-in manager and their approved sales team. */
function filterToTeamScope(rows, allowedParticipantIds, manager) {
  if (!allowedParticipantIds?.size) return []
  const managerId = String(manager?._id ?? manager?.id ?? '')
  return rows.filter((row) => {
    const sid = String(row?.salesUserId ?? '')
    if (!allowedParticipantIds.has(sid)) return false
    if (row?.entryKind === 'manager' && sid !== managerId) return false
    return true
  })
}

export default function ManagerDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const [dailyActivity, setDailyActivity] = useState([])
  const [allowedParticipantIds, setAllowedParticipantIds] = useState(() => new Set())
  const [summary, setSummary] = useState(null)
  const [selectedDate, setSelectedDate] = useState(yesterdayInputValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailRow, setDetailRow] = useState(null)
  const [reporting, setReporting] = useState(false)
  const [pdfExport, setPdfExport] = useState(null)
  const reportPdfRef = useRef(null)
  const isSeltecManager = String(user?.company || '').toLowerCase() === 'seltec'
  const managerCompanyLogo = isSeltecManager ? seltecLogo : petrotekLogo
  const managerCompanyName = isSeltecManager ? 'Seltec' : 'Petrotek'
  const detailAccentClass = isSeltecManager ? 'bg-blue-600' : 'bg-red-600'
  const detailAccentSoftClass = isSeltecManager
    ? 'from-blue-50/95 via-white to-blue-50/70'
    : 'from-red-50/95 via-white to-red-50/70'

  const openChatForRow = useCallback(
    (row) => {
      const targetUserId = row?.salesUserId
      if (targetUserId == null || isManagerDailyRow(row, user)) return
      navigate('/chat', { state: { targetUserId: String(targetUserId) } })
    },
    [navigate, user]
  )

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [actRes, sumRes] = await Promise.all([
        api.get(`/api/manager/team-daily-sales?${ymQuery}`),
        api.get(`/api/manager/team-summary?${ymQuery}`),
      ])
      const summaryData = sumRes.data ?? null
      const allowed = buildAllowedParticipantIds(
        user,
        summaryData,
        actRes.data?.participantIds
      )
      const rawDaily = Array.isArray(actRes.data?.dailySales) ? actRes.data.dailySales : []
      setAllowedParticipantIds(allowed)
      setDailyActivity(filterToTeamScope(rawDaily, allowed, user))
      setSummary(summaryData)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else {
        setError('Could not load sales report data.')
      }
      setDailyActivity([])
      setAllowedParticipantIds(new Set())
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [ymQuery, user])

  useEffect(() => {
    load()
  }, [load])

  const filteredRows = useMemo(() => {
    if (!selectedDate) return dailyActivity
    return dailyActivity.filter((row) => isoDatePart(row?.saleDate) === selectedDate)
  }, [dailyActivity, selectedDate])

  const tableRows = useMemo(
    () => [...filteredRows].sort((a, b) => compareTeamDailyRows(a, b, user)),
    [filteredRows, user]
  )

  const isMonthView = !selectedDate

  const monthlySummaryRows = useMemo(() => {
    const byUser = new Map()
    const managerId = String(user?._id ?? user?.id ?? '')

    if (managerId) {
      byUser.set(managerId, {
        salesUserId: managerId,
        salesUserName: user?.name || '—',
        salesUserPhone: user?.phone || '—',
        salesUserDesignation: 'manager',
        totalAmount: 0,
        targetAmount: summary?.managerDefaultTargetAmount ?? null,
        logCount: 0,
      })
    }

    for (const member of summary?.members ?? []) {
      const id = String(member?.userId ?? '')
      if (!id) continue
      byUser.set(id, {
        salesUserId: id,
        salesUserName: member?.name || '—',
        salesUserPhone: member?.phone || '—',
        salesUserDesignation: 'sales',
        totalAmount: 0,
        targetAmount: member?.targetAmount ?? null,
        logCount: 0,
      })
    }

    for (const row of dailyActivity) {
      if (isSystemGeneratedDailyRow(row)) continue
      const id = String(row?.salesUserId ?? row?.repName ?? '')
      if (!id) continue
      const existing = byUser.get(id)
      if (!existing) continue
      existing.totalAmount += Number(row?.amount || 0)
      existing.logCount += 1
      byUser.set(id, existing)
    }

    return [...byUser.values()].sort((a, b) => {
      const amountDiff = Number(b.totalAmount || 0) - Number(a.totalAmount || 0)
      if (amountDiff !== 0) return amountDiff
      const logDiff = Number(b.logCount || 0) - Number(a.logCount || 0)
      if (logDiff !== 0) return logDiff
      return String(a.salesUserName || '').localeCompare(String(b.salesUserName || ''), undefined, {
        sensitivity: 'base',
      })
    })
  }, [dailyActivity, summary?.managerDefaultTargetAmount, summary?.members, user])

  const report = useMemo(() => {
    const monthTotal = dailyActivity.reduce(
      (sum, row) => sum + Number(row?.amount || 0),
      0
    )
    const scopedRows = selectedDate ? filteredRows : dailyActivity
    const scopedTotal = scopedRows.reduce(
      (sum, row) => sum + Number(row?.amount || 0),
      0
    )
    const activeRepsMonth = countUsersWithLoggedEntries(dailyActivity)
    const activeRepsScoped = countUsersWithLoggedEntries(scopedRows)
    const averageTicket =
      scopedRows.length > 0 ? scopedTotal / scopedRows.length : 0

    const scopedByRep = new Map()
    for (const row of scopedRows) {
      const key = row.repName
      scopedByRep.set(key, (scopedByRep.get(key) || 0) + Number(row.amount || 0))
    }
    let topRep = null
    for (const [repName, amount] of scopedByRep) {
      if (!topRep || amount > topRep.amount) topRep = { repName, amount }
    }

    const targetAmount = Number(summary?.teamTargetAmount || 0)
    const scopedProgressBase = selectedDate ? scopedTotal : monthTotal
    const targetProgressPct =
      targetAmount > 0
        ? Math.min(100, Math.round((scopedProgressBase / targetAmount) * 100))
        : null

    return {
      monthTotal,
      scopedTotal,
      activeRepsMonth,
      activeRepsScoped,
      loggedEntriesScoped: scopedRows.filter(countsTowardTodaysSales).length,
      averageTicket,
      topRep,
      targetAmount: targetAmount > 0 ? targetAmount : null,
      targetProgressPct,
      totalUsers:
        (Array.isArray(summary?.members) ? summary.members.length : 0) + 1,
    }
  }, [dailyActivity, filteredRows, selectedDate, summary])

  async function downloadMonthlyReportPdf() {
    const managerId = String(user?._id ?? user?.id ?? '')
    const pdfRows = monthlySummaryRows.filter((row) => {
      const rowId = String(row?.salesUserId ?? '')
      if (!rowId || !allowedParticipantIds.has(rowId)) return false
      if (row?.salesUserDesignation === 'manager') return rowId === managerId
      return true
    })

    if (!pdfRows.length) {
      setError('No sales logs for this month to export.')
      return
    }
    if (reporting) return

    setError('')
    setReporting(true)
    try {
      const [petrotekSrc, seltecSrc] = await Promise.all([
        resolveLogoForPdf(petrotekLogo),
        resolveLogoForPdf(seltecLogo),
      ])
      const monthPart = `${year}-${String(month).padStart(2, '0')}`
      const fileName = `manager-sales-logs-${monthPart}.pdf`
      const monthlyLogCount = pdfRows.reduce(
        (sum, row) => sum + Number(row?.logCount || 0),
        0
      )
      const totalAmount = pdfRows.reduce(
        (sum, row) => sum + Number(row?.totalAmount || 0),
        0
      )
      const activeSalesUsers = pdfRows.filter((row) => Number(row?.logCount || 0) > 0).length
      const topMonthlyRow = pdfRows.find((row) => Number(row?.totalAmount || 0) > 0)

      await runPdfExport({
        setPayload: setPdfExport,
        flushSync,
        reportRef: reportPdfRef,
        fileName,
        payload: {
          reportTitle: 'Monthly team sales report',
          portalLabel: 'Manager workspace',
          monthTitle: monthLabel(year, month),
          generatedAt: new Date().toLocaleString(),
          filterLabel: user?.name ? `Manager: ${user.name}` : null,
          summary: {
            totalLogs: monthlyLogCount,
            totalAmount,
            activeSalesUsers,
            topPerformerName: topMonthlyRow?.salesUserName,
            topPerformerAmount: topMonthlyRow?.totalAmount,
          },
          rows: pdfRows,
          petrotekLogoSrc: petrotekSrc || petrotekLogo,
          seltecLogoSrc: seltecSrc || seltecLogo,
        },
      })
    } catch (err) {
      console.error('PDF export failed:', err)
      setError('Could not generate PDF report. Please try again.')
    } finally {
      setReporting(false)
      setPdfExport(null)
    }
  }

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Daily activity"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-cyan-200/90 bg-cyan-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800/80">
            Sales total
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-cyan-950">
            {loading ? '—' : formatMoney(report.scopedTotal)}
          </p>
          <p className="mt-1 text-xs text-cyan-900/70">
            {selectedDate ? selectedDate : `${monthLabel(year, month)} (month)`}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200/90 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
            Avg Sale Amount
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-950">
            {loading ? '—' : formatMoney(report.averageTicket)}
          </p>
          <p className="mt-1 text-xs text-emerald-900/70">
            Based on current table filter
          </p>
        </article>
        <article className="rounded-2xl border border-violet-200/90 bg-violet-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80">
            Top performer
          </p>
          <p className="mt-2 text-lg font-semibold text-violet-950">
            {loading ? '—' : report.topRep?.repName || '—'}
          </p>
          <p className="mt-1 text-xs font-medium tabular-nums text-violet-900/80">
            {loading || !report.topRep ? 'No entries' : formatMoney(report.topRep.amount)}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-200/90 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
            Team users / Todays Sales
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-950">
            {loading ? '—' : `${report.totalUsers}/${report.activeRepsScoped}`}
          </p>
          <p className="mt-1 text-xs text-amber-900/70">
            Active this view, total this month: {loading ? '—' : report.activeRepsMonth}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">
                {isMonthView ? 'Monthly totals by user' : 'Team daily entries'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isMonthView
                  ? 'Month view summarizes each user once with their total amount.'
                  : 'Cards and table follow this date filter. Clear to view full-month report.'}
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-2xl sm:flex-row sm:items-center sm:gap-2">
              {isMonthView ? (
                <>
                  <ManagerMonthControl year={year} month={month} goPrev={goPrev} goNext={goNext} />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(yesterdayInputValue())}
                    className="min-h-[44px] shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:min-h-0"
                  >
                    Daily
                  </button>
                </>
              ) : (
                <>
                  <label
                    htmlFor="manager-daily-date"
                    className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    Date
                  </label>
                  <input
                    id="manager-daily-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value || yesterdayInputValue())}
                    className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:w-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="min-h-[44px] shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:min-h-0"
                  >
                    Month
                  </button>
                </>
              )}
              {isMonthView ? (
                <button
                  type="button"
                  onClick={downloadMonthlyReportPdf}
                  disabled={reporting || loading || monthlySummaryRows.length === 0}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
                >
                  <svg className="h-4 w-4 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  {reporting ? 'Generating PDF…' : 'Download PDF'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {/* {!loading && filteredRows.length > 0 ? (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
            <p className="text-xs text-slate-600">
              Showing <span className="font-semibold">{report.loggedEntriesScoped}</span>{' '}
              logs from <span className="font-semibold">{report.activeRepsScoped}</span> users
            </p>
          </div>
        ) : null} */}
        {loading ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">Loading…</p>
        ) : isMonthView && monthlySummaryRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No team users found for this month.</p>
        ) : !isMonthView && dailyActivity.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No daily entries for this month.</p>
        ) : !isMonthView && filteredRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">
            No entries found for the selected date.
          </p>
        ) : isMonthView ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-red-600 text-xs font-semibold uppercase text-white">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">User</th>
                    <th className="px-4 py-3 sm:px-6">Phone</th>
                    <th className="px-4 py-3 text-right sm:px-6">Monthly total</th>
                    <th className="px-4 py-3 text-right sm:px-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlySummaryRows.map((row) => (
                    <tr key={row.salesUserId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {row.salesUserName}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 sm:px-6">
                        {row.salesUserPhone}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900 sm:px-6">
                        {formatMoney(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        {row.salesUserDesignation === 'sales' ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/manager/team/rep/${row.salesUserId}`, {
                                state: {
                                  repName: row.salesUserName,
                                  repPhone: row.salesUserPhone,
                                  repUserId: row.salesUserId,
                                },
                              })
                            }
                            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-slate-50 hover:text-red-900"
                          >
                            View detail
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {monthlySummaryRows.map((row) => (
                <li key={row.salesUserId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{row.salesUserName}</p>
                      <p className="text-xs tabular-nums text-slate-500">{row.salesUserPhone}</p>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums text-slate-900">
                      {formatMoney(row.totalAmount)}
                    </p>
                  </div>
                  {row.salesUserDesignation === 'sales' ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/manager/team/rep/${row.salesUserId}`, {
                          state: {
                            repName: row.salesUserName,
                            repPhone: row.salesUserPhone,
                            repUserId: row.salesUserId,
                          },
                        })
                      }
                      className="mt-3 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm"
                    >
                      View detail
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-red-600 text-xs font-semibold uppercase text-white">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Rep</th>
                    <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-4 py-3 sm:px-6">Note</th>
                    <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((row) => {
                    const canChat = !isManagerDailyRow(row, user) && row?.salesUserId != null
                    const notePreview = truncateNote(row.note)
                    return (
                      <tr key={row._id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 sm:px-6">
                          <span className="font-medium text-slate-900">{row.repName}</span>
                          <span className="ml-2 text-xs text-slate-500">{row.repPhone}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                          {formatMoney(row.amount)}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-slate-600 sm:max-w-[280px] sm:px-6">
                          <span className="block truncate" title={row.note?.trim() || undefined}>
                            {notePreview}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right sm:px-6">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailRow(row)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              View
                            </button>
                            {canChat ? (
                              <button
                                type="button"
                                onClick={() => openChatForRow(row)}
                                className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                aria-label={`Message ${row.repName}`}
                                title={`Message ${row.repName}`}
                              >
                                <MessageIcon />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {tableRows.map((row) => {
                const canChat = !isManagerDailyRow(row, user) && row?.salesUserId != null
                const notePreview = truncateNote(row.note)
                return (
                  <li key={row._id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{row.repName}</p>
                        <p className="text-xs text-slate-500">{row.repPhone}</p>
                        <p
                          className="mt-2 truncate text-sm text-slate-600"
                          title={row.note?.trim() || undefined}
                        >
                          {notePreview}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-base font-semibold tabular-nums text-slate-900">
                        {formatMoney(row.amount)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="min-h-[40px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
                      >
                        View
                      </button>
                      {canChat ? (
                        <button
                          type="button"
                          onClick={() => openChatForRow(row)}
                          className="inline-flex min-h-[40px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm"
                          aria-label={`Message ${row.repName}`}
                        >
                          <MessageIcon />
                        </button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {detailRow ? (
        <div
          className="fixed inset-0 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          style={{ zIndex: DETAIL_PANEL_Z }}
          onClick={() => setDetailRow(null)}
        >
          <div
            className="relative isolate flex max-h-[min(92dvh,92vh)] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 sm:max-h-[min(88vh,88dvh)] sm:rounded-2xl"
            style={{ zIndex: DETAIL_PANEL_Z + 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manager-daily-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className={`relative shrink-0 border-b border-slate-100 bg-gradient-to-r ${detailAccentSoftClass} px-4 py-4 sm:px-6 sm:py-5`}>
              <div className={`absolute inset-y-0 left-0 w-1 ${detailAccentClass}`} aria-hidden />
              <div className="flex items-start justify-between gap-4 pl-2.5 sm:pl-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Daily sale detail
                  </p>
                  <h2
                    id="manager-daily-detail-title"
                    className="mt-1 break-words text-xl font-bold leading-tight tracking-tight text-slate-900 sm:text-2xl"
                  >
                    {detailRow.repName}
                  </h2>
                  <p className="mt-1 break-all text-sm tabular-nums text-slate-600">
                    {detailRow.repPhone || '—'}
                  </p>
                </div>
                <img
                  src={managerCompanyLogo}
                  alt={managerCompanyName}
                  className="h-12 w-auto max-w-[10rem] shrink-0 object-contain sm:h-14"
                />
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Sale amount
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-950">
                  {formatMoney(detailRow.amount)}
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </dt>
                  <dd className="mt-2 font-semibold text-slate-900">
                    {formatSaleDate(detailRow.saleDate)}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Note
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-800">
                    {detailRow.note?.trim() ? detailRow.note : '—'}
                  </dd>
                </div>
              </dl>
            </div>
            <footer className="flex shrink-0 flex-wrap gap-2 border-t border-slate-100 bg-slate-50/90 px-4 py-4 sm:px-6">
              {!isManagerDailyRow(detailRow, user) && detailRow.salesUserId != null ? (
                <button
                  type="button"
                  onClick={() => {
                    openChatForRow(detailRow)
                    setDetailRow(null)
                  }}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-100"
                >
                  <MessageIcon className="h-4 w-4" />
                  Message
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="min-h-[44px] flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}
      {pdfExport ? (
        <AdminMonthlySalesLogsReportHtml ref={reportPdfRef} {...pdfExport} />
      ) : null}
    </DashboardShell>
  )
}
