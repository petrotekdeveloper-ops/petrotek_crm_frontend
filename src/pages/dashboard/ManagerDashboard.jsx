import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
const btnPrimary =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50'
const btnDanger =
  'rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50'

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
  return { year, month, goPrev: () => go(0, -1), goNext: () => go(0, 1) }
}

export default function ManagerDashboard({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const [summary, setSummary] = useState(null)
  const [dailyActivity, setDailyActivity] = useState([])
  const [pending, setPending] = useState([])
  const [targetInput, setTargetInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)
  const [approvalBusy, setApprovalBusy] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [sumRes, actRes, pendRes] = await Promise.all([
        api.get(`/api/manager/team-summary?${ymQuery}`),
        api.get(`/api/manager/team-daily-sales?${ymQuery}`),
        api.get('/api/users/manager/pending'),
      ])
      setSummary(sumRes.data ?? null)
      setDailyActivity(
        Array.isArray(actRes.data?.dailySales) ? actRes.data.dailySales : []
      )
      setPending(Array.isArray(pendRes.data?.users) ? pendRes.data.users : [])
      const t = sumRes.data?.teamTargetAmount
      setTargetInput(t != null ? String(t) : '')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else {
        setError('Could not load dashboard.')
      }
      setSummary(null)
      setDailyActivity([])
      setPending([])
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  async function saveTarget(e) {
    e.preventDefault()
    setBanner('')
    const amt = Number(targetInput)
    if (!Number.isFinite(amt) || amt < 0) {
      setError('Enter a valid target amount.')
      return
    }
    setSavingTarget(true)
    try {
      await api.put('/api/manager/team-target', {
        year,
        month,
        targetAmount: amt,
      })
      setBanner('Team target saved for this month.')
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save target.')
    } finally {
      setSavingTarget(false)
    }
  }

  async function approveUser(u, status) {
    setBanner('')
    setApprovalBusy(u._id)
    try {
      await api.put(`/api/users/${u._id}/approval`, { status })
      setBanner(
        status === 'approved'
          ? `${u.name} has been approved.`
          : `${u.name} has been rejected.`
      )
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not update approval.')
    } finally {
      setApprovalBusy(null)
    }
  }

  const members = summary?.members ?? []

  return (
    <DashboardShell
      badge="Manager workspace"
      title="Team overview"
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
      {banner ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {banner}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-1">
          <h2 className="text-base font-semibold text-slate-900">Monthly team target</h2>
          <p className="mt-1 text-sm text-slate-500">
            One target for the team; each rep sees individual progress against this number.
          </p>
          <form onSubmit={saveTarget} className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Target amount
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className={field}
                placeholder="0"
              />
            </div>
            <button type="submit" disabled={savingTarget} className={`${btnPrimary} w-full`}>
              {savingTarget ? 'Saving…' : 'Save target'}
            </button>
          </form>
          {summary?.teamTargetAmount != null && !loading ? (
            <p className="mt-4 text-xs text-slate-500">
              Current saved target:{' '}
              <span className="font-semibold text-slate-800">
                {formatMoney(summary.teamTargetAmount)}
              </span>
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm lg:col-span-2">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Sales team</h2>
            <p className="text-sm text-slate-500">
              Totals and remaining vs team target for {monthLabel(year, month)}
            </p>
          </div>
          {loading ? (
            <p className="p-8 text-center text-slate-500">Loading…</p>
          ) : members.length === 0 ? (
            <p className="p-8 text-center text-slate-500">No approved sales users in your team yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Rep</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3 text-right">Month total</th>
                    <th className="px-6 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-medium text-slate-900">{m.name}</td>
                      <td className="px-6 py-3 text-slate-600">{m.phone}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-red-900">
                        {formatMoney(m.myTotalSales)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-indigo-800">
                        {m.remaining != null ? formatMoney(m.remaining) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {pending.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-0 shadow-sm">
          <div className="border-b border-amber-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Pending approvals</h2>
            <p className="text-sm text-slate-600">Sales registrations awaiting your decision</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-amber-100/50 text-xs font-semibold uppercase text-amber-900/80">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/80 bg-white/60">
                {pending.map((u) => (
                  <tr key={u._id}>
                    <td className="px-6 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-6 py-3 text-slate-600">{u.phone}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        disabled={approvalBusy === u._id}
                        className={`${btnPrimary} mr-2`}
                        onClick={() => approveUser(u, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={approvalBusy === u._id}
                        className={btnDanger}
                        onClick={() => approveUser(u, 'rejected')}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Daily activity</h2>
          <p className="text-sm text-slate-500">
            All logged sales from your team in {monthLabel(year, month)}
          </p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-slate-500">Loading…</p>
        ) : dailyActivity.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No daily entries for this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Rep</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyActivity.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {formatSaleDate(row.saleDate)}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-medium text-slate-900">{row.repName}</span>
                      <span className="ml-2 text-xs text-slate-500">{row.repPhone}</span>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                      {formatMoney(row.amount)}
                    </td>
                    <td className="max-w-[240px] truncate px-6 py-3 text-slate-600">
                      {row.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardShell>
  )
}
