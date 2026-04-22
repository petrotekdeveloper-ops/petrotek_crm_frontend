import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import ManagerHeader from '../../components/ManagerHeader.jsx'
import { field, fieldTextarea, btnPrimary, btnGhost } from '../../lib/salesFormStyles.js'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ManagerMyDailyActivity({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [dailySales, setDailySales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ date: todayIso(), amount: '', note: '' })

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get(`/api/manager/my-daily?${ymQuery}`)
      setDailySales(Array.isArray(data?.dailySales) ? data.dailySales : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to manager tools.')
      } else {
        setError('Could not load your daily logs.')
      }
      setDailySales([])
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(id) {
    if (!window.confirm('Remove this daily entry?')) return
    try {
      await api.delete(`/api/manager/my-daily/${id}`)
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
      await api.put(`/api/manager/my-daily/${editing._id}`, {
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

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!form.date || form.amount === '') {
      setError('Enter date and amount.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/manager/my-daily', {
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
      badge="Manager workspace"
      title="My daily logs"
      subtitle={monthLabel(year, month)}
      user={user}
      onLogout={onLogout}
      actions={<ManagerHeader endSlot={monthPicker} />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">Add daily entry</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Add your own daily log with amount and optional note.
        </p>
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-3 sm:items-end sm:gap-4">
          <div>
            <label htmlFor="manager-log-date" className="mb-1 block text-xs font-medium text-slate-600">
              Date
            </label>
            <input
              id="manager-log-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="manager-log-amount" className="mb-1 block text-xs font-medium text-slate-600">
              Amount
            </label>
            <input
              id="manager-log-amount"
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
          <div className="sm:justify-self-end">
            <button
              type="submit"
              disabled={saving}
              className={`${btnPrimary} w-full touch-manipulation sm:w-auto`}
            >
              {saving ? 'Saving…' : 'Add entry'}
            </button>
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="manager-log-note" className="mb-1 block text-xs font-medium text-slate-600">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="manager-log-note"
              rows={3}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={fieldTextarea}
              placeholder="Client, follow-up, remarks..."
            />
          </div>
        </form>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Your daily logs</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Edit or remove your entries for {monthLabel(year, month)}.
              </p>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">Loading…</p>
        ) : dailySales.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No entries yet for this month.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-4 py-3 sm:px-6">Note</th>
                    <th className="px-4 py-3 text-right sm:px-6"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailySales.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {formatSaleDate(row.saleDate)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-600 sm:px-6">
                        {row.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
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
            <ul className="divide-y divide-slate-100 md:hidden">
              {dailySales.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatSaleDate(row.saleDate)}
                      </p>
                      {row.note ? (
                        <p className="mt-1 break-words text-sm text-slate-600">{row.note}</p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400">—</p>
                      )}
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className="min-h-[44px] flex-1 touch-manipulation rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
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
                      className="min-h-[44px] flex-1 touch-manipulation rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
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

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(90dvh,90vh)] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:max-h-[min(85vh,85dvh)] sm:max-w-md sm:rounded-2xl sm:p-6 sm:pb-6"
            role="dialog"
            aria-labelledby="manager-edit-entry-title"
            aria-modal="true"
          >
            <h3 id="manager-edit-entry-title" className="text-lg font-semibold text-slate-900">
              Edit entry
            </h3>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="manager-edit-date" className="mb-1 block text-xs font-medium text-slate-600">
                  Date
                </label>
                <input
                  id="manager-edit-date"
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
                <label htmlFor="manager-edit-amount" className="mb-1 block text-xs font-medium text-slate-600">
                  Amount
                </label>
                <input
                  id="manager-edit-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={editing.amount}
                  onChange={(e) => setEditing((x) => ({ ...x, amount: e.target.value }))}
                  className={field}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label htmlFor="manager-edit-note" className="mb-1 block text-xs font-medium text-slate-600">
                  Note
                </label>
                <textarea
                  id="manager-edit-note"
                  rows={3}
                  value={editing.note ?? ''}
                  onChange={(e) => setEditing((x) => ({ ...x, note: e.target.value }))}
                  className={fieldTextarea}
                />
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:py-2"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
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
