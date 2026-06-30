import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { monthLabel } from '../../lib/format.js'
import {
  ENQUIRY_ENUMS,
  creatorDisplayName,
  emptyEnquiryForm,
  enquiryToForm,
  formToPayload,
  formatEnquiryDate,
} from '../../lib/enquiryForm.js'
import { btnGhost, btnPrimary, field, fieldTextarea } from '../../lib/salesFormStyles.js'

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

function FormField({ id, label, children, className = '', required = false, requiredClass = 'text-red-600' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required ? <span className={requiredClass}> *</span> : null}
      </label>
      {children}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900">{value || '—'}</p>
    </div>
  )
}

export function EnquiryDetailView({ enquiry }) {
  if (!enquiry) return null
  return (
    <div className="space-y-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{enquiry.serialNo}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailRow label="Date received" value={formatEnquiryDate(enquiry.dateReceived)} />
        <DetailRow label="Status" value={enquiry.status} />
        <DetailRow label="Created by" value={creatorDisplayName(enquiry)} />
        <DetailRow label="Customer company" value={enquiry.customerCompany} />
        <DetailRow label="Contact person" value={enquiry.contactPerson} />
        <DetailRow label="From / Email / Phone" value={enquiry.sourceContact} />
        <DetailRow label="Subject" value={enquiry.subject} />
        <DetailRow label="Lead source" value={enquiry.leadSource} />
        <DetailRow label="Lead type" value={enquiry.leadType} />
        <DetailRow label="Priority" value={enquiry.priority} />
        <DetailRow label="Item / product" value={enquiry.itemProduct} />
        <DetailRow label="Qty" value={enquiry.qty} />
        <DetailRow label="Unit" value={enquiry.unit} />
        <DetailRow label="Stock position" value={enquiry.stockPosition} />
        <DetailRow label="Avg monthly movement" value={enquiry.avgMonthlyMovement} />
        <DetailRow label="Offer no." value={enquiry.offerNo} />
        <DetailRow label="Offer date" value={formatEnquiryDate(enquiry.offerDate)} />
        <DetailRow label="Offered value AED" value={enquiry.offeredValueAed} />
        <DetailRow label="Order value AED" value={enquiry.orderValueAed} />
        <DetailRow label="Expected closure" value={formatEnquiryDate(enquiry.expectedClosureDate)} />
        <DetailRow label="Next action date" value={formatEnquiryDate(enquiry.nextActionDate)} />
        <DetailRow label="Closed date" value={formatEnquiryDate(enquiry.closedDate)} />
        <DetailRow label="Days open" value={enquiry.daysOpen} />
        <DetailRow label="Converted" value={enquiry.converted ? 'Yes' : 'No'} />
        <DetailRow label="Reason if lost / pending" value={enquiry.reasonLostPending} />
        <DetailRow label="Last updated" value={formatEnquiryDate(enquiry.updatedAt)} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action taken / latest comment</p>
        <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-slate-900">
          {enquiry.actionTaken || '—'}
        </p>
      </div>

      {enquiry.managerReview ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manager review</p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-slate-900">
            {enquiry.managerReview}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function EnquiryFormModal({
  open,
  editing,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
  readOnly = false,
  fieldClass = field,
  textareaClass = fieldTextarea,
  primaryBtnClass = btnPrimary,
  requiredClass = 'text-red-600',
}) {
  if (!open) return null

  const enums = ENQUIRY_ENUMS

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const formFieldProps = { requiredClass }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-form-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 id="enquiry-form-title" className="text-lg font-semibold text-slate-900">
            {readOnly ? 'View enquiry' : editing ? 'Edit enquiry' : 'New enquiry'}
          </h2>
          {editing?.serialNo ? (
            <p className="mt-1 font-mono text-sm text-slate-500">{editing.serialNo}</p>
          ) : null}
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            if (!readOnly) onSubmit()
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {error ? (
              <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {error}
              </div>
            ) : null}

            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Basic details</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField id="enq-dateReceived" label="Date received" required {...formFieldProps}>
                    <input
                      id="enq-dateReceived"
                      type="date"
                      className={fieldClass}
                      value={form.dateReceived}
                      disabled={readOnly}
                      onChange={(e) => updateField('dateReceived', e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="enq-customerCompany" label="Customer company" required {...formFieldProps}>
                    <input
                      id="enq-customerCompany"
                      type="text"
                      className={fieldClass}
                      value={form.customerCompany}
                      disabled={readOnly}
                      onChange={(e) => updateField('customerCompany', e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="enq-contactPerson" label="Contact person">
                    <input
                      id="enq-contactPerson"
                      type="text"
                      className={fieldClass}
                      value={form.contactPerson}
                      disabled={readOnly}
                      onChange={(e) => updateField('contactPerson', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-sourceContact" label="From / Email / Phone">
                    <input
                      id="enq-sourceContact"
                      type="text"
                      className={fieldClass}
                      value={form.sourceContact}
                      disabled={readOnly}
                      onChange={(e) => updateField('sourceContact', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-subject" label="Subject / enquiry" required className="sm:col-span-2 lg:col-span-3" {...formFieldProps}>
                    <input
                      id="enq-subject"
                      type="text"
                      className={fieldClass}
                      value={form.subject}
                      disabled={readOnly}
                      onChange={(e) => updateField('subject', e.target.value)}
                      required
                    />
                  </FormField>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Classification</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField id="enq-leadSource" label="Lead source" required {...formFieldProps}>
                    <select
                      id="enq-leadSource"
                      className={fieldClass}
                      value={form.leadSource}
                      disabled={readOnly}
                      onChange={(e) => updateField('leadSource', e.target.value)}
                    >
                      {enums.leadSource.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="enq-leadType" label="Lead type">
                    <select
                      id="enq-leadType"
                      className={fieldClass}
                      value={form.leadType}
                      disabled={readOnly}
                      onChange={(e) => updateField('leadType', e.target.value)}
                    >
                      {enums.leadType.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="enq-priority" label="Priority">
                    <select
                      id="enq-priority"
                      className={fieldClass}
                      value={form.priority}
                      disabled={readOnly}
                      onChange={(e) => updateField('priority', e.target.value)}
                    >
                      {enums.priority.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="enq-status" label="Status" required {...formFieldProps}>
                    <select
                      id="enq-status"
                      className={fieldClass}
                      value={form.status}
                      disabled={readOnly}
                      onChange={(e) => updateField('status', e.target.value)}
                    >
                      {enums.status.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Product</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField id="enq-itemProduct" label="Item / product required">
                    <input
                      id="enq-itemProduct"
                      type="text"
                      className={fieldClass}
                      value={form.itemProduct}
                      disabled={readOnly}
                      onChange={(e) => updateField('itemProduct', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-qty" label="Qty">
                    <input
                      id="enq-qty"
                      type="number"
                      min="0"
                      step="any"
                      className={fieldClass}
                      value={form.qty}
                      disabled={readOnly}
                      onChange={(e) => updateField('qty', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-unit" label="Unit">
                    <input
                      id="enq-unit"
                      type="text"
                      className={fieldClass}
                      value={form.unit}
                      disabled={readOnly}
                      onChange={(e) => updateField('unit', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-stockPosition" label="Stock position">
                    <input
                      id="enq-stockPosition"
                      type="text"
                      className={fieldClass}
                      value={form.stockPosition}
                      disabled={readOnly}
                      onChange={(e) => updateField('stockPosition', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-avgMonthlyMovement" label="Avg monthly movement">
                    <input
                      id="enq-avgMonthlyMovement"
                      type="number"
                      min="0"
                      step="any"
                      className={fieldClass}
                      value={form.avgMonthlyMovement}
                      disabled={readOnly}
                      onChange={(e) => updateField('avgMonthlyMovement', e.target.value)}
                    />
                  </FormField>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Offer & order</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField id="enq-offerNo" label="Offer no.">
                    <input
                      id="enq-offerNo"
                      type="text"
                      className={fieldClass}
                      value={form.offerNo}
                      disabled={readOnly}
                      onChange={(e) => updateField('offerNo', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-offerDate" label="Offer date">
                    <input
                      id="enq-offerDate"
                      type="date"
                      className={fieldClass}
                      value={form.offerDate}
                      disabled={readOnly}
                      onChange={(e) => updateField('offerDate', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-offeredValueAed" label="Offered value AED">
                    <input
                      id="enq-offeredValueAed"
                      type="number"
                      min="0"
                      step="any"
                      className={fieldClass}
                      value={form.offeredValueAed}
                      disabled={readOnly}
                      onChange={(e) => updateField('offeredValueAed', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-orderValueAed" label="Order value AED">
                    <input
                      id="enq-orderValueAed"
                      type="number"
                      min="0"
                      step="any"
                      className={fieldClass}
                      value={form.orderValueAed}
                      disabled={readOnly}
                      onChange={(e) => updateField('orderValueAed', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-expectedClosureDate" label="Expected closure date">
                    <input
                      id="enq-expectedClosureDate"
                      type="date"
                      className={fieldClass}
                      value={form.expectedClosureDate}
                      disabled={readOnly}
                      onChange={(e) => updateField('expectedClosureDate', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-closedDate" label="Closed date">
                    <input
                      id="enq-closedDate"
                      type="date"
                      className={fieldClass}
                      value={form.closedDate}
                      disabled={readOnly}
                      onChange={(e) => updateField('closedDate', e.target.value)}
                    />
                  </FormField>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Follow-up</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="enq-nextActionDate" label="Next action date" required {...formFieldProps}>
                    <input
                      id="enq-nextActionDate"
                      type="date"
                      className={fieldClass}
                      value={form.nextActionDate}
                      disabled={readOnly}
                      onChange={(e) => updateField('nextActionDate', e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="enq-converted" label="Converted?">
                    <select
                      id="enq-converted"
                      className={fieldClass}
                      value={form.converted ? 'yes' : 'no'}
                      disabled={readOnly}
                      onChange={(e) => updateField('converted', e.target.value === 'yes')}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </FormField>
                  <FormField id="enq-actionTaken" label="Action taken / latest comment" required className="sm:col-span-2" {...formFieldProps}>
                    <textarea
                      id="enq-actionTaken"
                      rows={3}
                      className={textareaClass}
                      value={form.actionTaken}
                      disabled={readOnly}
                      onChange={(e) => updateField('actionTaken', e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="enq-reasonLostPending" label="Reason if lost / pending" className="sm:col-span-2">
                    <textarea
                      id="enq-reasonLostPending"
                      rows={2}
                      className={textareaClass}
                      value={form.reasonLostPending}
                      disabled={readOnly}
                      onChange={(e) => updateField('reasonLostPending', e.target.value)}
                    />
                  </FormField>
                  <FormField id="enq-managerReview" label="Manager review" className="sm:col-span-2">
                    <textarea
                      id="enq-managerReview"
                      rows={2}
                      className={textareaClass}
                      value={form.managerReview}
                      disabled={readOnly}
                      onChange={(e) => updateField('managerReview', e.target.value)}
                    />
                  </FormField>
                </div>
              </section>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-4 py-4 sm:px-6">
            <button type="button" className={btnGhost} onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly ? (
              <button type="submit" className={primaryBtnClass} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create enquiry'}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EnquiriesPage({
  user,
  onLogout,
  apiBasePath,
  apiClient = api,
  header,
  shellProps = {},
  theme = null,
  primaryBtnClass: primaryBtnClassProp = btnPrimary,
  tableHeadClass,
  readOnly = false,
  showCreatedBy = false,
  controlsInSectionHeader = false,
  renderMonthControl,
  extraQuery = '',
  sectionExtra = null,
  monthPickerInHeaderOnly = false,
}) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [enquiries, setEnquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(() => emptyEnquiryForm())
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const fieldClass = theme?.field ?? field
  const textareaClass = theme?.fieldTextarea ?? fieldTextarea
  const primaryBtnClass = theme?.btnPrimary ?? primaryBtnClassProp
  const searchFocusClass =
    theme?.searchFocus ?? 'focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
  const requiredClass = theme?.labelAccent ?? 'text-red-600'
  const headClass =
    tableHeadClass ??
    theme?.tableHeadSimple ??
    'border-b border-red-700 bg-red-600 text-xs font-semibold uppercase tracking-wide text-white'
  const cellClass = 'px-4 py-3 sm:px-6'

  const MonthControl = renderMonthControl || MonthPicker
  const monthPicker = <MonthControl year={year} month={month} goPrev={goPrev} goNext={goNext} />

  const loadEnquiries = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const parts = [ymQuery]
      if (search.trim()) parts.push(`search=${encodeURIComponent(search.trim())}`)
      if (extraQuery) parts.push(extraQuery.replace(/^&/, ''))
      const { data } = await apiClient.get(`${apiBasePath}?${parts.join('&')}`)
      setEnquiries(Array.isArray(data?.enquiries) ? data.enquiries : [])
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load enquiries.')
      setEnquiries([])
    } finally {
      setLoading(false)
    }
  }, [apiBasePath, apiClient, extraQuery, search, ymQuery])

  useEffect(() => {
    loadEnquiries()
  }, [loadEnquiries])

  function openCreate() {
    setEditing(null)
    setForm(emptyEnquiryForm())
    setFormError('')
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm(enquiryToForm(row))
    setFormError('')
    setModalOpen(true)
  }

  async function handleSave() {
    setFormError('')
    setSaving(true)
    try {
      const payload = formToPayload(form)
      if (editing?._id) {
        await apiClient.put(`${apiBasePath}/${editing._id}`, payload)
      } else {
        await apiClient.post(apiBasePath, payload)
      }
      setModalOpen(false)
      await loadEnquiries()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setFormError(typeof msg === 'string' ? msg : 'Could not save enquiry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this enquiry?')) return
    try {
      await apiClient.delete(`${apiBasePath}/${id}`)
      await loadEnquiries()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not delete enquiry.')
    }
  }

  function canDeleteRow(row) {
    if (readOnly || !user?._id) return false
    const creatorId = row.createdBy?._id || row.createdBy
    return String(creatorId) === String(user._id)
  }

  const newBtn = readOnly ? null : (
    <button type="button" className={primaryBtnClass} onClick={openCreate}>
      New enquiry
    </button>
  )

  const searchInput = (
    <input
      type="search"
      placeholder="Search company, item, serial…"
      className={`w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none sm:max-w-sm ${searchFocusClass}`}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  )

  const filters = (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      {!monthPickerInHeaderOnly && !controlsInSectionHeader ? monthPicker : null}
      {searchInput}
      {!controlsInSectionHeader ? newBtn : null}
    </div>
  )

  return (
    <DashboardShell
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={typeof header === 'function' ? header({ monthPicker }) : header}
      {...shellProps}
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      {!controlsInSectionHeader ? (
        <div className="mb-4 flex flex-col gap-3 sm:mb-6">
          {sectionExtra}
          {filters}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          {controlsInSectionHeader ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">Team enquiries</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    Enquiries created by you and your sales team for {monthLabel(year, month)}.
                  </p>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                  <div className="shrink-0">{monthPicker}</div>
                  {newBtn}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                {sectionExtra}
                {searchInput}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Enquiries</h2>
                <p className="mt-1 text-sm text-slate-500">{monthLabel(year, month)}</p>
              </div>
              {sectionExtra}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className={headClass}>
              <tr>
                <th className={`${cellClass} font-semibold`}>Serial</th>
                <th className={`${cellClass} font-semibold`}>Customer company</th>
                <th className={`${cellClass} font-semibold`}>Item</th>
                {showCreatedBy ? <th className={`${cellClass} font-semibold`}>Created by</th> : null}
                <th className={`${cellClass} font-semibold`}>Status</th>
                <th className={`${cellClass} font-semibold`}>Next action</th>
                <th className={`${cellClass} text-right font-semibold`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={showCreatedBy ? 7 : 6} className={`${cellClass} py-10 text-center text-slate-500`}>
                    Loading…
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={showCreatedBy ? 7 : 6} className={`${cellClass} py-10 text-center text-slate-500`}>
                    No enquiries for this period.
                  </td>
                </tr>
              ) : (
                enquiries.map((row) => (
                  <tr key={row._id}>
                    <td className={`whitespace-nowrap ${cellClass} font-mono text-xs`}>{row.serialNo}</td>
                    <td className={`${cellClass} font-medium text-slate-900`}>{row.customerCompany || '—'}</td>
                    <td className={`${cellClass} text-slate-700`}>{row.itemProduct || '—'}</td>
                    {showCreatedBy ? (
                      <td className={`${cellClass} text-slate-700`}>{creatorDisplayName(row)}</td>
                    ) : null}
                    <td className={cellClass}>
                      <span className="text-slate-800">{row.status}</span>
                    </td>
                    <td className={`whitespace-nowrap ${cellClass} tabular-nums text-slate-700`}>
                      {formatEnquiryDate(row.nextActionDate)}
                    </td>
                    <td className={`whitespace-nowrap ${cellClass} text-right`}>
                      <div className="inline-flex items-center gap-1">
                        <button type="button" className={btnGhost} onClick={() => setViewing(row)}>
                          View
                        </button>
                        {!readOnly ? (
                          <>
                            <button type="button" className={btnGhost} onClick={() => openEdit(row)}>
                              Edit
                            </button>
                            {canDeleteRow(row) ? (
                              <button
                                type="button"
                                className={btnGhost}
                                onClick={() => handleDelete(row._id)}
                              >
                                Delete
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <EnquiryFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
        readOnly={readOnly}
        fieldClass={fieldClass}
        textareaClass={textareaClass}
        primaryBtnClass={primaryBtnClass}
        requiredClass={requiredClass}
      />

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-900">Enquiry details</h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <EnquiryDetailView enquiry={viewing} />
            </div>
            <div className="flex justify-end border-t border-slate-100 px-4 py-4 sm:px-6">
              <button type="button" className={btnGhost} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}

export { MonthPicker }
