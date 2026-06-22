import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { formatSaleDate } from '../../lib/format.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'

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

function labelize(key) {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (x) => x.toUpperCase())
}

const kpiLabels = [
  ['newCustomers', 'New customers'],
  ['existingFollowUps', 'Existing follow-ups'],
  ['customerVisits', 'Customer visits'],
  ['callsMade', 'Calls made'],
  ['quotationsSent', 'Quotations sent'],
  ['ordersReceived', 'Orders received'],
  ['collectionFollowUps', 'Collection follow-ups'],
]

function value(v) {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
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

export default function AdminReports() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [filters, setFilters] = useState({ type: 'all', date: '' })
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [pdfPayload, setPdfPayload] = useState(null)
  const pdfRef = useRef(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '500')
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.date) params.set('date', filters.date)
    return params.toString()
  }, [filters])

  const loadReports = useCallback(async () => {
    setError('')
    try {
      const { data } = await adminApi.get(`/api/reports/admin/reports?${query}`)
      const rows = Array.isArray(data?.reports) ? data.reports : []
      setReports(rows)
      if (selected?._id) {
        const refreshed = rows.find((r) => String(r._id) === String(selected._id))
        setSelected(refreshed || null)
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
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }, [navigate, query, selected?._id])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/', { replace: true })
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

  return (
    <DashboardShell
      badge="Administration"
      title="Sales reports"
      subtitle="Read-only access across all report submissions"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actionsPlacement="belowHeading"
      actions={<AdminSectionHeaderNav />}
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">All reports</h2>
          </div>
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No reports found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Sales user</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Manager verification</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r._id} className={selected?._id === r._id ? 'bg-blue-50/40' : ''}>
                      <td className="px-4 py-3 text-slate-900">{r.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{r.type}</td>
                      <td className="px-4 py-3 text-slate-700">{verificationSummary(r)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title="View report"
                            aria-label="View report"
                            onClick={() => {
                              setSelected(r)
                              setViewing(r)
                            }}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Full report view</h2>
          {!selected ? (
            <p className="mt-3 text-sm text-slate-500">Select any row to inspect full report details.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{selected.user?.name || '—'}</p>
                <p>{formatSaleDate(selected.date)} · {selected.type} · {value(selected.companyName)}</p>
                <p className="mt-1 text-slate-700">Sales executive: {value(selected.salesExecutiveName)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Daily target achievement</p>
                {kpiLabels.map(([key, label]) => {
                  const row = selected.dailyTargetAchievement?.[key] || {}
                  return (
                    <p key={`kpi-${key}`} className="mt-1">
                      {label}: {value(row.achievedToday)} / {value(row.dailyTarget)}
                    </p>
                  )
                })}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Customer activities</p>
                {(selected.customerActivities || []).map((row, i) => (
                  <p key={`activity-${i}`} className="mt-1">
                    {value(row.customerType)} · {value(row.customerName)} · {value(row.purpose)} · {value(row.outcomeNextAction)}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Activity summary</p>
                <p className="mt-1">Done today: {value(selected.activityCountSummary?.totalActivitiesDoneToday)}</p>
                <p>Pending/non-productive: {value(selected.activityCountSummary?.pendingNonProductive)}</p>
                <p>Not in CRM: {value(selected.activityCountSummary?.activitiesNotInCrm)}</p>
                <p>Productive: {value(selected.activityCountSummary?.productiveActivities)}</p>
                <p>Updated in CRM: {value(selected.activityCountSummary?.activitiesUpdatedInCrm)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Business generated</p>
                <p className="mt-1">Quotation value: {value(selected.businessGenerated?.totalQuotationValue)}</p>
                <p>Order value: {value(selected.businessGenerated?.totalOrderValue)}</p>
                <p>Collections followed-up: {value(selected.businessGenerated?.collectionsFollowedUp)}</p>
                <p>Pipeline value: {value(selected.businessGenerated?.pipelineValue)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Manager verification</p>
                <ul className="mt-1 space-y-1">
                  {verificationKeys.map((key) => (
                    <li key={key}>
                      {labelize(key)}: {getReview(selected)?.[key] ? 'Yes' : 'No'}
                    </li>
                  ))}
                  <li>Verified By: {getReview(selected)?.verifiedBy?.name || '—'}</li>
                  <li>
                    Verified At:{' '}
                    {getReview(selected)?.verifiedAt
                      ? new Date(getReview(selected).verifiedAt).toLocaleString()
                      : '—'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
      {viewing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Report details</h3>
                  <p className="mt-1 text-sm text-slate-500">{viewing.user?.name || '—'} · {formatSaleDate(viewing.date)} · {viewing.type}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-4 px-4 py-4 text-sm sm:px-6 sm:py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Daily target achievement</p>
                {kpiLabels.map(([key, label]) => {
                  const row = viewing.dailyTargetAchievement?.[key] || {}
                  return (
                    <p key={key} className="mt-1 text-slate-700">
                      {label}: {value(row.achievedToday)} / {value(row.dailyTarget)}
                    </p>
                  )
                })}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Customer activities</p>
                {(viewing.customerActivities || []).map((row, i) => (
                  <p key={`viewing-customer-${i}`} className="mt-1 text-slate-700">
                    {value(row.customerType)} · {value(row.customerName)} · {value(row.purpose)} · {value(row.outcomeNextAction)}
                  </p>
                ))}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Activity summary</p>
                <p className="mt-1 text-slate-700">Done today: {value(viewing.activityCountSummary?.totalActivitiesDoneToday)}</p>
                <p className="text-slate-700">Pending/non-productive: {value(viewing.activityCountSummary?.pendingNonProductive)}</p>
                <p className="text-slate-700">Not in CRM: {value(viewing.activityCountSummary?.activitiesNotInCrm)}</p>
                <p className="text-slate-700">Productive: {value(viewing.activityCountSummary?.productiveActivities)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Business generated</p>
                <p className="mt-1 text-slate-700">Quotation value: {value(viewing.businessGenerated?.totalQuotationValue)}</p>
                <p className="text-slate-700">Order value: {value(viewing.businessGenerated?.totalOrderValue)}</p>
                <p className="text-slate-700">Collections followed-up: {value(viewing.businessGenerated?.collectionsFollowedUp)}</p>
                <p className="text-slate-700">Pipeline value: {value(viewing.businessGenerated?.pipelineValue)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pdfPayload ? <DailyReportPdfHtml ref={pdfRef} {...pdfPayload} aria-hidden /> : null}
    </DashboardShell>
  )
}
