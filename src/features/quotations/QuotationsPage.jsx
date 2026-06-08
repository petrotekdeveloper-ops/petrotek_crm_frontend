import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import QuotationPdfPreviewModal from '../../components/QuotationPdfPreviewModal.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { monthLabel } from '../../lib/format.js'
import {
  emptyCustomer,
  emptyItem,
  emptyQuotationForm,
  formToPayload,
  formToQuotationPreview,
  formatQuotationDate,
  primaryCustomerName,
  quotationToForm,
  recalcQuotationItems,
  todayIso,
} from '../../lib/quotationForm.js'
import {
  amountToWords,
  formatQuotationMoney,
  quotationGrandTotal,
  quotationTotals,
  resolveQuotationAmountInWords,
} from '../../lib/quotationPdf.js'
import { btnGhost, btnPrimary, field, fieldTextarea } from '../../lib/salesFormStyles.js'

const TABLE_HEAD_PETROTEK = 'bg-red-600 text-white'
const TABLE_HEAD_SELTEC = 'bg-blue-600 text-white'

function QuotationRowActions({ row, isSeltecUser, onView, onPdf, onEdit, onDelete }) {
  const iconBtn = 'inline-flex p-1 text-slate-600 transition hover:text-slate-900'
  const deleteBtn = isSeltecUser
    ? 'inline-flex p-1 text-blue-600 transition hover:text-blue-800'
    : 'inline-flex p-1 text-red-600 transition hover:text-red-800'

  return (
    <div className="inline-flex items-center justify-end gap-0.5">
      <button
        type="button"
        title="View"
        aria-label="View quotation"
        className={iconBtn}
        onClick={() => onView(row)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
          />
        </svg>
      </button>
      <button
        type="button"
        title="PDF"
        aria-label="View quotation PDF"
        className={iconBtn}
        onClick={() => onPdf(row)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6M9 17h4M9 9h1" />
        </svg>
      </button>
      <button
        type="button"
        title="Edit"
        aria-label="Edit quotation"
        className={iconBtn}
        onClick={() => onEdit(row)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
          />
        </svg>
      </button>
      <button
        type="button"
        title="Delete"
        aria-label="Delete quotation"
        className={deleteBtn}
        onClick={() => onDelete(row._id)}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  )
}

function MonthPicker({ year, month, goPrev, goNext }) {
  return (
    <div
      className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto"
      role="group"
      aria-label="Reporting month"
    >
      <button
        type="button"
        onClick={goPrev}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800 sm:min-w-[8rem] sm:flex-none">
        {monthLabel(year, month)}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )
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
  { step: 1, title: 'Item details' },
  { step: 2, title: 'Customer details' },
  { step: 3, title: 'Quotation overview' },
]

function FormStepIndicator({ currentStep, accentClass = 'bg-red-600' }) {
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
                active || done ? accentClass : 'bg-slate-300'
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
function PageSection({ step, title, description, accentClass = 'bg-red-600', children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${accentClass}`}
          >
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

function QuotationDetailView({ quotation }) {
  if (!quotation) return null
  return (
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
          <p className="mt-1 font-medium text-slate-900">{formatQuotationDate(quotation.date)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quote no.</p>
          <p className="mt-1 font-medium text-slate-900">{quotation.quoteNo || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ref</p>
          <p className="mt-1 text-slate-900">{quotation.ref || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">TRN</p>
          <p className="mt-1 text-slate-900">{quotation.trn || '—'}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers</p>
        <div className="mt-2 space-y-3">
          {(quotation.customerDetails || []).map((row, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="font-medium text-slate-900">{row.name || '—'}</p>
              <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                <div>TRN: {row.trn || '—'}</div>
                <div>Phone: {row.phone || '—'}</div>
                <div>Mobile: {row.mobile || '—'}</div>
                <div>Email: {row.email || '—'}</div>
                <div className="sm:col-span-2">Address: {row.address || '—'}</div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line items</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Code</th>
                <th className="px-3 py-2 font-semibold">Item</th>
                <th className="px-3 py-2 font-semibold">Qty</th>
                <th className="px-3 py-2 font-semibold">Unit</th>
                <th className="px-3 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {(quotation.quotationItems || []).map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">{row.itemCode || '—'}</td>
                  <td className="px-3 py-2">{row.item || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{row.itemQuantity || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{row.itemUnitPrice || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{row.itemTotalPrice || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtotal</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{quotation.subTotal || '—'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{quotation.total || '—'}</p>
        </div>
        <div className="sm:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In words</p>
          <p className="mt-1 text-slate-900">{resolveQuotationAmountInWords(quotation) || '—'}</p>
        </div>
      </div>
    </div>
  )
}

export default function QuotationsPage({
  user,
  onLogout,
  apiBasePath,
  header,
  shellProps = {},
  primaryBtnClass = btnPrimary,
  tableHeadClass,
  isSeltecUser = false,
  /** When true, month picker and New quotation live in the table section header (manager layout). */
  controlsInSectionHeader = false,
  renderMonthControl = null,
  sectionAccentClass = 'bg-red-600',
}) {
  const resolvedTableHeadClass =
    tableHeadClass ?? (isSeltecUser ? TABLE_HEAD_SELTEC : TABLE_HEAD_PETROTEK)
  const { year, month, goPrev, goNext } = useMonthState()
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => emptyQuotationForm())
  const [formStep, setFormStep] = useState(1)
  const [pdfPreviewQuotation, setPdfPreviewQuotation] = useState(null)

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const monthControlProps = { year, month, goPrev, goNext }
  const monthPicker = renderMonthControl ? (
    renderMonthControl(monthControlProps)
  ) : (
    <MonthPicker {...monthControlProps} />
  )

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get(`${apiBasePath}?${ymQuery}`)
      setQuotations(Array.isArray(data?.quotations) ? data.quotations : [])
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load quotations.')
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }, [apiBasePath, ymQuery])

  useEffect(() => {
    load()
  }, [load])

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyQuotationForm(todayIso()))
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEditForm(row) {
    setEditingId(row._id)
    setForm(quotationToForm(row))
    setFormStep(1)
    setFormOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setFormStep(1)
    setForm(emptyQuotationForm())
  }

  function validateFormStep(step) {
    const root = document.getElementById(`quotation-form-step-${step}`)
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

  function previewFormPdf() {
    setPdfPreviewQuotation(formToQuotationPreview(form))
  }

  const overviewTotals = useMemo(
    () => quotationTotals({ subTotal: form.subTotal, total: form.total }),
    [form.subTotal, form.total]
  )

  const newQuotationButton = (
    <button type="button" onClick={openCreateForm} className={`w-full sm:w-auto ${primaryBtnClass}`}>
      New quotation
    </button>
  )

  function updateCustomer(index, key, value) {
    setForm((prev) => {
      const customerDetails = prev.customerDetails.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      )
      return { ...prev, customerDetails }
    })
  }

  function addCustomer() {
    setForm((prev) => ({
      ...prev,
      customerDetails: [...prev.customerDetails, emptyCustomer()],
    }))
  }

  function removeCustomer(index) {
    setForm((prev) => {
      if (prev.customerDetails.length <= 1) return prev
      return {
        ...prev,
        customerDetails: prev.customerDetails.filter((_, i) => i !== index),
      }
    })
  }

  function updateItem(index, key, value) {
    setForm((prev) => {
      const quotationItems = prev.quotationItems.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      )
      const totals = recalcQuotationItems(quotationItems)
      return { ...prev, ...totals }
    })
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      quotationItems: [...prev.quotationItems, emptyItem()],
    }))
  }

  function removeItem(index) {
    setForm((prev) => {
      if (prev.quotationItems.length <= 1) return prev
      const quotationItems = prev.quotationItems.filter((_, i) => i !== index)
      const totals = recalcQuotationItems(quotationItems)
      return { ...prev, ...totals }
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateFormStep(formStep)) return
    setSaving(true)
    setError('')
    const payload = formToPayload(form)
    try {
      if (editingId) {
        await api.put(`${apiBasePath}/${editingId}`, payload)
        closeForm()
        await load()
      } else {
        const { data } = await api.post(apiBasePath, payload)
        closeForm()
        await load()
        if (data?.quotation) {
          setPdfPreviewQuotation(data.quotation)
        }
      }
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save quotation.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this quotation?')) return
    setError('')
    try {
      await api.delete(`${apiBasePath}/${id}`)
      await load()
    } catch {
      setError('Could not delete quotation.')
    }
  }

  return (
    <DashboardShell
      badge={shellProps.badge ?? 'CRM'}
      title={shellProps.title ?? 'Quotations'}
      subtitle={shellProps.subtitle ?? `Create and manage quotes · ${monthLabel(year, month)}`}
      user={user}
      onLogout={onLogout}
      primaryLogoSrc={shellProps.primaryLogoSrc}
      primaryLogoAlt={shellProps.primaryLogoAlt}
      actionsPlacement="belowHeading"
      actions={
        controlsInSectionHeader ? (
          header ? header() : null
        ) : (
          <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {header ? header({ monthPicker }) : monthPicker}
            {!formOpen ? newQuotationButton : null}
          </div>
        )
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      {formOpen ? (
        <form onSubmit={handleSubmit} className="mb-6 space-y-5 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit quotation' : 'New quotation'}
              </h2>
            </div>
            <button type="button" className={`shrink-0 ${btnGhost}`} onClick={closeForm}>
              Back to list
            </button>
          </div>

          <FormStepIndicator currentStep={formStep} accentClass={sectionAccentClass} />

          {formStep === 1 ? (
          <PageSection
            step={1}
            title="Item details"
            description="Add products or services with quantity and unit price."
            accentClass={sectionAccentClass}
          >
            <div id="quotation-form-step-1">
            <div className="mb-3 flex justify-end">
              <button type="button" className={btnGhost} onClick={addItem}>
                Add item
              </button>
            </div>
            <div className="space-y-4">
              {form.quotationItems.map((row, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Item {index + 1}
                    </p>
                    {form.quotationItems.length > 1 ? (
                      <button type="button" className={btnGhost} onClick={() => removeItem(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <FormField id={`item-code-${index}`} label="Item code">
                      <input
                        id={`item-code-${index}`}
                        className={field}
                        value={row.itemCode}
                        onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField
                      id={`item-name-${index}`}
                      label="Item description"
                      className="sm:col-span-2 lg:col-span-2"
                    >
                      <textarea
                        id={`item-name-${index}`}
                        rows={2}
                        className={fieldTextarea}
                        value={row.item}
                        onChange={(e) => updateItem(index, 'item', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField id={`item-qty-${index}`} label="Quantity">
                      <input
                        id={`item-qty-${index}`}
                        className={field}
                        value={row.itemQuantity}
                        onChange={(e) => updateItem(index, 'itemQuantity', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField id={`item-unit-${index}`} label="Unit price">
                      <input
                        id={`item-unit-${index}`}
                        className={field}
                        value={row.itemUnitPrice}
                        onChange={(e) => updateItem(index, 'itemUnitPrice', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField id={`item-total-${index}`} label="Line total">
                      <input
                        id={`item-total-${index}`}
                        className={field}
                        value={row.itemTotalPrice}
                        readOnly
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </PageSection>
          ) : null}

          {formStep === 2 ? (
          <PageSection
            step={2}
            title="Customer details"
            description="Enter the customer or company receiving this quotation."
            accentClass={sectionAccentClass}
          >
            <div id="quotation-form-step-2">
            <div className="mb-3 flex justify-end">
              <button type="button" className={btnGhost} onClick={addCustomer}>
                Add customer
              </button>
            </div>
            <div className="space-y-4">
              {form.customerDetails.map((row, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer {index + 1}
                    </p>
                    {form.customerDetails.length > 1 ? (
                      <button type="button" className={btnGhost} onClick={() => removeCustomer(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id={`cust-name-${index}`} label="Name">
                      <input
                        id={`cust-name-${index}`}
                        className={field}
                        value={row.name}
                        onChange={(e) => updateCustomer(index, 'name', e.target.value)}
                        required
                      />
                    </FormField>
                    <FormField id={`cust-trn-${index}`} label="TRN (optional)">
                      <input
                        id={`cust-trn-${index}`}
                        className={field}
                        value={row.trn}
                        onChange={(e) => updateCustomer(index, 'trn', e.target.value)}
                      />
                    </FormField>
                    <FormField id={`cust-phone-${index}`} label="Phone (optional)">
                      <input
                        id={`cust-phone-${index}`}
                        className={field}
                        value={row.phone}
                        onChange={(e) => updateCustomer(index, 'phone', e.target.value)}
                      />
                    </FormField>
                    <FormField id={`cust-mobile-${index}`} label="Mobile (optional)">
                      <input
                        id={`cust-mobile-${index}`}
                        className={field}
                        value={row.mobile}
                        onChange={(e) => updateCustomer(index, 'mobile', e.target.value)}
                      />
                    </FormField>
                    <FormField id={`cust-email-${index}`} label="Email (optional)">
                      <input
                        id={`cust-email-${index}`}
                        className={field}
                        value={row.email}
                        onChange={(e) => updateCustomer(index, 'email', e.target.value)}
                      />
                    </FormField>
                    <FormField id={`cust-address-${index}`} label="Address (optional)" className="sm:col-span-2">
                      <textarea
                        id={`cust-address-${index}`}
                        rows={2}
                        className={fieldTextarea}
                        value={row.address}
                        onChange={(e) => updateCustomer(index, 'address', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </PageSection>
          ) : null}

          {formStep === 3 ? (
          <PageSection
            step={3}
            title="Quotation overview"
            description="Quote reference, totals, and PDF generation."
            accentClass={sectionAccentClass}
          >
            <div id="quotation-form-step-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="q-date" label="Date">
                <input
                  id="q-date"
                  type="date"
                  className={field}
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </FormField>
              <FormField id="q-quoteNo" label="Quote no.">
                <input
                  id="q-quoteNo"
                  className={field}
                  value={form.quoteNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, quoteNo: e.target.value }))}
                  required
                />
              </FormField>
              <FormField id="q-ref" label="Enquiry ref">
                <input
                  id="q-ref"
                  className={field}
                  value={form.ref}
                  onChange={(e) => setForm((prev) => ({ ...prev, ref: e.target.value }))}
                  required
                />
              </FormField>
              <FormField id="q-trn" label="TRN">
                <input
                  id="q-trn"
                  className={field}
                  value={form.trn}
                  onChange={(e) => setForm((prev) => ({ ...prev, trn: e.target.value }))}
                  required
                />
              </FormField>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <FormField id="q-subTotal" label="Subtotal">
                <input id="q-subTotal" className={field} value={form.subTotal} readOnly required />
              </FormField>
              <FormField id="q-total" label="Total">
                <input
                  id="q-total"
                  className={field}
                  value={form.total}
                  onChange={(e) => {
                    const total = e.target.value
                    setForm((prev) => ({
                      ...prev,
                      total,
                      totalWords: amountToWords(quotationGrandTotal({ subTotal: prev.subTotal, total })),
                    }))
                  }}
                  required
                />
              </FormField>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                  <dt className="text-slate-500">Sub total</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatQuotationMoney(overviewTotals.subTotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                  <dt className="text-slate-500">VAT 5%</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatQuotationMoney(overviewTotals.vat)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:flex-col sm:justify-start">
                  <dt className="text-slate-500">Grand total</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">
                    {formatQuotationMoney(overviewTotals.total)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:col-span-3 sm:flex-col sm:justify-start">
                  <dt className="text-slate-500">Amount in words</dt>
                  <dd className="font-medium text-slate-900">
                    {amountToWords(quotationGrandTotal({ subTotal: form.subTotal, total: form.total })) || '—'}
                  </dd>
                </div>
              </dl>
            </div>
            </div>
          </PageSection>
          ) : null}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <button
              type="button"
              className={btnGhost}
              onClick={goToPreviousStep}
              disabled={formStep === 1}
            >
              ← Previous
            </button>
            {formStep < FORM_STEPS.length ? (
              <button type="button" className={primaryBtnClass} onClick={goToNextStep}>
                Next →
              </button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" className={btnGhost} onClick={previewFormPdf}>
                  Preview PDF
                </button>
                <button type="submit" disabled={saving} className={primaryBtnClass}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save quotation'}
                </button>
              </div>
            )}
          </div>
        </form>
      ) : null}

      {!formOpen ? (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          {controlsInSectionHeader ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">Your quotations</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Create and manage quotes for {monthLabel(year, month)}.
                </p>
              </div>
              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <div className="shrink-0">{monthPicker}</div>
                {!formOpen ? newQuotationButton : null}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-900">Your quotations</h2>
              <p className="mt-1 text-sm text-slate-500">{monthLabel(year, month)}</p>
            </>
          )}
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">Loading…</p>
        ) : quotations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
            No quotations for this month. Use <strong>New quotation</strong> to create one.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className={`${resolvedTableHeadClass} text-xs font-semibold uppercase tracking-wide`}>
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-6">Date</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Quote no.</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Customer</th>
                    <th className="px-4 py-3 font-semibold sm:px-6">Ref</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">Total</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations.map((row) => (
                    <tr key={row._id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {formatQuotationDate(row.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-900 sm:px-6">{row.quoteNo || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 sm:px-6">{primaryCustomerName(row)}</td>
                      <td className="px-4 py-3 text-slate-700 sm:px-6">{row.ref || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {row.total || '—'}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <QuotationRowActions
                          row={row}
                          isSeltecUser={isSeltecUser}
                          onView={setViewing}
                          onPdf={setPdfPreviewQuotation}
                          onEdit={openEditForm}
                          onDelete={handleDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {quotations.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatQuotationDate(row.date)}
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">{row.quoteNo || '—'}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{primaryCustomerName(row)}</p>
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                      {row.total || '—'}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <QuotationRowActions
                      row={row}
                      isSeltecUser={isSeltecUser}
                      onView={setViewing}
                      onPdf={setPdfPreviewQuotation}
                      onEdit={openEditForm}
                      onDelete={handleDelete}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Quotation details</h2>
                <p className="mt-1 text-sm text-slate-500">{viewing.quoteNo || '—'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => setViewing(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className={primaryBtnClass}
                  onClick={() => {
                    setPdfPreviewQuotation(viewing)
                    setViewing(null)
                  }}
                >
                  View PDF
                </button>
              </div>
            </div>
            <QuotationDetailView quotation={viewing} />
          </div>
        </div>
      ) : null}

      <QuotationPdfPreviewModal
        open={Boolean(pdfPreviewQuotation)}
        quotation={pdfPreviewQuotation}
        salesUser={user}
        brandingUser={user}
        onClose={() => setPdfPreviewQuotation(null)}
        primaryBtnClass={primaryBtnClass}
      />

    </DashboardShell>
  )
}

export { QuotationDetailView, MonthPicker }
