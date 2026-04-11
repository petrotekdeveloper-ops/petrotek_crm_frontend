import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
const btnPrimary =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
const btnGhost =
  'rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'

function useMonthState() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const go = (dy, dm) => {
    let y = year + dy
    let m = month + dm
    if (m > 12) {
      m = 1
      y += 1
    }
    if (m < 1) {
      m = 12
      y -= 1
    }
    setYear(y)
    setMonth(m)
  }
  return { year, month, setYear, setMonth, goPrev: () => go(0, -1), goNext: () => go(0, 1) }
}

export default function SalesDashboard({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [summary, setSummary] = useState(null)
  const [dailySales, setDailySales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date: '', amount: '', note: '' })
  const [editing, setEditing] = useState(null)

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [sRes, dRes] = await Promise.all([
        api.get(`/api/sales/summary?${ymQuery}`),
        api.get(`/api/sales/daily?${ymQuery}`),
      ])
      setSummary(sRes.data ?? null)
      setDailySales(Array.isArray(dRes.data?.dailySales) ? dRes.data.dailySales : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Your account cannot access sales tools. Contact your administrator.')
      } else {
        setError('Could not load dashboard data.')
      }
      setSummary(null)
      setDailySales([])
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  const target = summary?.teamTargetAmount
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
      setForm({ date: '', amount: '', note: '' })
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this daily entry?')) return
    try {
      await api.delete(`/api/sales/daily/${id}`)
      await load()
    } catch {
      setError('Could not delete entry.')
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing) return
    const dateStr =
      editing._dateInput ??
      (editing.saleDate
        ? new Date(editing.saleDate).toISOString().slice(0, 10)
        : '')
    setSaving(true)
    try {
      await api.put(`/api/sales/daily/${editing._id}`, {
        date: dateStr,
        amount: Number(editing.amount),
        note: editing.note ?? '',
      })
      setEditing(null)
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell
      badge="Sales workspace"
      title="Performance"
      subtitle={monthLabel(year, month)}
      user={user}
      onLogout={onLogout}
      actions={
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button type="button" onClick={goPrev} className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white">
            ←
          </button>
          <span className="min-w-[8rem] text-center text-sm font-medium text-slate-800">
            {monthLabel(year, month)}
          </span>
          <button type="button" onClick={goNext} className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white">
            →
          </button>
        </div>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Team monthly target
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {target != null ? formatMoney(target) : 'Not set'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Same figure for your team this month</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Your sales (month)
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-red-900">
            {loading ? '…' : formatMoney(myTotal)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Remaining to goal
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-indigo-700">
            {remaining != null ? formatMoney(remaining) : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Target − your month total</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Progress
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
            {pct != null ? `${pct}%` : '—'}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-800 transition-all"
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Log a sale</h2>
          <p className="mt-1 text-sm text-slate-500">Add a daily figure for {monthLabel(year, month)}</p>
          <form onSubmit={handleAdd} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={field}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={field}
                placeholder="Customer, channel, reference…"
              />
            </div>
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
              {saving ? 'Saving…' : 'Add entry'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm lg:col-span-3">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Daily activity</h2>
            <p className="text-sm text-slate-500">Your logged sales this month</p>
          </div>
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading…</p>
          ) : dailySales.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No entries yet for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">Note</th>
                    <th className="px-6 py-3 text-right"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailySales.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-900">
                        {formatSaleDate(row.saleDate)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-3 text-slate-600">
                        {row.note || '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() =>
                            setEditing({
                              ...row,
                              _dateInput: row.saleDate
                                ? new Date(row.saleDate).toISOString().slice(0, 10)
                                : '',
                            })
                          }
                        >
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
          )}
        </section>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit entry</h3>
            <form onSubmit={saveEdit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
                <input
                  type="date"
                  required
                  value={editing._dateInput ?? ''}
                  onChange={(e) =>
                    setEditing((x) => ({ ...x, _dateInput: e.target.value }))
                  }
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={editing.amount}
                  onChange={(e) => setEditing((x) => ({ ...x, amount: e.target.value }))}
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Note</label>
                <textarea
                  rows={2}
                  value={editing.note ?? ''}
                  onChange={(e) => setEditing((x) => ({ ...x, note: e.target.value }))}
                  className={field}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
