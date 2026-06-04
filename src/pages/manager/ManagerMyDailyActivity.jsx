import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { field, fieldTextarea, btnPrimary, btnGhost } from '../../lib/salesFormStyles.js'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSystemRow(row) {
  return Boolean(row?.isSystemGenerated)
}

export default function ManagerMyDailyActivity({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [dailySales, setDailySales] = useState([])
  const [summary, setSummary] = useState(null)
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
      const [dailyRes, summaryRes] = await Promise.all([
        api.get(`/api/manager/my-daily?${ymQuery}`),
        api.get(`/api/manager/team-summary?${ymQuery}`),
      ])
      setDailySales(Array.isArray(dailyRes.data?.dailySales) ? dailyRes.data.dailySales : [])
      setSummary(summaryRes.data ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to manager tools.')
      } else {
        setError('Could not load your daily logs.')
      }
      setDailySales([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  const targetProgress = useMemo(() => {
    const achievedAmount = dailySales.reduce((sum, row) => {
      if (isSystemRow(row)) return sum
      return sum + Number(row?.amount || 0)
    }, 0)
    const targetAmount =
      summary?.managerDefaultTargetAmount != null
        ? Number(summary.managerDefaultTargetAmount)
        : null
    const hasTarget = targetAmount != null && Number.isFinite(targetAmount)
    const progressPct =
      hasTarget && targetAmount > 0
        ? Math.min(100, Math.round((achievedAmount / targetAmount) * 100))
        : null
    const remaining =
      hasTarget ? Math.max(0, Number(targetAmount || 0) - achievedAmount) : null

    return {
      achievedAmount,
      targetAmount: hasTarget ? targetAmount : null,
      progressPct,
      remaining,
      entryCount: dailySales.filter((row) => !isSystemRow(row)).length,
    }
  }, [dailySales, summary?.managerDefaultTargetAmount])

  async function handleDelete(id) {
    if (String(id).startsWith('virtual-zero:')) return
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
    if (isSystemRow(editing)) {
      setEditing(null)
      return
    }
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

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="My daily logs"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <section className="mb-4 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm sm:mb-6">
        <div className="bg-gradient-to-br from-red-50 via-white to-slate-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Manager target
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Sales progress for {monthLabel(year, month)}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Your own sales against the admin-set default target.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem]">
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Target
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                  {loading
                    ? '—'
                    : targetProgress.targetAmount != null
                      ? formatMoney(targetProgress.targetAmount)
                      : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Achieved
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-red-900">
                  {loading ? '—' : formatMoney(targetProgress.achievedAmount)}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Remaining
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                  {loading
                    ? '—'
                    : targetProgress.remaining != null
                      ? formatMoney(targetProgress.remaining)
                      : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
              <span>
                {loading
                  ? 'Loading progress'
                  : targetProgress.progressPct != null
                    ? `${targetProgress.progressPct}% completed`
                    : 'No target set'}
              </span>
              <span className="tabular-nums">
                {loading ? '—' : `${targetProgress.entryCount} entries`}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-red-600 transition-all duration-500"
                style={{ width: `${loading ? 0 : targetProgress.progressPct ?? 0}%` }}
              />
            </div>
            {!loading && targetProgress.targetAmount == null ? (
              <p className="mt-2 text-xs text-slate-500">
                Ask admin to set your manager default target from the admin edit option.
              </p>
            ) : null}
          </div>
        </div>
      </section>

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
            <div className="shrink-0">
              <ManagerMonthControl year={year} month={month} goPrev={goPrev} goNext={goNext} />
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
                <thead className="bg-red-600 text-xs font-semibold uppercase text-white">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-4 py-3 sm:px-6">Note</th>
                    <th className="px-4 py-3 text-right sm:px-6">Action</th>
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
                        {isSystemRow(row) ? (
                          <span className="text-xs font-medium text-slate-400">System</span>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                              onClick={() =>
                                setEditing({
                                  ...row,
                                  _dateInput: row.saleDate
                                    ? new Date(row.saleDate).toISOString().slice(0, 10)
                                    : '',
                                })
                              }
                              aria-label="Edit daily entry"
                              title="Edit"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 shadow-sm transition hover:bg-red-50 hover:text-red-900"
                              onClick={() => handleDelete(row._id)}
                              aria-label="Delete daily entry"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .563c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        )}
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
                  {isSystemRow(row) ? (
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      System generated zero entry
                    </p>
                  ) : (
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
                  )}
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
