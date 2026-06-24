import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { getManagerTheme } from '../../lib/managerTheme.js'
import petrotekHeaderLogo from '../../assets/logo.png'
import petrotekPdfLogo from '../../assets/logopdf.png'
import seltecLogo from '../../assets/seltecLogo.png'
import { formatSaleDate } from '../../lib/format.js'
import { btnGhost, btnPrimary as baseBtnPrimary, field as baseField, fieldTextarea as baseFieldTextarea } from '../../lib/salesFormStyles.js'
import { exportDailyReportPdf } from '../../lib/dailyReportPdf.js'
import { resolveLogoForPdf } from '../../lib/pdfLogo.js'
import ReportDetailModal from '../../components/ReportDetailModal.jsx'
import DailyReportPdfHtml from '../../reports/DailyReportPdfHtml.jsx'

const KPI_ROWS = [
  { key: 'newCustomers', label: 'New customers' },
  { key: 'existingFollowUps', label: 'Existing follow-ups' },
  { key: 'customerVisits', label: 'Customer visits' },
  { key: 'callsMade', label: 'Calls made' },
  { key: 'quotationsSent', label: 'Quotations sent' },
  { key: 'ordersReceived', label: 'Orders received' },
  { key: 'collectionFollowUps', label: 'Collection follow-ups' },
]

const CHECK_KEYS = [
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function value(v) {
  if (v == null) return '—'
  const x = String(v).trim()
  return x === '' ? '—' : x
}

function blankKpi() {
  return {
    achievedToday: '',
    remarks: '',
    managerComments: '',
  }
}

function normalizeKpiRow(row) {
  const source = row && typeof row === 'object' ? row : {}
  return {
    achievedToday: String(source.achievedToday ?? '').trim(),
    remarks: String(source.remarks ?? '').trim(),
    managerComments: String(source.managerComments ?? '').trim(),
  }
}

function salesDailyTargetPayload(dta) {
  return KPI_ROWS.reduce((acc, { key }) => {
    const row = dta?.[key] || {}
    acc[key] = {
      achievedToday: row.achievedToday ?? '',
      remarks: row.remarks ?? '',
    }
    return acc
  }, {})
}

function blankCustomerActivity() {
  return {
    customerType: '',
    customerName: '',
    purpose: '',
    outcomeNextAction: '',
    quoteAed: '',
    orderAed: '',
  }
}

function normalizeCustomerActivities(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [blankCustomerActivity()]
  return rows.map((row) => ({ ...blankCustomerActivity(), ...(row || {}) }))
}

function blankSupportActivity() {
  return {
    taskCompleted: '',
    customerOrDepartment: '',
    resultOutcome: '',
    whomSupported: '',
    qtyOrValue: '',
  }
}

function normalizeSupportActivities(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [blankSupportActivity()]
  return rows.map((row) => ({ ...blankSupportActivity(), ...(row || {}) }))
}

function supportActivitiesFromReport(report) {
  if (Array.isArray(report?.supportActivities)) return report.supportActivities
  if (Array.isArray(report?.indoorSupportActivities)) return report.indoorSupportActivities
  return []
}

function normalizeTextRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return ['']
  return rows.map((row) => String(row ?? ''))
}

function isSeltecCompany(company) {
  return String(company || '').trim().toLowerCase().includes('seltec')
}

function createInitialForm(user) {
  const dailyTargetAchievement = {}
  for (const { key } of KPI_ROWS) {
    dailyTargetAchievement[key] = blankKpi()
  }
  return {
    date: todayIso(),
    type: 'outdoor',
    companyName: user?.company || '',
    salesExecutiveName: user?.name || '',
    dailyTargetAchievement,
    customerActivities: [blankCustomerActivity()],
    activityCountSummary: {
      totalActivitiesDoneToday: '',
      pendingNonProductive: '',
      activitiesNotInCrm: '',
      productiveActivities: '',
      activitiesUpdatedInCrm: '',
      crmUpdated: false,
    },
    businessGenerated: {
      totalQuotationValue: '',
      totalOrderValue: '',
      collectionsFollowedUp: '',
      pipelineValue: '',
    },
    supportActivities: [blankSupportActivity()],
    topAchievementsToday: [''],
    tomorrowsPlan: [''],
    managementCheck: {
      customerNamesRecorded: false,
      outcomesMentioned: false,
      quoteValuesRecorded: false,
      orderValuesRecorded: false,
      newCustomersClearlyMarked: false,
      businessGeneratedVisible: false,
      crmUpdated: false,
      verifiedByManager: false,
      managerRemarks: '',
      managerInitials: '',
      verifiedBy: null,
      verifiedAt: null,
    },
  }
}

function reportToForm(report, user) {
  const base = createInitialForm(user)
  return {
    ...base,
    date: report?.date ? new Date(report.date).toISOString().slice(0, 10) : base.date,
    type: report?.type || base.type,
    companyName: base.companyName,
    salesExecutiveName: base.salesExecutiveName,
    dailyTargetAchievement: KPI_ROWS.reduce((acc, { key }) => {
      acc[key] = normalizeKpiRow(report?.dailyTargetAchievement?.[key])
      return acc
    }, {}),
    customerActivities: normalizeCustomerActivities(report?.customerActivities),
    activityCountSummary: {
      ...base.activityCountSummary,
      ...(report?.activityCountSummary || {}),
    },
    businessGenerated: {
      ...base.businessGenerated,
      ...(report?.businessGenerated || {}),
    },
    supportActivities: normalizeSupportActivities(supportActivitiesFromReport(report)),
    topAchievementsToday: normalizeTextRows(report?.topAchievementsToday),
    tomorrowsPlan: normalizeTextRows(report?.tomorrowsPlan),
    managementCheck: {
      ...base.managementCheck,
      ...(report?.managementCheck || {}),
    },
  }
}

function getReview(report) {
  return report?.managementCheck || report?.managementReview || {}
}

function verificationSummary(report) {
  const review = getReview(report)
  const done = CHECK_KEYS.filter((k) => Boolean(review?.[k])).length
  return `${done}/8 verified`
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
  { step: 1, title: 'Basics & daily targets' },
  { step: 2, title: 'Customer activity & business' },
  { step: 3, title: 'Support activities' },
  { step: 4, title: 'Achievements & plan' },
]

function FormStepIndicator({ currentStep, accentBgClass }) {
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
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${active || done ? accentBgClass : 'bg-slate-300'}`}
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

function PageSection({ step, title, description, children, accentBgClass }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${accentBgClass}`}>
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  )
}

export default function SalesReports({ user, onLogout, variant = 'sales' }) {
  const isManagerVariant = variant === 'manager'
  const apiBase = isManagerVariant ? '/api/reports/manager/mine' : '/api/reports'
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

  const isSeltecTheme = isSeltecCompany(user?.company)
  const managerTheme = isManagerVariant ? getManagerTheme(user) : null
  const shellPrimaryLogoSrc = isManagerVariant
    ? managerShellLogoProps(user).primaryLogoSrc ?? petrotekHeaderLogo
    : isSeltecTheme
      ? seltecLogo
      : petrotekHeaderLogo
  const shellPrimaryLogoAlt = isManagerVariant
    ? managerShellLogoProps(user).primaryLogoAlt
    : isSeltecTheme
      ? 'Seltec'
      : 'Petrotek'
  const accentBgClass = isManagerVariant
    ? managerTheme.accentBg
    : isSeltecTheme
      ? 'bg-blue-600'
      : 'bg-red-600'
  const accentBorderClass = isManagerVariant
    ? managerTheme.cardBorder
    : isSeltecTheme
      ? 'border-blue-300'
      : 'border-red-300'
  const typeRadioAccentClass = isManagerVariant
    ? managerTheme.isSeltec
      ? 'text-[#1d4ed8] focus:ring-[#1d4ed8]'
      : 'text-[#E7000B] focus:ring-[#E7000B]'
    : isSeltecTheme
      ? 'text-[#1d4ed8] focus:ring-[#1d4ed8]'
      : 'text-[#E7000B] focus:ring-[#E7000B]'
  const formTableHeadClass = isManagerVariant
    ? managerTheme.tableHeadSimple
    : isSeltecTheme
      ? 'bg-[#1d4ed8] text-xs uppercase tracking-wide text-white'
      : 'bg-[#E7000B] text-xs uppercase tracking-wide text-white'
  const field = isManagerVariant
    ? managerTheme.field
    : isSeltecTheme
      ? baseField.replace(/focus:border-red-600/g, 'focus:border-blue-600').replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
      : baseField
  const fieldTextarea = isManagerVariant
    ? managerTheme.fieldTextarea
    : isSeltecTheme
      ? baseFieldTextarea.replace(/focus:border-red-600/g, 'focus:border-blue-600').replace(/focus:ring-red-500\/20/g, 'focus:ring-blue-500/20')
      : baseFieldTextarea
  const btnPrimary = isManagerVariant
    ? managerTheme.btnPrimary
    : isSeltecTheme
      ? baseBtnPrimary.replace(/bg-red-600/g, 'bg-blue-600').replace(/hover:bg-red-700/g, 'hover:bg-blue-700')
      : baseBtnPrimary

  const loadReports = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get(`${apiBase}?limit=200`)
      setReports(Array.isArray(data?.reports) ? data.reports : [])
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load reports.')
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  function updateKpi(kpiKey, fieldKey, valueText) {
    setForm((current) => ({
      ...current,
      dailyTargetAchievement: {
        ...current.dailyTargetAchievement,
        [kpiKey]: {
          ...(current.dailyTargetAchievement?.[kpiKey] || blankKpi()),
          [fieldKey]: valueText,
        },
      },
    }))
  }

  function updateCustomerActivity(index, key, valueText) {
    setForm((current) => ({
      ...current,
      customerActivities: current.customerActivities.map((row, i) => (i === index ? { ...row, [key]: valueText } : row)),
    }))
  }

  function addCustomerActivityRow() {
    setForm((current) => ({
      ...current,
      customerActivities: [...current.customerActivities, blankCustomerActivity()],
    }))
  }

  function updateSupportActivity(index, key, valueText) {
    setForm((current) => ({
      ...current,
      supportActivities: current.supportActivities.map((row, i) =>
        i === index ? { ...row, [key]: valueText } : row,
      ),
    }))
  }

  function addSupportActivityRow() {
    setForm((current) => ({
      ...current,
      supportActivities: [...current.supportActivities, blankSupportActivity()],
    }))
  }

  function addTopAchievementRow() {
    setForm((current) => ({
      ...current,
      topAchievementsToday: [...current.topAchievementsToday, ''],
    }))
  }

  function addTomorrowPlanRow() {
    setForm((current) => ({
      ...current,
      tomorrowsPlan: [...current.tomorrowsPlan, ''],
    }))
  }

  async function handleOpenPdfPreview() {
    setPreviewLoading(true)
    setError('')
    try {
      const companyName = user?.company || form.companyName || ''
      const logoAsset = isSeltecCompany(companyName) ? seltecLogo : petrotekPdfLogo
      const logoSrc = await resolveLogoForPdf(logoAsset)
      const reportDraft = {
        date: form.date,
        type: form.type,
        companyName,
        salesExecutiveName: user?.name || form.salesExecutiveName || '',
        dailyTargetAchievement: salesDailyTargetPayload(form.dailyTargetAchievement),
        customerActivities: form.customerActivities,
        activityCountSummary: form.activityCountSummary,
        businessGenerated: form.businessGenerated,
        supportActivities: form.supportActivities,
        topAchievementsToday: form.topAchievementsToday.filter((x) => String(x || '').trim() !== ''),
        tomorrowsPlan: form.tomorrowsPlan.filter((x) => String(x || '').trim() !== ''),
        managementCheck: form.managementCheck,
      }
      setPreviewPayload({
        report: reportDraft,
        logoSrc,
        companyName,
        generatedAt: new Date().toLocaleString(),
        salesExecutiveName: user?.name || form.salesExecutiveName || (isManagerVariant ? 'Manager' : 'Sales executive'),
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
      const payload = {
        date: form.date,
        type: form.type,
        companyName: user?.company || form.companyName,
        salesExecutiveName: user?.name || form.salesExecutiveName,
        dailyTargetAchievement: salesDailyTargetPayload(form.dailyTargetAchievement),
        customerActivities: form.customerActivities,
        activityCountSummary: form.activityCountSummary,
        businessGenerated: form.businessGenerated,
        supportActivities: form.supportActivities,
        topAchievementsToday: form.topAchievementsToday.filter((x) => String(x || '').trim() !== ''),
        tomorrowsPlan: form.tomorrowsPlan.filter((x) => String(x || '').trim() !== ''),
        managementCheck: form.managementCheck,
      }

      if (editingId) {
        await api.put(`${apiBase}/${editingId}`, payload)
      } else {
        await api.post(apiBase, payload)
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
      await api.delete(`${apiBase}/${reportId}`)
      await loadReports()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not delete report.')
    }
  }

  return (
    <DashboardShell
      badge={isManagerVariant ? 'Manager workspace' : 'Sales workspace'}
      title={isManagerVariant ? 'My daily reports' : 'Daily reports'}
      subtitle={
        isManagerVariant
          ? 'Submit your personal daily report — visible only to you and admin'
          : 'Create and track your report submissions'
      }
      primaryLogoSrc={shellPrimaryLogoSrc}
      primaryLogoAlt={shellPrimaryLogoAlt}
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={isManagerVariant ? <ManagerHeader user={user} /> : <SalesWorkspaceHeader />}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <form onSubmit={handleCreate} className="mb-6 space-y-5 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit daily report' : 'New daily report'}
              </h2>
            </div>
            <button type="button" className={`shrink-0 ${btnGhost}`} onClick={closeForm}>
              Back to list
            </button>
          </div>

          <FormStepIndicator currentStep={formStep} accentBgClass={accentBgClass} />

          {formStep === 1 ? (
            <PageSection
              step={1}
              title="Basics & daily target vs achievement"
              description="Capture header details and today’s KPI results with remarks."
              accentBgClass={accentBgClass}
            >
              <div id="daily-report-form-step-1" className="space-y-4">
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
                    <div id="report-type" className="flex min-h-[44px] items-center gap-5 sm:min-h-0">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="report-type"
                          value="outdoor"
                          checked={form.type === 'outdoor'}
                          onChange={(e) => setForm((x) => ({ ...x, type: e.target.value }))}
                          className={typeRadioAccentClass}
                        />
                        Outdoor
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="report-type"
                          value="indoor"
                          checked={form.type === 'indoor'}
                          onChange={(e) => setForm((x) => ({ ...x, type: e.target.value }))}
                          className={typeRadioAccentClass}
                        />
                        Indoor
                      </label>
                    </div>
                  </FormField>
                  <FormField id="company-name" label="Company name">
                    <input
                      id="company-name"
                      value={form.companyName}
                      readOnly
                      className={`${field} bg-slate-100`}
                    />
                  </FormField>
                  <FormField id="sales-exec-name" label={isManagerVariant ? 'Your name' : 'Sales executive name'}>
                    <input
                      id="sales-exec-name"
                      value={form.salesExecutiveName}
                      readOnly
                      className={`${field} bg-slate-100`}
                    />
                  </FormField>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className={formTableHeadClass}>
                      <tr>
                        <th className="px-3 py-2">KPI</th>
                        <th className="px-3 py-2">Achieved today</th>
                        <th className="px-3 py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {KPI_ROWS.map(({ key, label }) => (
                        <tr key={key}>
                          <td className="px-3 py-2 align-top text-slate-800">{label}</td>
                          <td className="px-3 py-2 align-top">
                            <input
                              value={form.dailyTargetAchievement?.[key]?.achievedToday || ''}
                              onChange={(e) => updateKpi(key, 'achievedToday', e.target.value)}
                              className={field}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <textarea
                              rows={2}
                              value={form.dailyTargetAchievement?.[key]?.remarks || ''}
                              onChange={(e) => updateKpi(key, 'remarks', e.target.value)}
                              className={fieldTextarea}
                              placeholder="Notes for this KPI"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </PageSection>
          ) : null}

          {formStep === 2 ? (
            <PageSection
              step={2}
              title="Customer activities, summary, and business"
              description="Add customer-level activities with totals and generated business."
              accentBgClass={accentBgClass}
            >
              <div id="daily-report-form-step-2" className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className={formTableHeadClass}>
                      <tr>
                        <th className="px-3 py-2">Type (N/E)</th>
                        <th className="px-3 py-2">Customer name</th>
                        <th className="px-3 py-2">Purpose</th>
                        <th className="px-3 py-2">Outcome / next action</th>
                        <th className="px-3 py-2">Quote AED</th>
                        <th className="px-3 py-2">Order AED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.customerActivities.map((row, i) => (
                        <tr key={`customer-${i}`}>
                          <td className="px-3 py-2">
                            <select
                              value={row.customerType || ''}
                              onChange={(e) => updateCustomerActivity(i, 'customerType', e.target.value)}
                              className={field}
                            >
                              <option value="">-</option>
                              <option value="N">N</option>
                              <option value="E">E</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.customerName || ''}
                              onChange={(e) => updateCustomerActivity(i, 'customerName', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.purpose || ''}
                              onChange={(e) => updateCustomerActivity(i, 'purpose', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.outcomeNextAction || ''}
                              onChange={(e) => updateCustomerActivity(i, 'outcomeNextAction', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.quoteAed || ''}
                              onChange={(e) => updateCustomerActivity(i, 'quoteAed', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.orderAed || ''}
                              onChange={(e) => updateCustomerActivity(i, 'orderAed', e.target.value)}
                              className={field}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-600">N - New Customer, E - Existing Customer</p>
                  <button type="button" className={btnGhost} onClick={addCustomerActivityRow}>
                    + Add Customer
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={`rounded-xl border p-3 ${accentBorderClass}`}>
                    <p className="mb-2 text-sm font-medium text-slate-900">Activity count summary</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="summary-total" label="Total activities done today">
                        <input
                          id="summary-total"
                          value={form.activityCountSummary.totalActivitiesDoneToday}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                totalActivitiesDoneToday: e.target.value,
                              },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="summary-pending" label="Pending / non-productive">
                        <input
                          id="summary-pending"
                          value={form.activityCountSummary.pendingNonProductive}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                pendingNonProductive: e.target.value,
                              },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="summary-not-crm" label="Activities not in CRM">
                        <input
                          id="summary-not-crm"
                          value={form.activityCountSummary.activitiesNotInCrm}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                activitiesNotInCrm: e.target.value,
                              },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="summary-productive" label="Productive activities">
                        <input
                          id="summary-productive"
                          value={form.activityCountSummary.productiveActivities}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                productiveActivities: e.target.value,
                              },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="summary-updated-crm" label="Activities updated in CRM">
                        <input
                          id="summary-updated-crm"
                          value={form.activityCountSummary.activitiesUpdatedInCrm}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                activitiesUpdatedInCrm: e.target.value,
                              },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(form.activityCountSummary.crmUpdated)}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              activityCountSummary: {
                                ...x.activityCountSummary,
                                crmUpdated: e.target.checked,
                              },
                            }))
                          }
                        />
                        CRM updated
                      </label>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3 ${accentBorderClass}`}>
                    <p className="mb-2 text-sm font-medium text-slate-900">Business generated</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField id="bg-quote" label="Total quotation value">
                        <input
                          id="bg-quote"
                          value={form.businessGenerated.totalQuotationValue}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              businessGenerated: { ...x.businessGenerated, totalQuotationValue: e.target.value },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="bg-order" label="Total order value">
                        <input
                          id="bg-order"
                          value={form.businessGenerated.totalOrderValue}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              businessGenerated: { ...x.businessGenerated, totalOrderValue: e.target.value },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="bg-collection" label="Collections followed up">
                        <input
                          id="bg-collection"
                          value={form.businessGenerated.collectionsFollowedUp}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              businessGenerated: { ...x.businessGenerated, collectionsFollowedUp: e.target.value },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                      <FormField id="bg-pipeline" label="Pipeline value">
                        <input
                          id="bg-pipeline"
                          value={form.businessGenerated.pipelineValue}
                          onChange={(e) =>
                            setForm((x) => ({
                              ...x,
                              businessGenerated: { ...x.businessGenerated, pipelineValue: e.target.value },
                            }))
                          }
                          className={field}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              </div>
            </PageSection>
          ) : null}

          {formStep === 3 ? (
            <PageSection
              step={3}
              title="Support activities (meetings/technical support)"
              description="Record meetings and technical support tasks completed today."
              accentBgClass={accentBgClass}
            >
              <div id="daily-report-form-step-3" className="space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className={formTableHeadClass}>
                      <tr>
                        <th className="px-3 py-2">Task completed</th>
                        <th className="px-3 py-2">Customer / department</th>
                        <th className="px-3 py-2">Result / outcome</th>
                        <th className="px-3 py-2">Whom supported</th>
                        <th className="px-3 py-2">Qty / value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.supportActivities.map((row, i) => (
                        <tr key={`support-${i}`}>
                          <td className="px-3 py-2">
                            <input
                              value={row.taskCompleted || ''}
                              onChange={(e) => updateSupportActivity(i, 'taskCompleted', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.customerOrDepartment || ''}
                              onChange={(e) => updateSupportActivity(i, 'customerOrDepartment', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.resultOutcome || ''}
                              onChange={(e) => updateSupportActivity(i, 'resultOutcome', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.whomSupported || ''}
                              onChange={(e) => updateSupportActivity(i, 'whomSupported', e.target.value)}
                              className={field}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.qtyOrValue || ''}
                              onChange={(e) => updateSupportActivity(i, 'qtyOrValue', e.target.value)}
                              className={field}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end">
                  <button type="button" className={btnGhost} onClick={addSupportActivityRow}>
                    + Add task
                  </button>
                </div>
              </div>
            </PageSection>
          ) : null}

          {formStep === 4 ? (
            <PageSection
              step={4}
              title="Top achievements and tomorrow plan"
              description="Finish report highlights and next-day plan."
              accentBgClass={accentBgClass}
            >
              <div id="daily-report-form-step-4" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">Top achievements today</p>
                    {form.topAchievementsToday.map((item, i) => (
                      <input
                        key={`ach-${i}`}
                        value={item}
                        onChange={(e) =>
                          setForm((x) => ({
                            ...x,
                            topAchievementsToday: x.topAchievementsToday.map((v, idx) => (idx === i ? e.target.value : v)),
                          }))
                        }
                        className={field}
                        placeholder={`Achievement ${i + 1}`}
                      />
                    ))}
                    <div className="pt-1">
                      <button type="button" className={btnGhost} onClick={addTopAchievementRow}>
                        + Add achievement
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">Tomorrow's plan</p>
                    {form.tomorrowsPlan.map((item, i) => (
                      <input
                        key={`plan-${i}`}
                        value={item}
                        onChange={(e) =>
                          setForm((x) => ({
                            ...x,
                            tomorrowsPlan: x.tomorrowsPlan.map((v, idx) => (idx === i ? e.target.value : v)),
                          }))
                        }
                        className={field}
                        placeholder={`Plan ${i + 1}`}
                      />
                    ))}
                    <div className="pt-1">
                      <button type="button" className={btnGhost} onClick={addTomorrowPlanRow}>
                        + Add plan
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" className={btnGhost} onClick={handleOpenPdfPreview} disabled={previewLoading}>
                    {previewLoading ? 'Preparing preview...' : 'Preview PDF'}
                  </button>
                </div>
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
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className={formTableHeadClass}>
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Activities done</th>
                    {!isManagerVariant ? <th className="px-4 py-3">Manager review</th> : null}
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((r) => (
                    <tr key={r._id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatSaleDate(r.date)}</td>
                      <td className="px-4 py-3 capitalize text-slate-700">{r.type}</td>
                      <td className="px-4 py-3 text-slate-700">{value(r.companyName)}</td>
                      <td className="px-4 py-3 text-slate-700">{value(r.activityCountSummary?.totalActivitiesDoneToday)}</td>
                      {!isManagerVariant ? (
                        <td className="px-4 py-3 text-slate-700">{verificationSummary(r)}</td>
                      ) : null}
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
        <ReportDetailModal
          report={viewing}
          onClose={() => setViewing(null)}
          onDownload={() => handleDownloadPdf(viewing)}
          downloading={downloadingPdfId === String(viewing?._id)}
          formatDate={formatSaleDate}
        />
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
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={handleDownloadPreviewPdf}
                    disabled={previewDownloading}
                  >
                    {previewDownloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button type="button" className={btnGhost} onClick={() => setPreviewOpen(false)}>
                    Close
                  </button>
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
