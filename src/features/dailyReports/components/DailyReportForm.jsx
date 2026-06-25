import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../../api'
import petrotekPdfLogo from '../../../assets/logopdf.png'
import seltecLogo from '../../../assets/seltecLogo.png'
import { btnGhost as baseBtnGhost } from '../../../lib/salesFormStyles.js'
import {
  FORM_STEPS,
  KPI_ROWS,
  blankCustomerActivity,
  blankKpi,
  blankSupportActivity,
  buildReportPayload,
  createInitialForm,
  getDailyReportFormTheme,
  isSeltecCompany,
  reportApiBase,
  reportToForm,
  validateFormStep,
} from '../utils/dailyReportForm.js'
import { exportDailyReportPdf } from '../../../lib/dailyReportPdf.js'
import { resolveLogoForPdf } from '../../../lib/pdfLogo.js'
import DailyReportPdfHtml from '../../../reports/DailyReportPdfHtml.jsx'

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

function DailyReportFormFields({
  form,
  setForm,
  formStep,
  setFormStep,
  onPreviousStep,
  onNextStep,
  editingId,
  saving,
  submitterNameLabel = 'Sales executive name',
  executiveNameLabel,
  theme,
  styles,
  onCancel,
  onClose,
  onPreviewPdf,
  onPreview,
  previewLoading = false,
  onSubmit,
}) {
  const resolvedTheme = theme ?? styles ?? {}
  const {
    accentBgClass,
    accentBorderClass,
    typeRadioAccentClass,
    formTableHeadClass,
    field,
    fieldTextarea,
    btnPrimary,
  } = resolvedTheme

  const ghostBtn = resolvedTheme.btnGhost ?? baseBtnGhost
  const nameLabel = executiveNameLabel ?? submitterNameLabel

  const handleCancel = onCancel ?? onClose
  const handlePreview = onPreviewPdf ?? onPreview

  function goToPreviousStep() {
    if (onPreviousStep) {
      onPreviousStep()
      return
    }
    if (setFormStep) {
      setFormStep((s) => Math.max(1, s - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goToNextStep() {
    if (onNextStep) {
      if (!validateFormStep(formStep)) return
      onNextStep()
      return
    }
    if (setFormStep) {
      if (!validateFormStep(formStep)) return
      setFormStep((s) => Math.min(FORM_STEPS.length, s + 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

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

  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-5 sm:mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? 'Edit daily report' : 'New daily report'}
          </h2>
        </div>
        <button type="button" className={`shrink-0 ${ghostBtn}`} onClick={handleCancel}>
          Back to list
        </button>
      </div>

      <FormStepIndicator currentStep={formStep} accentBgClass={accentBgClass} />

      {formStep === 1 ? (
        <PageSection
          step={1}
          title="Basics & daily target vs achievement"
          description="Capture header details and today's KPI results with remarks."
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
                <input id="company-name" value={form.companyName} readOnly className={`${field} bg-slate-100`} />
              </FormField>
              <FormField id="sales-exec-name" label={nameLabel}>
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
              <button type="button" className={ghostBtn} onClick={addCustomerActivityRow}>
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
              <button type="button" className={ghostBtn} onClick={addSupportActivityRow}>
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
                  <button type="button" className={ghostBtn} onClick={addTopAchievementRow}>
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
                  <button type="button" className={ghostBtn} onClick={addTomorrowPlanRow}>
                    + Add plan
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className={ghostBtn} onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? 'Preparing preview...' : 'Preview PDF'}
              </button>
            </div>
          </div>
        </PageSection>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button type="button" className={ghostBtn} onClick={goToPreviousStep} disabled={formStep === 1}>
          ← Previous
        </button>
        {formStep < FORM_STEPS.length ? (
          <button type="button" className={btnPrimary} onClick={goToNextStep}>
            Next →
          </button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={ghostBtn} onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create report'}
            </button>
          </div>
        )}
      </div>
    </form>
  )
}

function DailyReportFormContainer({
  user,
  role = 'sales',
  editingReport = null,
  onSaved,
  onCancel,
  onError,
}) {
  const editingId = editingReport?._id || null
  const theme = useMemo(() => getDailyReportFormTheme(user, role), [user, role])
  const initialForm = useMemo(
    () => (editingReport ? reportToForm(editingReport, user) : createInitialForm(user)),
    [editingReport, user],
  )

  const [form, setForm] = useState(initialForm)
  const [formStep, setFormStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewDownloading, setPreviewDownloading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewPayload, setPreviewPayload] = useState(null)
  const [pdfPayload, setPdfPayload] = useState(null)
  const pdfRef = useRef(null)

  useEffect(() => {
    setForm(initialForm)
    setFormStep(1)
  }, [initialForm])

  function notifyError(message) {
    if (onError) onError(message)
  }

  async function handleOpenPdfPreview() {
    setPreviewLoading(true)
    try {
      const companyName = user?.company || form.companyName || ''
      const logoAsset = isSeltecCompany(companyName) ? seltecLogo : petrotekPdfLogo
      const logoSrc = await resolveLogoForPdf(logoAsset)
      setPreviewPayload({
        report: buildReportPayload(form, user),
        logoSrc,
        companyName,
        generatedAt: new Date().toLocaleString(),
        salesExecutiveName: user?.name || form.salesExecutiveName || (role === 'manager' ? 'Manager' : 'Sales executive'),
        salesExecutivePhone: user?.phone || user?.phoneNumber || '',
        viewerLabel: 'Preview',
      })
      setPreviewOpen(true)
    } catch {
      notifyError('Could not prepare PDF preview.')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleDownloadPreviewPdf() {
    if (!previewPayload?.report) return
    setPreviewDownloading(true)
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
      notifyError('Could not generate preview PDF. Please try again.')
    } finally {
      setPreviewDownloading(false)
      setPdfPayload(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = buildReportPayload(form, user)
      const apiBase = reportApiBase(role)
      if (editingId) {
        await api.put(`${apiBase}/${editingId}`, payload)
      } else {
        await api.post(apiBase, payload)
      }
      onSaved?.()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      notifyError(typeof msg === 'string' ? msg : `Could not ${editingId ? 'update' : 'save'} report.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DailyReportFormFields
        form={form}
        setForm={setForm}
        formStep={formStep}
        setFormStep={setFormStep}
        editingId={editingId}
        saving={saving}
        submitterNameLabel={theme.submitterNameLabel ?? (role === 'manager' ? 'Your name' : 'Sales executive name')}
        theme={theme}
        onCancel={onCancel}
        onPreviewPdf={handleOpenPdfPreview}
        previewLoading={previewLoading}
        onSubmit={handleSubmit}
      />
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
                    className={theme.btnPrimary}
                    onClick={handleDownloadPreviewPdf}
                    disabled={previewDownloading}
                  >
                    {previewDownloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                  <button type="button" className={theme.btnGhost ?? baseBtnGhost} onClick={() => setPreviewOpen(false)}>
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
    </>
  )
}

export default function DailyReportForm(props) {
  if (props.user) return <DailyReportFormContainer {...props} />
  return <DailyReportFormFields {...props} />
}
