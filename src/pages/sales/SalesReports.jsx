import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import { formatSaleDate } from '../../lib/format.js'
import { btnGhost, btnPrimary, field, fieldTextarea } from '../../lib/salesFormStyles.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const initialForm = {
  date: todayIso(),
  type: 'outdoor',
  officeIn: '',
  officeOut: '',
  odoStart: '',
  odoEnd: '',
  covered: '',
  vehicleNumber: '',
  newVisit: '',
  repeatVisit: '',
  customerCalls: '',
  quotationSend: '',
  quotationReceived: '',
  paymentFollowUp: '',
  newCustomer: '',
  quotationValue: '',
  orderValue: '',
  expectedBusiness: '',
  collectionRecived: '',
  pipeline: '',
  customerName: '',
  purpouse: '',
  outcome: '',
  notes: '',
}

function reportToForm(report) {
  const attendance = report?.attendacne?.[0] || {}
  const activity = report?.activity?.[0] || {}
  const generatedBusiness = report?.generatedBusiness?.[0] || {}
  const customerVisit = report?.customerVisit?.[0] || {}
  return {
    date: report?.date ? new Date(report.date).toISOString().slice(0, 10) : todayIso(),
    type: report?.type || 'outdoor',
    officeIn: attendance.officeIn || '',
    officeOut: attendance.officeOut || '',
    odoStart: attendance.odoStart || '',
    odoEnd: attendance.odoEnd || '',
    covered: attendance.covered || '',
    vehicleNumber: attendance.vehicleNumber || '',
    newVisit: activity.newVisit || '',
    repeatVisit: activity.repeatVisit || '',
    customerCalls: activity.customerCalls || '',
    quotationSend: activity.quotationSend || '',
    quotationReceived: activity.quotationReceived || '',
    paymentFollowUp: activity.paymentFollowUp || '',
    newCustomer: activity.newCustomer || '',
    quotationValue: generatedBusiness.quotationValue || '',
    orderValue: generatedBusiness.orderValue || '',
    expectedBusiness: generatedBusiness.expectedBusiness || '',
    collectionRecived: generatedBusiness.collectionRecived || '',
    pipeline: generatedBusiness.pipeline || '',
    customerName: customerVisit.customerName || '',
    purpouse: customerVisit.purpouse || '',
    outcome: customerVisit.outcome || '',
    notes: report?.notes || '',
  }
}

function verificationSummary(managementReview) {
  if (!managementReview) return 'Pending verification'
  const checks = [
    managementReview.outdoorVisitVerified,
    managementReview.attendanceVerified,
    managementReview.reportSubmitted,
    managementReview.crmUpdated,
  ]
  const done = checks.filter(Boolean).length
  return `${done}/4 verified`
}

function FormField({ id, label, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
    </div>
  )
}

const FORM_STEPS = [
  { step: 1, title: 'Attendance & vehicle' },
  { step: 2, title: 'Activity & business' },
  { step: 3, title: 'Customer visit & notes' },
]

function FormStepIndicator({ currentStep }) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Form progress">
      {FORM_STEPS.map(({ step, title }) => {
        const active = step === currentStep
        const done = step < currentStep
        return (
          <div
            key={step}
            className={`flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm ${
              active
                ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                : done
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : 'border-transparent bg-transparent text-slate-400'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                active || done ? 'bg-red-600' : 'bg-slate-300'
              }`}
            >
              {step}
            </span>
            <span className="truncate">{title}</span>
          </div>
        )
      })}
    </div>
  )
}

function PageSection({ step, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  )
}

export default function SalesReports({ user, onLogout }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)
  const [formOpen, setFormOpen] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [pdfPayload, setPdfPayload] = useState(null)
  const pdfRef = useRef(null)

  const loadReports = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/api/reports?limit=200')
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

  const reportCount = reports.length

  const lastVerifiedLabel = useMemo(() => {
    const withVerification = reports.find((r) => r?.managementReview?.verifiedAt)
    if (!withVerification) return 'No manager verification yet'
    return `Last verified ${new Date(withVerification.managementReview.verifiedAt).toLocaleString()}`
  }, [reports])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        date: form.date,
        type: form.type,
        attendacne: [
          {
            officeIn: form.officeIn,
            officeOut: form.officeOut,
            odoStart: form.odoStart,
            odoEnd: form.odoEnd,
            covered: form.covered,
            vehicleNumber: form.vehicleNumber,
          },
        ],
        activity: [
          {
            newVisit: form.newVisit,
            repeatVisit: form.repeatVisit,
            customerCalls: form.customerCalls,
            quotationSend: form.quotationSend,
            quotationReceived: form.quotationReceived,
            paymentFollowUp: form.paymentFollowUp,
            newCustomer: form.newCustomer,
          },
        ],
        generatedBusiness: [
          {
            quotationValue: form.quotationValue,
            orderValue: form.orderValue,
            expectedBusiness: form.expectedBusiness,
            collectionRecived: form.collectionRecived,
            pipeline: form.pipeline,
          },
        ],
        customerVisit: [
          {
            customerName: form.customerName,
            purpouse: form.purpouse,
            outcome: form.outcome,
          },
        ],
        notes: form.notes,
      }
      if (editingId) {
        await api.put(`/api/reports/${editingId}`, payload)
      } else {
        await api.post('/api/reports', payload)
      }
      setForm({ ...initialForm, date: todayIso() })
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
    setForm({ ...initialForm, date: todayIso() })
    setEditingId(null)
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEditForm(report) {
    setError('')
    setEditingId(report?._id || null)
    setForm(reportToForm(report))
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormOpen(false)
    setFormStep(1)
    setEditingId(null)
    setForm({ ...initialForm, date: todayIso() })
  }

  function validateFormStep(step) {
    const root = document.getElementById(`daily-report-form-step-${step}`)
    if (!root) return true
    const fields = root.querySelectorAll('input, textarea, select')
    for (const el of fields) {
      if (!el.reportValidity()) return false
    }
    return true
  }

  function goToPreviousStep() {
    setFormStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goToNextStep() {
    if (!validateFormStep(formStep)) return
    setFormStep((s) => Math.min(FORM_STEPS.length, s + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        viewerLabel: 'Sales copy',
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
      await api.delete(`/api/reports/${reportId}`)
      await loadReports()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not delete report.')
    }
  }

  return (
    <DashboardShell
      badge="Sales workspace"
      title="Daily reports"
      subtitle="Create and track your report submissions"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<SalesWorkspaceHeader />}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {!formOpen ? (
        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Your reports</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{loading ? '...' : reportCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Verification status</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{loading ? 'Loading...' : lastVerifiedLabel}</p>
          </article>
        </section>
      ) : null}

      {formOpen ? (
        <form onSubmit={handleCreate} className="mb-6 space-y-5 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Edit daily report' : 'New daily report'}</h2>
            </div>
            <button type="button" className={`shrink-0 ${btnGhost}`} onClick={closeForm}>
              Back to list
            </button>
          </div>

          <FormStepIndicator currentStep={formStep} />

          {formStep === 1 ? (
            <PageSection
              step={1}
              title="Attendance & vehicle"
              description="Capture the day, visit type, timings, odometer, and vehicle details."
            >
              <div id="daily-report-form-step-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="report-date" label="Date">
                    <input
                      id="report-date"
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm((x) => ({ ...x, date: e.target.value }))}
                      className={field}
                    />
                  </FormField>
                  <FormField id="report-type" label="Type">
                    <select
                      id="report-type"
                      value={form.type}
                      onChange={(e) => setForm((x) => ({ ...x, type: e.target.value }))}
                      className={field}
                    >
                      <option value="outdoor">Outdoor</option>
                      <option value="indoor">Indoor</option>
                    </select>
                  </FormField>
                  <FormField id="office-in" label="Office in">
                    <input id="office-in" required value={form.officeIn} onChange={(e) => setForm((x) => ({ ...x, officeIn: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="office-out" label="Office out">
                    <input id="office-out" required value={form.officeOut} onChange={(e) => setForm((x) => ({ ...x, officeOut: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="odo-start" label="ODO start">
                    <input id="odo-start" required value={form.odoStart} onChange={(e) => setForm((x) => ({ ...x, odoStart: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="odo-end" label="ODO end">
                    <input id="odo-end" required value={form.odoEnd} onChange={(e) => setForm((x) => ({ ...x, odoEnd: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="covered-km" label="KM covered">
                    <input id="covered-km" required value={form.covered} onChange={(e) => setForm((x) => ({ ...x, covered: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="vehicle-number" label="Vehicle number">
                    <input id="vehicle-number" required value={form.vehicleNumber} onChange={(e) => setForm((x) => ({ ...x, vehicleNumber: e.target.value }))} className={field} />
                  </FormField>
                </div>
              </div>
            </PageSection>
          ) : null}

          {formStep === 2 ? (
            <PageSection
              step={2}
              title="Sales activity & business"
              description="Add sales activity metrics and generated business values."
            >
              <div id="daily-report-form-step-2">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="new-visit" label="New visit">
                    <input id="new-visit" required value={form.newVisit} onChange={(e) => setForm((x) => ({ ...x, newVisit: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="repeat-visit" label="Repeat visit">
                    <input id="repeat-visit" required value={form.repeatVisit} onChange={(e) => setForm((x) => ({ ...x, repeatVisit: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="customer-calls" label="Customer calls">
                    <input id="customer-calls" required value={form.customerCalls} onChange={(e) => setForm((x) => ({ ...x, customerCalls: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="quotation-send" label="Quotations sent">
                    <input id="quotation-send" required value={form.quotationSend} onChange={(e) => setForm((x) => ({ ...x, quotationSend: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="quotation-received" label="Orders received">
                    <input id="quotation-received" required value={form.quotationReceived} onChange={(e) => setForm((x) => ({ ...x, quotationReceived: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="payment-follow-up" label="Payment follow-ups">
                    <input id="payment-follow-up" required value={form.paymentFollowUp} onChange={(e) => setForm((x) => ({ ...x, paymentFollowUp: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="new-customer" label="New customers added">
                    <input id="new-customer" required value={form.newCustomer} onChange={(e) => setForm((x) => ({ ...x, newCustomer: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="quotation-value" label="Quotation value">
                    <input id="quotation-value" required value={form.quotationValue} onChange={(e) => setForm((x) => ({ ...x, quotationValue: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="order-value" label="Order value">
                    <input id="order-value" required value={form.orderValue} onChange={(e) => setForm((x) => ({ ...x, orderValue: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="expected-business" label="Expected business">
                    <input id="expected-business" required value={form.expectedBusiness} onChange={(e) => setForm((x) => ({ ...x, expectedBusiness: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="collection-received" label="Collections received">
                    <input id="collection-received" required value={form.collectionRecived} onChange={(e) => setForm((x) => ({ ...x, collectionRecived: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="pipeline" label="30-day pipeline">
                    <input id="pipeline" required value={form.pipeline} onChange={(e) => setForm((x) => ({ ...x, pipeline: e.target.value }))} className={field} />
                  </FormField>
                </div>
              </div>
            </PageSection>
          ) : null}

          {formStep === 3 ? (
            <PageSection
              step={3}
              title="Customer visit & notes"
              description="Capture customer interaction summary and next-day notes."
            >
              <div id="daily-report-form-step-3" className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField id="customer-name" label="Customer name">
                    <input id="customer-name" required value={form.customerName} onChange={(e) => setForm((x) => ({ ...x, customerName: e.target.value }))} className={field} />
                  </FormField>
                  <FormField id="visit-purpose" label="Purpose">
                    <input id="visit-purpose" required value={form.purpouse} onChange={(e) => setForm((x) => ({ ...x, purpouse: e.target.value }))} className={field} />
                  </FormField>
                </div>
                <FormField id="visit-outcome" label="Outcome">
                  <textarea id="visit-outcome" required rows={2} value={form.outcome} onChange={(e) => setForm((x) => ({ ...x, outcome: e.target.value }))} className={fieldTextarea} />
                </FormField>
                <FormField id="report-notes" label="Next day plan / Notes">
                  <textarea id="report-notes" required rows={3} value={form.notes} onChange={(e) => setForm((x) => ({ ...x, notes: e.target.value }))} className={fieldTextarea} />
                </FormField>
              </div>
            </PageSection>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button type="button" className={btnGhost} onClick={goToPreviousStep} disabled={formStep === 1}>
              ← Previous
            </button>
            {formStep < FORM_STEPS.length ? (
              <button type="button" className={btnPrimary} onClick={goToNextStep}>
                Next →
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" className={btnGhost} onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create report'}
                </button>
              </div>
            )}
          </div>
        </form>
      ) : null}

      {!formOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">My reports</h2>
                <p className="mt-1 text-sm text-slate-500">Create and manage your daily reports.</p>
              </div>
              <button type="button" onClick={openCreateForm} className={`w-full sm:w-auto ${btnPrimary}`}>
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
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Manager review</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r._id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{r.type}</td>
                      <td className="px-4 py-3 text-slate-600">{r.notes || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {verificationSummary(r.managementReview)}
                      </td>
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
                            title="Edit report"
                            aria-label="Edit report"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={() => openEditForm(r)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Delete report"
                            aria-label="Delete report"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-white text-red-700 shadow-sm transition hover:bg-red-50 hover:text-red-800"
                            onClick={() => handleDelete(r._id)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      ) : null}
      {viewing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Report details</h3>
                  <p className="mt-1 text-sm text-slate-500">{formatSaleDate(viewing.date)} · {viewing.type}</p>
                </div>
                <button type="button" className={btnGhost} onClick={() => setViewing(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-4 px-4 py-4 text-sm sm:px-6 sm:py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Attendance & Vehicle</p>
                <p className="mt-1 text-slate-700">
                  Office {viewing.attendacne?.[0]?.officeIn || '—'} to {viewing.attendacne?.[0]?.officeOut || '—'} ·
                  ODO {viewing.attendacne?.[0]?.odoStart || '—'} to {viewing.attendacne?.[0]?.odoEnd || '—'} ·
                  Covered {viewing.attendacne?.[0]?.covered || '—'} ·
                  Vehicle {viewing.attendacne?.[0]?.vehicleNumber || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Sales Activity</p>
                <p className="mt-1 text-slate-700">
                  New {viewing.activity?.[0]?.newVisit || '—'} · Repeat {viewing.activity?.[0]?.repeatVisit || '—'} ·
                  Calls {viewing.activity?.[0]?.customerCalls || '—'} · Q Sent {viewing.activity?.[0]?.quotationSend || '—'} ·
                  Q Received {viewing.activity?.[0]?.quotationReceived || '—'} · Follow-Up {viewing.activity?.[0]?.paymentFollowUp || '—'} ·
                  New Customers {viewing.activity?.[0]?.newCustomer || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Business Generated</p>
                <p className="mt-1 text-slate-700">
                  Quotation {viewing.generatedBusiness?.[0]?.quotationValue || '—'} ·
                  Order {viewing.generatedBusiness?.[0]?.orderValue || '—'} ·
                  Expected {viewing.generatedBusiness?.[0]?.expectedBusiness || '—'} ·
                  Collections {viewing.generatedBusiness?.[0]?.collectionRecived || '—'} ·
                  Pipeline {viewing.generatedBusiness?.[0]?.pipeline || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">Customer Visit & Notes</p>
                <p className="mt-1 text-slate-700">
                  {viewing.customerVisit?.[0]?.customerName || '—'} · {viewing.customerVisit?.[0]?.purpouse || '—'} · {viewing.customerVisit?.[0]?.outcome || '—'}
                </p>
                <p className="mt-2 text-slate-700">{viewing.notes || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pdfPayload ? <DailyReportPdfHtml ref={pdfRef} {...pdfPayload} aria-hidden /> : null}
    </DashboardShell>
  )
}
