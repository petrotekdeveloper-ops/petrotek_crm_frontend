import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader from '../../components/ManagerHeader.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import { useMonthState } from '../../hooks/useMonthState.js'

const touchBtn =
  'min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition sm:min-h-0 sm:py-2'

export default function ManagerRepDetail({ user, onLogout }) {
  const { repId } = useParams()
  const { state } = useLocation()
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [targetDraft, setTargetDraft] = useState('')
  const [targetSaving, setTargetSaving] = useState(false)
  const [targetMsg, setTargetMsg] = useState('')

  const load = useCallback(async () => {
    if (!repId) return
    setError('')
    setLoading(true)
    try {
      const { data: body } = await api.get(
        `/api/manager/rep/${repId}/daily-sales?${ymQuery}`
      )
      setData(body)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('Selected sales user was not found in your team.')
      } else if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to this sales user.')
      } else {
        setError('Could not load user details and daily activity.')
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [repId, ymQuery])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data) return
    const t = data.monthlyTargetAmount ?? data.teamTargetAmount
    setTargetDraft(t != null ? String(t) : '')
    setTargetMsg('')
  }, [data])

  const selectedUser = data?.rep ?? {
    userId: state?.repUserId ?? repId,
    name: state?.repName ?? 'Sales user',
    phone: state?.repPhone ?? '—',
  }

  const initials = String(selectedUser?.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const rows = useMemo(() => {
    const list = Array.isArray(data?.dailySales) ? data.dailySales : []
    return list.filter(
      (row) =>
        String(row?.salesUserId ?? '') ===
        String(selectedUser?.userId ?? repId ?? '')
    )
  }, [data, selectedUser?.userId, repId])

  const monthlyTarget =
    data?.monthlyTargetAmount ?? data?.teamTargetAmount ?? null
  const hasTarget = Boolean(data?.hasTarget)
  const pct =
    monthlyTarget != null && monthlyTarget > 0
      ? Math.min(
          100,
          Math.round(((data?.monthTotal ?? 0) / monthlyTarget) * 100)
        )
      : null

  async function saveTarget(e) {
    e.preventDefault()
    if (!repId) return
    setTargetMsg('')
    const amt = Number(targetDraft)
    if (targetDraft === '' || !Number.isFinite(amt) || amt < 0) {
      setTargetMsg('Enter a non-negative target amount.')
      return
    }
    setTargetSaving(true)
    try {
      await api.put('/api/manager/sales-user-target', {
        salesUserId: repId,
        year,
        month,
        targetAmount: amt,
      })
      setTargetMsg('Target saved.')
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setTargetMsg(typeof msg === 'string' ? msg : 'Could not save target.')
    } finally {
      setTargetSaving(false)
    }
  }

  async function clearTarget() {
    if (!repId) return
    if (
      !window.confirm(
        'Remove the monthly target for this rep? Progress will show no goal until you set a new target.'
      )
    ) {
      return
    }
    setTargetMsg('')
    setTargetSaving(true)
    try {
      await api.delete(
        `/api/manager/sales-user-target?salesUserId=${encodeURIComponent(
          repId
        )}&year=${year}&month=${month}`
      )
      setTargetMsg('Target removed for this month.')
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setTargetMsg(typeof msg === 'string' ? msg : 'Could not clear target.')
    } finally {
      setTargetSaving(false)
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
      title={selectedUser.name}
      subtitle={`Selected sales user · ${monthLabel(year, month)}`}
      user={user}
      onLogout={onLogout}
      actions={<ManagerHeader endSlot={monthPicker} />}
    >
      <div className="mb-4 sm:mb-6">
        <Link
          to="/manager/team"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <span aria-hidden>←</span> Back to sales users
        </Link>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-12 text-center shadow-sm sm:px-6 sm:py-16">
          <p className="text-sm font-medium text-slate-600">
            Loading selected user details...
          </p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4 sm:space-y-6">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold tracking-wide text-red-900 sm:h-12 sm:w-12">
                  {initials || 'SU'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User profile
                  </p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900">
                    {selectedUser.name}
                  </h2>
                  <p className="truncate text-sm text-slate-600">{selectedUser.phone || '—'}</p>
                </div>
              </div>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center sm:w-auto sm:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Month total
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(data?.monthTotal ?? 0)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900">Monthly target</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {hasTarget ? (
                    <span className="font-medium text-emerald-800">Target set</span>
                  ) : (
                    <span className="font-medium text-amber-800">No target for this month yet</span>
                  )}{' '}
                  · goal for {monthLabel(year, month)}:{' '}
                  <span className="font-semibold text-slate-900">
                    {monthlyTarget != null ? formatMoney(monthlyTarget) : '—'}
                  </span>
                </p>
                {pct != null ? (
                  <div className="mt-4 max-w-md">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Progress
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-800 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-slate-600">{pct}%</p>
                  </div>
                ) : null}
              </div>
              <form
                onSubmit={saveTarget}
                className="flex w-full max-w-full flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 lg:max-w-sm"
              >
                <label className="text-xs font-medium text-slate-600" htmlFor="rep-target-amount">
                  Set monthly target ({monthLabel(year, month)})
                </label>
                <input
                  id="rep-target-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:text-sm"
                  placeholder="Amount"
                  inputMode="decimal"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="submit"
                    disabled={targetSaving}
                    className={`${touchBtn} bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {targetSaving ? 'Saving…' : 'Save target'}
                  </button>
                  {hasTarget ? (
                    <button
                      type="button"
                      disabled={targetSaving}
                      onClick={clearTarget}
                      className={`${touchBtn} border border-slate-300 bg-white font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50`}
                    >
                      Remove target
                    </button>
                  ) : null}
                </div>
                {targetMsg ? (
                  <p className="text-xs text-slate-600" role="status">
                    {targetMsg}
                  </p>
                ) : null}
              </form>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="border-b border-slate-100 bg-slate-50/90 px-4 py-4 sm:px-6 sm:py-5">
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                Daily activity
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Logs for {selectedUser.name} in {monthLabel(year, month)}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm leading-relaxed text-slate-500 sm:px-6 sm:py-14">
                No daily logs found for this user in this month.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3.5 sm:px-6">Date</th>
                        <th className="px-4 py-3.5 text-right sm:px-6">Amount</th>
                        <th className="px-4 py-3.5 sm:px-6">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr key={row._id} className="bg-white transition hover:bg-slate-50/90">
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900 sm:px-6">
                            {formatSaleDate(row.saleDate)}
                          </td>
                          <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-red-900 sm:px-6">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="max-w-md px-4 py-3.5 text-slate-600 sm:px-6">
                            <span className="line-clamp-2">{row.note?.trim() || '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y divide-slate-100 md:hidden">
                  {rows.map((row) => (
                    <li key={row._id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {formatSaleDate(row.saleDate)}
                          </p>
                        </div>
                        <p className="shrink-0 text-base font-semibold tabular-nums text-red-900">
                          {formatMoney(row.amount)}
                        </p>
                      </div>
                      {row.note?.trim() ? (
                        <p className="mt-2 text-sm text-slate-600">{row.note.trim()}</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">—</p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  )
}
