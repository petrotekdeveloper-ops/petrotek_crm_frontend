import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney, monthLabel } from '../../lib/format.js'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import { field, fieldTextarea, btnPrimary } from '../../lib/salesFormStyles.js'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SalesDashboard({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date: todayIso(), amount: '', note: '' })

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get(`/api/sales/summary?${ymQuery}`)
      setSummary(data ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Your account cannot access sales tools. Contact your administrator.')
      } else {
        setError('Could not load dashboard data.')
      }
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  const target = summary?.monthlyTargetAmount ?? summary?.teamTargetAmount
  const myTotal = summary?.myTotalSales ?? 0
  const remaining = summary?.remaining
  const pct =
    target != null && target > 0
      ? Math.min(100, Math.round((myTotal / target) * 100))
      : null

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!form.date || form.amount === '') {
      setError('Enter date and amount.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/sales/daily', {
        date: form.date,
        amount: Number(form.amount),
        note: form.note || undefined,
      })
      setForm({ date: todayIso(), amount: '', note: '' })
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  const monthPicker = (
    <div className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
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

  return (
    <DashboardShell
      badge="Sales workspace"
      title="Performance"
      subtitle={`Monthly overview · ${monthLabel(year, month)}`}
      user={user}
      onLogout={onLogout}
      actions={<SalesWorkspaceHeader endSlot={monthPicker} />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
            Your monthly target
          </p>
          <p className="mt-1.5 break-words text-lg font-semibold tabular-nums leading-tight text-slate-900 sm:mt-2 sm:text-xl md:text-2xl">
            {target != null ? formatMoney(target) : 'Not set'}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
            Your sales (month)
          </p>
          <p className="mt-1.5 break-words text-lg font-semibold tabular-nums leading-tight text-red-900 sm:mt-2 sm:text-xl md:text-2xl">
            {loading ? '…' : formatMoney(myTotal)}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
            Remaining to goal
          </p>
          <p className="mt-1.5 break-words text-lg font-semibold tabular-nums leading-tight text-indigo-700 sm:mt-2 sm:text-xl md:text-2xl">
            {remaining != null ? formatMoney(remaining) : '—'}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-slate-500 sm:hidden">Left toward goal</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Target − your month total</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-5">
          <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
            Progress
          </p>
          <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-slate-900 sm:mt-2 sm:text-xl md:text-2xl">
            {pct != null ? `${pct}%` : '—'}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:mt-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-800 transition-all"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      <section className="mt-6 min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:mt-8 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">Log a sale</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              <span className="sm:hidden">Today’s date by default. Use the month control in the header for stats.</span>
              <span className="hidden sm:inline">
                Defaults to today’s date — adjust if you are backdating. Month picker above matches your
                performance stats.
              </span>
            </p>
          </div>
          <Link
            to="/sales/activity"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50/80 px-4 text-sm font-medium text-red-800 transition hover:bg-red-100 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:text-red-700 sm:hover:text-red-900"
          >
            Daily logs →
          </Link>
        </div>
        <form onSubmit={handleAdd} className="mt-4 space-y-4 sm:mt-5">
          <div>
            <label
              htmlFor="sales-log-date"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Date
            </label>
            <input
              id="sales-log-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={field}
            />
          </div>
          <div>
            <label
              htmlFor="sales-log-amount"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Amount
            </label>
            <input
              id="sales-log-amount"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className={field}
              placeholder="0"
              inputMode="decimal"
            />
          </div>
          <div>
            <label htmlFor="sales-log-note" className="mb-1 block text-xs font-medium text-slate-600">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="sales-log-note"
              rows={3}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={fieldTextarea}
              placeholder="Customer, channel, reference…"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`${btnPrimary} w-full touch-manipulation sm:max-w-xs`}
          >
            {saving ? 'Saving…' : 'Add entry'}
          </button>
        </form>
      </section>
    </DashboardShell>
  )
}
