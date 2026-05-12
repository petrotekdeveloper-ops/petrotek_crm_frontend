import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { btnGhost, btnPrimary, field, fieldTextarea } from '../../lib/salesFormStyles.js'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Default date for a new log while viewing `year` / `month` (1–12). */
function defaultServiceDateForMonth(year, month) {
  const now = new Date()
  if (now.getFullYear() === year && now.getMonth() + 1 === month) {
    return todayIso()
  }
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

function monthLabel(year, month) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1)
  )
}

const SERVICE_LOG_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'complete', label: 'Complete' },
]

const SERVICE_LOG_STATUS_VALUES = new Set(SERVICE_LOG_STATUSES.map((o) => o.value))

function isAmountOnlyLog(row) {
  return row?.entryKind === 'amount_only' || row?.status === 'amount-only'
}

/** Note text for amount-only rows; em dash for visit logs or empty notes. */
function amountEntryNoteDisplay(row) {
  if (!isAmountOnlyLog(row)) return '—'
  const t = String(row?.amountNote ?? '').trim()
  return t === '' ? '—' : t
}

function customerCellLabel(row) {
  if (isAmountOnlyLog(row)) return 'Amount only'
  return row.customer || '—'
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('complete') || s.includes('done')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
  if (s.includes('ongoing') || s.includes('progress')) {
    return 'border-sky-200 bg-sky-50 text-sky-900'
  }
  if (s.includes('amount-only')) {
    return 'border-violet-200 bg-violet-50 text-violet-900'
  }
  if (s.includes('pending')) {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }
  if (s.includes('cancel') || s.includes('fail')) {
    return 'border-red-200 bg-red-50 text-red-900'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800'
}

function StatCard({ label, value, hint, accent }) {
  const accents = {
    red: 'border-red-200/70 bg-gradient-to-br from-red-50 via-white to-red-100/50',
    indigo: 'border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/50',
    emerald: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/50',
    violet:
      'border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-violet-100/45',
  }
  const c = accents[accent] ?? accents.red
  return (
    <div className={`min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5 ${c}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-2xl font-semibold tabular-nums text-slate-900 sm:mt-2 sm:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-500 sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function FormField({ id, label, hint, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{hint}</p> : null}
    </div>
  )
}

const serviceHeadAmountInputClass =
  'w-full min-h-[44px] rounded-lg border border-amber-200/90 bg-white px-3 py-2.5 text-base font-medium tabular-nums text-slate-900 shadow-sm outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-200/60 sm:min-h-0 sm:py-2 sm:text-sm'

/** Distinct frame so service heads immediately see the head-only amount field. */
function ServiceHeadAmountField({ id, value, onChange, hint }) {
  return (
    <div className="md:col-span-2 rounded-xl border border-amber-200/80 bg-gradient-to-br from-slate-50 to-amber-50/40 p-3.5 shadow-sm ring-1 ring-amber-100/80 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          Amount
        </label>
        <span className="inline-flex items-center rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800/90 ring-1 ring-amber-200/60">
          Service head
        </span>
      </div>
      <input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        className={serviceHeadAmountInputClass}
        placeholder="0"
        value={value}
        onChange={onChange}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function buildServiceLogPayload(form) {
  return {
    date: form.date,
    customer: form.customer.trim(),
    service: form.service.trim(),
    km: Number(form.km),
    spares: form.spares.trim(),
    status: form.status.trim(),
  }
}

function formatLogAmount(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n))
}

export default function ServiceDashboard({ user, onLogout }) {
  const isServiceHead =
    user?.designation === 'service' && user?.serviceHead === true
  const { year, month, goPrev, goNext } = useMonthState()
  const [logs, setLogs] = useState([])
  const [monthAmountSummary, setMonthAmountSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    date: todayIso(),
    customer: '',
    service: '',
    km: '',
    spares: '',
    status: 'pending',
  })
  const [newLogOpen, setNewLogOpen] = useState(false)
  const [amountOnlyOpen, setAmountOnlyOpen] = useState(false)
  const [amountOnlyForm, setAmountOnlyForm] = useState({ date: '', amount: '', amountNote: '' })

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])

  const totalKm = useMemo(
    () => logs.reduce((sum, row) => sum + (Number(row.km) || 0), 0),
    [logs]
  )

  const totalAmount = useMemo(() => {
    if (!isServiceHead) return null
    return logs.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  }, [logs, isServiceHead])

  /** Matches server aggregation (full month), not capped list sum. */
  const displayedAmountTotal = useMemo(() => {
    if (!isServiceHead) return null
    if (monthAmountSummary != null && Number.isFinite(Number(monthAmountSummary.achievedAmount))) {
      return Number(monthAmountSummary.achievedAmount)
    }
    return totalAmount ?? 0
  }, [isServiceHead, monthAmountSummary, totalAmount])

  const amountOnlyTargetHint = useMemo(() => {
    const s = monthAmountSummary
    if (!isServiceHead || !s?.hasTarget || s.targetAmount == null)
      return 'Required — amounts you enter add to achieved total; against a manager target, that shrinks what is left to reach.'
    const rem = Number(s.remaining ?? 0)
    const tg = Number(s.targetAmount)
    const raw = amountOnlyForm.amount == null ? '' : String(amountOnlyForm.amount).trim()
    const draft = raw === '' ? NaN : Number(raw)
    if (!Number.isFinite(draft) || draft < 0)
      return `Manager target ${formatLogAmount(tg)} · Gap ${formatLogAmount(rem)}. Logging more lowers the gap (inverse).`
    const afterGap = Math.max(0, rem - draft)
    return `If you save ${formatLogAmount(draft)}, about ${formatLogAmount(afterGap)} would remain toward ${formatLogAmount(tg)}.`
  }, [isServiceHead, monthAmountSummary, amountOnlyForm.amount])

  const managerTargetHint = useMemo(() => {
    if (!isServiceHead) return '—'
    const s = monthAmountSummary
    if (!s) return ''
    if (!s.hasTarget || s.targetAmount == null)
      return 'No manager monthly goal · logging still updates your totals'
    if (s.exceededTargetBy != null && s.exceededTargetBy > 0) {
      return `${formatLogAmount(s.exceededTargetBy)} beyond goal (${s.achievementOfTargetPct ?? 0}% of target)`
    }
    return `Manager goal ${formatLogAmount(s.targetAmount)} · ${formatLogAmount(s.remaining)} to go (${s.progressPct ?? 0}% done, ${s.gapPctOfTarget ?? 0}% gap left)`
  }, [isServiceHead, monthAmountSummary])

  const latestEntryLine = useMemo(() => {
    if (!logs.length) return null
    const latest = logs[0]
    if (isAmountOnlyLog(latest)) {
      const note = String(latest.amountNote || '').trim()
      const noteBit =
        note.length > 0 ? ` · ${note.length > 72 ? `${note.slice(0, 72)}…` : note}` : ''
      return `Latest: ${formatDate(latest.date)} · Amount ${formatLogAmount(latest.amount)} (amount only)${noteBit}`
    }
    return `Latest: ${formatDate(latest.date)} · ${latest.customer}`
  }, [logs])

  function openNewLogModal() {
    setEditing(null)
    setAmountOnlyOpen(false)
    setForm({
      date: defaultServiceDateForMonth(year, month),
      customer: '',
      service: '',
      km: '',
      spares: '',
      status: 'pending',
    })
    setNewLogOpen(true)
  }

  function closeNewLogModal() {
    setNewLogOpen(false)
  }

  function openAmountOnlyModal() {
    if (!isServiceHead) return
    setEditing(null)
    setNewLogOpen(false)
    setAmountOnlyForm({
      date: defaultServiceDateForMonth(year, month),
      amount: '',
      amountNote: '',
    })
    setAmountOnlyOpen(true)
  }

  function closeAmountOnlyModal() {
    setAmountOnlyOpen(false)
  }

  function updateAmountOnlyForm(name, value) {
    setAmountOnlyForm((prev) => ({ ...prev, [name]: value }))
  }

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/service', { params: { year, month } })
      setLogs(Array.isArray(data?.serviceLogs) ? data.serviceLogs : [])
      setMonthAmountSummary(
        isServiceHead && data?.monthAmountSummary != null ? data.monthAmountSummary : null
      )
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Only approved service accounts can access this dashboard.')
      } else {
        setError('Could not load service logs.')
      }
      setLogs([])
      setMonthAmountSummary(null)
    } finally {
      setLoading(false)
    }
  }, [year, month, isServiceHead])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function updateForm(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/api/service', buildServiceLogPayload(form))
      setForm({
        date: defaultServiceDateForMonth(year, month),
        customer: '',
        service: '',
        km: '',
        spares: '',
        status: 'pending',
      })
      setNewLogOpen(false)
      await loadLogs()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to create service log.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateAmountOnly(e) {
    e.preventDefault()
    if (!isServiceHead) return
    setSaving(true)
    setError('')
    try {
      const trimmed =
        amountOnlyForm.amount == null ? '' : String(amountOnlyForm.amount).trim()
      if (trimmed === '') {
        setError('Enter an amount.')
        setSaving(false)
        return
      }
      const n = Number(trimmed)
      if (!Number.isFinite(n) || n < 0) {
        setError('Amount must be a non-negative number.')
        setSaving(false)
        return
      }
      const payload = { amountOnly: true, amount: n }
      if (amountOnlyForm.date && String(amountOnlyForm.date).trim() !== '') {
        payload.date = amountOnlyForm.date
      }
      const noteRaw = amountOnlyForm.amountNote == null ? '' : String(amountOnlyForm.amountNote).trim()
      if (noteRaw !== '') {
        payload.amountNote = noteRaw.slice(0, 2000)
      }
      await api.post('/api/service', payload)
      setAmountOnlyForm({
        date: defaultServiceDateForMonth(year, month),
        amount: '',
        amountNote: '',
      })
      setAmountOnlyOpen(false)
      await loadLogs()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to save amount entry.')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row) {
    setNewLogOpen(false)
    setAmountOnlyOpen(false)
    setEditing({
      ...row,
      _dateInput: toDateInput(row.date),
      _customerInput: row.customer ?? '',
      _serviceInput: row.service ?? '',
      _kmInput: row.km ?? '',
      _sparesInput: row.spares ?? '',
      _statusInput: row.status ?? '',
      _amountInput:
        row.amount != null && row.amount !== '' ? String(row.amount) : '',
      _amountOnly: isAmountOnlyLog(row),
      _amountNoteInput: row.amountNote ?? '',
    })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      if (editing._amountOnly && isServiceHead) {
        const trimmed =
          editing._amountInput == null ? '' : String(editing._amountInput).trim()
        if (trimmed === '') {
          setError('Amount is required for amount-only entries.')
          setSaving(false)
          return
        }
        const n = Number(trimmed)
        if (!Number.isFinite(n) || n < 0) {
          setError('Amount must be a non-negative number.')
          setSaving(false)
          return
        }
        await api.put(`/api/service/${editing._id}`, {
          date: editing._dateInput,
          amount: n,
          amountNote:
            editing._amountNoteInput == null ? '' : String(editing._amountNoteInput).trim().slice(0, 2000),
        })
      } else {
        const body = {
          date: editing._dateInput,
          customer: editing._customerInput,
          service: editing._serviceInput,
          km: Number(editing._kmInput),
          spares: editing._sparesInput,
          status: editing._statusInput,
        }
        if (isServiceHead) {
          const t = editing._amountInput == null ? '' : String(editing._amountInput).trim()
          body.amount = t === '' ? '' : editing._amountInput
        }
        await api.put(`/api/service/${editing._id}`, body)
      }
      setEditing(null)
      await loadLogs()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to update service log.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this service log?')) return
    setError('')
    try {
      await api.delete(`/api/service/${id}`)
      await loadLogs()
    } catch {
      setError('Failed to delete service log.')
    }
  }

  return (
    <DashboardShell
      badge="Service Portal"
      title="Field service workspace"
      subtitle={`Record visits, mileage, and job status · ${monthPill}`}
      user={user}
      onLogout={onLogout}
      actions={
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="flex w-full justify-center sm:w-auto sm:justify-end">
            <div className="flex w-full max-w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto sm:justify-center">
              <button
                type="button"
                onClick={goPrev}
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Previous month"
              >
                ←
              </button>
              <span className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium text-slate-800 sm:min-w-[9rem] sm:flex-none">
                {monthPill}
              </span>
              <button
                type="button"
                onClick={goNext}
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </div>
          {isServiceHead ? (
            <button
              type="button"
              onClick={openAmountOnlyModal}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-sm shadow-violet-900/5 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 sm:w-auto sm:min-h-[40px] sm:py-2"
            >
              Add amount
            </button>
          ) : null}
          <button
            type="button"
            onClick={openNewLogModal}
            className="inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/15 transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 sm:w-auto sm:min-h-[40px] sm:py-2"
          >
            <span className="text-lg leading-none" aria-hidden>
              +
            </span>
            New log
          </button>
        </div>
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

      <div
        className={`mb-5 grid grid-cols-1 gap-3 sm:mb-6 sm:gap-4 ${
          isServiceHead ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'
        }`}
      >
        <StatCard
          accent="red"
          label="Total logs"
          value={loading ? '…' : String(logs.length)}
          hint={`Entries in ${monthPill}`}
        />
        <StatCard
          accent="indigo"
          label="Total KM"
          value={loading ? '…' : totalKm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          hint={`Distance logged in ${monthPill}`}
        />
        {isServiceHead ? (
          <StatCard
            accent="emerald"
            label="Total amount"
            value={loading ? '…' : formatLogAmount(displayedAmountTotal ?? 0)}
            hint={`Monthly amount total · ${monthPill}`}
          />
        ) : null}
        {isServiceHead ? (
          <StatCard
            accent="violet"
            label="Target progress"
            value={
              loading || !monthAmountSummary
                ? '…'
                : !monthAmountSummary.hasTarget
                  ? '—'
                  : monthAmountSummary.exceededTargetBy != null &&
                      monthAmountSummary.exceededTargetBy > 0
                    ? `${monthAmountSummary.achievementOfTargetPct ?? 0}%`
                    : `${monthAmountSummary.progressPct ?? 0}%`
            }
            hint={
              loading || !monthAmountSummary ? '' : managerTargetHint
            }
          />
        ) : null}
      </div>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Your service history</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {loading ? (
                  'Newest first · loading…'
                ) : (
                  <>
                    Newest first ·{' '}
                    <span className="font-semibold tabular-nums text-slate-800">{logs.length}</span>{' '}
                    {logs.length === 1 ? 'log' : 'logs'}
                  </>
                )}
              </p>
              {!loading && latestEntryLine ? (
                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{latestEntryLine}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm font-medium tabular-nums text-slate-700 sm:text-right">
              Total KM:{' '}
              <span className="text-red-900">
                {totalKm.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>
        {loading ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500 sm:px-6">Loading your logs…</p>
        ) : logs.length === 0 ? (
          <div className="px-3 py-10 text-center sm:px-6">
            <p className="font-medium text-slate-800">No logs for {monthPill}</p>
            <p className="mt-1 text-sm text-slate-500">
              Use <span className="font-medium text-slate-700">New log</span>
              {isServiceHead ? (
                <>
                  {' '}
                  or <span className="font-medium text-violet-800">Add amount</span>
                </>
              ) : null}{' '}
              in the header to add an entry for this month.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm lg:min-w-[800px]">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3 md:px-4 lg:px-6">Date</th>
                    <th className="px-3 py-3 md:px-4 lg:px-6">Customer</th>
                    <th className="px-3 py-3 md:px-4 lg:px-6">Service</th>
                    <th className="px-3 py-3 text-right md:px-4 lg:px-6">KM</th>
                    {isServiceHead ? (
                      <th className="px-3 py-3 text-right md:px-4 lg:px-6">Amount</th>
                    ) : null}
                    {isServiceHead ? (
                      <th className="max-w-[200px] px-3 py-3 md:px-4 lg:max-w-[240px] lg:px-6">
                        Note
                      </th>
                    ) : null}
                    <th className="px-3 py-3 md:px-4 lg:px-6">Spares</th>
                    <th className="px-3 py-3 md:px-4 lg:px-6">Status</th>
                    <th className="px-3 py-3 text-right md:px-4 lg:px-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row._id} className="transition hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900 md:px-4 lg:px-6">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-3 py-3 text-slate-800 md:px-4 lg:px-6">
                        {customerCellLabel(row)}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-slate-600 md:px-4 lg:max-w-[260px] lg:px-6">
                        {isAmountOnlyLog(row) ? '—' : row.service || '—'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-900 md:px-4 lg:px-6">
                        {Number(row.km || 0).toFixed(2)}
                      </td>
                      {isServiceHead ? (
                        <td className="px-3 py-3 text-right tabular-nums text-slate-800 md:px-4 lg:px-6">
                          {formatLogAmount(row.amount)}
                        </td>
                      ) : null}
                      {isServiceHead ? (
                        <td
                          className="max-w-[200px] px-3 py-3 text-slate-700 md:max-w-[220px] md:px-4 lg:max-w-[240px] lg:px-6"
                          title={amountEntryNoteDisplay(row) === '—' ? undefined : amountEntryNoteDisplay(row)}
                        >
                          <span className="line-clamp-2 break-words text-sm leading-snug">
                            {amountEntryNoteDisplay(row)}
                          </span>
                        </td>
                      ) : null}
                      <td className="max-w-[160px] truncate px-3 py-3 text-slate-600 md:px-4 lg:px-6">
                        {row.spares || '—'}
                      </td>
                      <td className="px-3 py-3 md:px-4 lg:px-6">
                        <span
                          className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right md:px-4 lg:px-6">
                        <button type="button" className={btnGhost} onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${btnGhost} ml-1 text-red-700`}
                          onClick={() => handleDelete(row._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {logs.map((row) => (
                <li key={row._id} className="px-3 py-4 sm:px-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatDate(row.date)}
                      </p>
                      <p className="mt-1 break-words font-semibold leading-snug text-slate-900">
                        {customerCellLabel(row)}
                      </p>
                      <p className="mt-1 break-words text-sm leading-relaxed text-slate-600">
                        {isAmountOnlyLog(row) ? '—' : row.service || '—'}
                      </p>
                    </div>
                    <p className="max-w-[42%] shrink-0 text-right text-base font-semibold tabular-nums text-red-900 sm:text-lg">
                      {Number(row.km || 0).toFixed(2)}
                      <span className="mt-0.5 block text-xs font-normal tabular-nums text-slate-500">
                        km
                      </span>
                    </p>
                  </div>
                  {row.spares ? (
                    <p className="mt-2 break-words text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Spares:</span> {row.spares}
                    </p>
                  ) : null}
                  {isServiceHead ? (
                    <p className="mt-1 text-sm tabular-nums text-slate-700">
                      <span className="font-medium text-slate-700">Amount:</span>{' '}
                      {formatLogAmount(row.amount)}
                    </p>
                  ) : null}
                  {isServiceHead && isAmountOnlyLog(row) && amountEntryNoteDisplay(row) !== '—' ? (
                    <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">
                      <span className="font-medium text-slate-700">Note:</span> {amountEntryNoteDisplay(row)}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex max-w-full break-words rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-800 hover:bg-red-100"
                      onClick={() => handleDelete(row._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {newLogOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={closeNewLogModal}
        >
          <div
            className="max-h-[min(92dvh,92vh)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-white pt-5 shadow-2xl ps-[max(1.25rem,env(safe-area-inset-left))] pe-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[min(88vh,88dvh)] sm:rounded-2xl sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-labelledby="svc-new-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <h3 id="svc-new-title" className="text-lg font-semibold text-slate-900">
                  New service log
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Record a field visit — customer, work, KM, and status are required.
                </p>
              </div>
              <button
                type="button"
                onClick={closeNewLogModal}
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              <FormField id="svc-date" label="Service date" hint="When the work was done">
                <input
                  id="svc-date"
                  type="date"
                  required
                  className={field}
                  value={form.date}
                  onChange={(e) => updateForm('date', e.target.value)}
                />
              </FormField>
              <FormField id="svc-km" label="KM" hint="Odometer or distance for this job">
                <input
                  id="svc-km"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  inputMode="decimal"
                  className={field}
                  placeholder="0"
                  value={form.km}
                  onChange={(e) => updateForm('km', e.target.value)}
                />
              </FormField>
              <FormField id="svc-customer" label="Customer" hint="Company or contact name">
                <input
                  id="svc-customer"
                  type="text"
                  required
                  className={field}
                  placeholder="Customer name"
                  value={form.customer}
                  onChange={(e) => updateForm('customer', e.target.value)}
                />
              </FormField>
              <FormField id="svc-status" label="Status" hint="Job state for this visit">
                <select
                  id="svc-status"
                  required
                  className={field}
                  value={form.status}
                  onChange={(e) => updateForm('status', e.target.value)}
                >
                  {SERVICE_LOG_STATUSES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="md:col-span-2">
                <FormField id="svc-work" label="Service / work performed" hint="Brief description of work">
                  <input
                    id="svc-work"
                    type="text"
                    required
                    className={field}
                    placeholder="Oil change, inspection, repair…"
                    value={form.service}
                    onChange={(e) => updateForm('service', e.target.value)}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField id="svc-spares" label="Spares" hint="Optional — parts used or ordered">
                  <textarea
                    id="svc-spares"
                    rows={2}
                    className={fieldTextarea}
                    placeholder="Parts, serials, notes…"
                    value={form.spares}
                    onChange={(e) => updateForm('spares', e.target.value)}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeNewLogModal}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  {saving ? 'Saving…' : 'Save service log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isServiceHead && amountOnlyOpen ? (
        <div
          className="fixed inset-0 z-[105] flex items-end justify-center bg-violet-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onClick={closeAmountOnlyModal}
        >
          <div
            className="max-h-[min(88dvh,88vh)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-violet-200/90 bg-white pt-5 shadow-2xl ring-1 ring-violet-100 ps-[max(1.25rem,env(safe-area-inset-left))] pe-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[min(80vh,80dvh)] sm:rounded-2xl sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-labelledby="svc-amount-only-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-violet-100 pb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
                  Service head
                </p>
                <h3 id="svc-amount-only-title" className="mt-1 text-lg font-semibold text-slate-900">
                  Add amount only
                </h3>
              </div>
              <button
                type="button"
                onClick={closeAmountOnlyModal}
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form className="mt-5 space-y-4 sm:space-y-5" onSubmit={handleCreateAmountOnly}>
              <FormField
                id="amt-only-date"
                label="Date (optional)"
                hint="Suggested for the month you are viewing. Clear for today (server date)."
              >
                <input
                  id="amt-only-date"
                  type="date"
                  className={field}
                  value={amountOnlyForm.date}
                  onChange={(e) => updateAmountOnlyForm('date', e.target.value)}
                />
              </FormField>
              <FormField id="amt-only-value" label="Amount" hint={amountOnlyTargetHint}>
                <input
                  id="amt-only-value"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  required
                  className={`${field} font-medium tabular-nums`}
                  placeholder="0"
                  autoComplete="off"
                  value={amountOnlyForm.amount}
                  onChange={(e) => updateAmountOnlyForm('amount', e.target.value)}
                />
              </FormField>
              <FormField
                id="amt-only-note"
                label="Note (optional)"
              >
                <textarea
                  id="amt-only-note"
                  rows={3}
                  maxLength={2000}
                  className={fieldTextarea}
                  placeholder="Optional note…"
                  value={amountOnlyForm.amountNote}
                  onChange={(e) => updateAmountOnlyForm('amountNote', e.target.value)}
                />
              </FormField>
              <div className="flex flex-col-reverse gap-2 border-t border-violet-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAmountOnlyModal}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-900/20 transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:pointer-events-none disabled:opacity-60 sm:min-h-0 sm:w-auto"
                >
                  {saving ? 'Saving…' : 'Save amount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(92dvh,92vh)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-white pt-5 shadow-2xl ps-[max(1.25rem,env(safe-area-inset-left))] pe-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[min(85vh,85dvh)] sm:rounded-2xl sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            role="dialog"
            aria-labelledby="svc-edit-title"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="min-w-0">
                <h3 id="svc-edit-title" className="text-lg font-semibold text-slate-900">
                  {editing._amountOnly && isServiceHead ? 'Edit amount entry' : 'Edit service log'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editing._amountOnly && isServiceHead
                    ? 'Update the date, amount, or optional note for this amount-only entry.'
                    : 'Update fields and save your changes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form onSubmit={saveEdit} className="mt-5 space-y-4 sm:space-y-5">
              {editing._amountOnly && isServiceHead ? (
                <>
                  <FormField id="edit-date" label="Date">
                    <input
                      id="edit-date"
                      type="date"
                      required
                      className={field}
                      value={editing._dateInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _dateInput: e.target.value }))}
                    />
                  </FormField>
                  <ServiceHeadAmountField
                    id="edit-amount"
                    value={editing._amountInput ?? ''}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, _amountInput: e.target.value }))
                    }
                    hint="Required — you cannot clear the amount on amount-only entries."
                  />
                  <FormField
                    id="edit-amount-note"
                    label="Note (optional)"
                    hint="Optional context stored with this amount entry."
                  >
                    <textarea
                      id="edit-amount-note"
                      rows={3}
                      maxLength={2000}
                      className={fieldTextarea}
                      placeholder="Optional note…"
                      value={editing._amountNoteInput ?? ''}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, _amountNoteInput: e.target.value }))
                      }
                    />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField id="edit-date" label="Date">
                    <input
                      id="edit-date"
                      type="date"
                      required
                      className={field}
                      value={editing._dateInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _dateInput: e.target.value }))}
                    />
                  </FormField>
                  <FormField id="edit-customer" label="Customer">
                    <input
                      id="edit-customer"
                      type="text"
                      required
                      className={field}
                      value={editing._customerInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _customerInput: e.target.value }))}
                    />
                  </FormField>
                  <FormField id="edit-service" label="Service">
                    <input
                      id="edit-service"
                      type="text"
                      required
                      className={field}
                      value={editing._serviceInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _serviceInput: e.target.value }))}
                    />
                  </FormField>
                  <FormField id="edit-km" label="KM">
                    <input
                      id="edit-km"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      inputMode="decimal"
                      className={field}
                      value={editing._kmInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _kmInput: e.target.value }))}
                    />
                  </FormField>
                  {isServiceHead ? (
                    <ServiceHeadAmountField
                      id="edit-amount"
                      value={editing._amountInput ?? ''}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, _amountInput: e.target.value }))
                      }
                      hint="Optional — clear to remove the amount"
                    />
                  ) : null}
                  <FormField id="edit-spares" label="Spares">
                    <textarea
                      id="edit-spares"
                      rows={2}
                      className={fieldTextarea}
                      value={editing._sparesInput}
                      onChange={(e) => setEditing((p) => ({ ...p, _sparesInput: e.target.value }))}
                    />
                  </FormField>
                  <FormField id="edit-status" label="Status">
                    <select
                      id="edit-status"
                      required
                      className={field}
                      value={
                        SERVICE_LOG_STATUS_VALUES.has(String(editing._statusInput || '').toLowerCase())
                          ? String(editing._statusInput || '').toLowerCase()
                          : editing._statusInput || 'pending'
                      }
                      onChange={(e) => setEditing((p) => ({ ...p, _statusInput: e.target.value }))}
                    >
                      {!SERVICE_LOG_STATUS_VALUES.has(String(editing._statusInput || '').toLowerCase()) &&
                      editing._statusInput ? (
                        <option value={editing._statusInput}>{editing._statusInput} (legacy)</option>
                      ) : null}
                      {SERVICE_LOG_STATUSES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:w-auto"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
