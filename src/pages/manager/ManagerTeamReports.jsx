import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import ReportDetailModal from '../../components/ReportDetailModal.jsx'
import { field, btnPrimary } from '../../lib/salesFormStyles.js'
import { formatSaleDate } from '../../lib/format.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'

const verificationKeys = [
  { key: 'customerNamesRecorded', label: 'Customer names recorded' },
  { key: 'outcomesMentioned', label: 'Outcomes mentioned' },
  { key: 'quoteValuesRecorded', label: 'Quote values recorded' },
  { key: 'orderValuesRecorded', label: 'Order values recorded' },
  { key: 'newCustomersClearlyMarked', label: 'New customers clearly marked' },
  { key: 'businessGeneratedVisible', label: 'Business generated visible' },
  { key: 'crmUpdated', label: 'CRM Updated' },
  { key: 'verifiedByManager', label: 'Verified by manager' },
]

function value(v) {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

function getReview(report) {
  return report?.managementCheck || report?.managementReview || {}
}

function reviewProgress(report) {
  const review = getReview(report)
  const done = verificationKeys.filter(({ key }) => Boolean(review?.[key])).length
  return `${done}/${verificationKeys.length}`
}

export default function ManagerTeamReports({ user, onLogout }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [filters, setFilters] = useState({ type: 'all', date: '' })
  const [pdfPayload, setPdfPayload] = useState(null)
  const pdfRef = useRef(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '300')
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.date) params.set('date', filters.date)
    return params.toString()
  }, [filters])

  const loadReports = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get(`/api/reports/manager/team?${query}`)
      const next = Array.isArray(data?.reports) ? data.reports : []
      setReports(next)
      if (selected?._id) {
        const refreshed = next.find((r) => String(r._id) === String(selected._id))
        setSelected(refreshed || null)
      }
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load team reports.')
      setReports([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }, [query, selected?._id])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function saveVerification(e) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const review = getReview(selected)
      await api.put(`/api/reports/manager/team/${selected._id}/verification`, {
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
      })
      await loadReports()
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

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Team reports"
      subtitle="Review and verify your sales team submissions"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader />}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
            <select
              value={filters.type}
              onChange={(e) => setFilters((x) => ({ ...x, type: e.target.value }))}
              className={field}
            >
              <option value="all">All</option>
              <option value="outdoor">Outdoor</option>
              <option value="indoor">Indoor</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-slate-600">Date</span>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters((x) => ({ ...x, date: e.target.value }))}
              className={field}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setFilters({ type: 'all', date: '' })}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">Team report list</h2>
          </div>
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No reports found for filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Sales user</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Verified</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r._id} className={selected?._id === r._id ? 'bg-blue-50/40' : ''}>
                      <td className="px-4 py-3 text-slate-900">{r.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{r.type}</td>
                      <td className="px-4 py-3 text-slate-700">{reviewProgress(r)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="View report"
                            aria-label="View report"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setViewing(r)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Review verification"
                            aria-label="Review verification"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => setSelected(r)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Download PDF"
                            aria-label="Download PDF"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                            disabled={downloadingPdfId === String(r._id)}
                            onClick={() => handleDownloadPdf(r)}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Verification panel</h2>
          {!selected ? (
            <p className="mt-3 text-sm text-slate-500">Select a report to verify manager checks.</p>
          ) : (
            <form onSubmit={saveVerification} className="mt-3 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{selected.user?.name || '—'}</p>
                <p className="text-slate-600">{formatSaleDate(selected.date)} · {selected.type} · {value(selected.companyName)}</p>
                <p className="mt-2 text-slate-700">Exec: {value(selected.salesExecutiveName)}</p>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
                <p>Total activities done today: {value(selected.activityCountSummary?.totalActivitiesDoneToday)}</p>
                <p>Activities updated in CRM: {value(selected.activityCountSummary?.activitiesUpdatedInCrm)}</p>
                <p>Business quotation value: {value(selected.businessGenerated?.totalQuotationValue)}</p>
                <p>Business order value: {value(selected.businessGenerated?.totalOrderValue)}</p>
              </div>
              <div className="space-y-2">
                {verificationKeys.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(getReview(selected)?.[key])}
                      onChange={(e) =>
                        setSelected((x) => ({
                          ...x,
                          managementCheck: {
                            ...(x.managementCheck || getReview(x)),
                            [key]: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Manager initials</span>
                <input
                  value={getReview(selected)?.managerInitials || ''}
                  onChange={(e) =>
                    setSelected((x) => ({
                      ...x,
                      managementCheck: {
                        ...(x.managementCheck || getReview(x)),
                        managerInitials: e.target.value,
                      },
                    }))
                  }
                  className={field}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Manager remarks</span>
                <textarea
                  rows={3}
                  value={getReview(selected)?.managerRemarks || ''}
                  onChange={(e) =>
                    setSelected((x) => ({
                      ...x,
                      managementCheck: {
                        ...(x.managementCheck || getReview(x)),
                        managerRemarks: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Saving...' : 'Save verification'}
              </button>
              <p className="text-xs text-slate-500">
                Saved by manager with timestamp automatically.
              </p>
            </form>
          )}
        </section>
      </div>
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
