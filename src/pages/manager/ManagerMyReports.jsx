import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import DailyReportForm from '../../features/dailyReports/components/DailyReportForm.jsx'
import {
  buildReportDraft,
  buildSubmitPayload,
  createInitialForm,
  displayValue,
  getDailyReportFormTheme,
  isSeltecCompany,
  reportToForm,
} from '../../features/dailyReports/utils/dailyReportForm.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import { resolveLogoForPdf } from '../../lib/pdfLogo.js'
import ReportDetailModal from '../../features/dailyReports/components/ReportDetailModal.jsx'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'
import petrotekPdfLogo from '../../assets/logopdf.png'
import seltecLogo from '../../assets/seltecLogo.png'
import { formatSaleDate } from '../../lib/format.js'
import { btnGhost } from '../../lib/salesFormStyles.js'

const API_BASE = '/api/reports/manager/mine'

const actionIconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50'

export default function ManagerMyReports({ user, onLogout }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => createInitialForm(user))
  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [pdfPayload, setPdfPayload] = useState(null)
  const [previewPayload, setPreviewPayload] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewDownloading, setPreviewDownloading] = useState(false)
  const pdfRef = useRef(null)

  const formStyles = useMemo(() => getDailyReportFormTheme(user, 'manager'), [user])

  const loadReports = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get(`${API_BASE}?limit=200`)
      setReports(Array.isArray(data?.reports) ? data.reports : [])
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load reports.')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function handleOpenPdfPreview() {
    setPreviewLoading(true)
    setError('')
    try {
      const companyName = user?.company || form.companyName || ''
      const logoAsset = isSeltecCompany(companyName) ? seltecLogo : petrotekPdfLogo
      const logoSrc = await resolveLogoForPdf(logoAsset)
      const reportDraft = buildReportDraft(form, user)
      setPreviewPayload({
        report: reportDraft,
        logoSrc,
        companyName,
        generatedAt: new Date().toLocaleString(),
        salesExecutiveName: user?.name || form.salesExecutiveName || 'Manager',
        salesExecutivePhone: user?.phone || user?.phoneNumber || '',
        viewerLabel: 'Preview',
      })
      setPreviewOpen(true)
    } catch {
      setError('Could not prepare PDF preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDownloadPreviewPdf() {
    if (!previewPayload?.report) return
    setPreviewDownloading(true)
    setError('')
    try {
      await exportDailyReportPdf({
        report: previewPayload.report,
        fallbackUser: user,
        reportRef: pdfRef,
        setPdfPayload,
        flushSync,
        viewerLabel: 'Preview copy',
      })
    } catch (err) {
      console.error('Preview PDF export failed:', err)
      setError('Could not generate preview PDF. Please try again.')
    } finally {
      setPreviewDownloading(false)
      setPdfPayload(null)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = buildSubmitPayload(form, user)
      if (editingId) {
        await api.put(`${API_BASE}/${editingId}`, payload)
      } else {
        await api.post(API_BASE, payload)
      }
      setForm(createInitialForm(user))
      setFormOpen(false)
      setFormStep(1)
      setEditingId(null)
      await loadReports()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : `Could not ${editingId ? 'update' : 'save'} report.`)
    } finally {
      setSaving(false)
    }
  }

  function openCreateForm() {
    setError('')
    setForm(createInitialForm(user))
    setEditingId(null)
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEditForm(report) {
    setError('')
    setEditingId(report?._id || null)
    setForm(reportToForm(report, user))
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormOpen(false)
    setFormStep(1)
    setEditingId(null)
    setForm(createInitialForm(user))
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

  async function handleDelete(reportId) {
    if (!reportId) return
    if (!window.confirm('Delete this report?')) return
    setError('')
    try {
      await api.delete(`${API_BASE}/${reportId}`)
      await loadReports()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not delete report.')
    }
  }

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="My daily reports"
      subtitle="Submit your personal daily report — visible only to you and admin"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader user={user} />}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      {formOpen ? (
        <DailyReportForm
          form={form}
          setForm={setForm}
          formStep={formStep}
          setFormStep={setFormStep}
          editingId={editingId}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={closeForm}
          onPreview={handleOpenPdfPreview}
          previewLoading={previewLoading}
          submitterNameLabel="Your name"
          styles={formStyles}
        />
      ) : null}

      {!formOpen ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">My reports</h2>
                <p className="mt-1 text-sm text-slate-500">Create and manage your personal daily reports.</p>
              </div>
              <button type="button" onClick={openCreateForm} className={`w-full sm:w-auto ${formStyles.btnPrimary}`}>
                New report
              </button>
            </div>
          </div>
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading...</p>
          ) : reports.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No reports submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className={formStyles.formTableHeadClass}>
                  <tr>
                    <th className="px-4 py-3 lg:px-6">Date</th>
                    <th className="px-4 py-3 lg:px-6">Type</th>
                    <th className="px-4 py-3 lg:px-6">Company</th>
                    <th className="px-4 py-3 lg:px-6">Activities done</th>
                    <th className="px-4 py-3 text-right lg:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900 lg:px-6">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700 lg:px-6">{r.type}</td>
                      <td className="px-4 py-3 text-slate-700 lg:px-6">{displayValue(r.companyName)}</td>
                      <td className="px-4 py-3 text-slate-700 lg:px-6">{displayValue(r.activityCountSummary?.totalActivitiesDoneToday)}</td>
                      <td className="px-4 py-3 text-right lg:px-6">
                        <div className="inline-flex items-center gap-1">
                          <button type="button" title="View report" aria-label="View report" className={actionIconBtn} onClick={() => setViewing(r)}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" /></svg>
                          </button>
                          <button type="button" title="Edit report" aria-label="Edit report" className={actionIconBtn} onClick={() => openEditForm(r)}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button type="button" title="Delete report" aria-label="Delete report" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-700 shadow-sm transition hover:bg-red-50 hover:text-red-800" onClick={() => handleDelete(r._id)}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                          <button type="button" title="Download PDF" aria-label="Download PDF" className={actionIconBtn} disabled={downloadingPdfId === String(r._id)} onClick={() => handleDownloadPdf(r)}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" /></svg>
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
      ) : null}

      {viewing ? (
        <ReportDetailModal report={viewing} onClose={() => setViewing(null)} onDownload={() => handleDownloadPdf(viewing)} downloading={downloadingPdfId === String(viewing?._id)} formatDate={formatSaleDate} />
      ) : null}

      {previewOpen && previewPayload ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">PDF preview</h3>
                  <p className="text-xs text-slate-500">Review before creating the report.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={formStyles.btnPrimary} onClick={handleDownloadPreviewPdf} disabled={previewDownloading}>
                    {previewDownloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button type="button" className={btnGhost} onClick={() => setPreviewOpen(false)}>Close</button>
                </div>
              </div>
            </div>
            <div className="flex justify-center bg-slate-100 p-3 sm:p-4">
              <DailyReportPdfHtml {...previewPayload} preview />
            </div>
          </div>
        </div>
      ) : null}

      {pdfPayload ? <DailyReportPdfHtml ref={pdfRef} {...pdfPayload} aria-hidden /> : null}
    </DashboardShell>
  )
}
