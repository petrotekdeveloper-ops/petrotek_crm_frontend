import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'

function yesterdayInputValue() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoDatePart(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export default function ManagerDashboard({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const [dailyActivity, setDailyActivity] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedDate, setSelectedDate] = useState(yesterdayInputValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [actRes, sumRes] = await Promise.all([
        api.get(`/api/manager/team-daily-sales?${ymQuery}`),
        api.get(`/api/manager/team-summary?${ymQuery}`),
      ])
      setDailyActivity(
        Array.isArray(actRes.data?.dailySales) ? actRes.data.dailySales : []
      )
      setSummary(sumRes.data ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else {
        setError('Could not load sales report data.')
      }
      setDailyActivity([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  const filteredRows = useMemo(() => {
    if (!selectedDate) return dailyActivity
    return dailyActivity.filter((row) => isoDatePart(row?.saleDate) === selectedDate)
  }, [dailyActivity, selectedDate])

  const report = useMemo(() => {
    const monthTotal = dailyActivity.reduce(
      (sum, row) => sum + Number(row?.amount || 0),
      0
    )
    const scopedRows = selectedDate ? filteredRows : dailyActivity
    const scopedTotal = scopedRows.reduce(
      (sum, row) => sum + Number(row?.amount || 0),
      0
    )
    const activeRepsMonth = new Set(dailyActivity.map((row) => row.repName)).size
    const activeRepsScoped = new Set(scopedRows.map((row) => row.repName)).size
    const averageTicket =
      scopedRows.length > 0 ? scopedTotal / scopedRows.length : 0

    const scopedByRep = new Map()
    for (const row of scopedRows) {
      const key = row.repName
      scopedByRep.set(key, (scopedByRep.get(key) || 0) + Number(row.amount || 0))
    }
    let topRep = null
    for (const [repName, amount] of scopedByRep) {
      if (!topRep || amount > topRep.amount) topRep = { repName, amount }
    }

    const targetAmount = Number(summary?.teamTargetAmount || 0)
    const scopedProgressBase = selectedDate ? scopedTotal : monthTotal
    const targetProgressPct =
      targetAmount > 0
        ? Math.min(100, Math.round((scopedProgressBase / targetAmount) * 100))
        : null

    return {
      monthTotal,
      scopedTotal,
      activeRepsMonth,
      activeRepsScoped,
      averageTicket,
      topRep,
      targetAmount: targetAmount > 0 ? targetAmount : null,
      targetProgressPct,
      totalUsers: Array.isArray(summary?.members) ? summary.members.length : 0,
    }
  }, [dailyActivity, filteredRows, selectedDate, summary])

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Daily activity"
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={
        <ManagerHeader year={year} month={month} goPrev={goPrev} goNext={goNext} />
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-cyan-200/90 bg-cyan-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800/80">
            Sales total
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-cyan-950">
            {loading ? '—' : formatMoney(report.scopedTotal)}
          </p>
          <p className="mt-1 text-xs text-cyan-900/70">
            {selectedDate ? selectedDate : `${monthLabel(year, month)} (month)`}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200/90 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">
            Avg Sale Amount
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-950">
            {loading ? '—' : formatMoney(report.averageTicket)}
          </p>
          <p className="mt-1 text-xs text-emerald-900/70">
            Based on current table filter
          </p>
        </article>
        <article className="rounded-2xl border border-violet-200/90 bg-violet-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80">
            Top performer
          </p>
          <p className="mt-2 text-lg font-semibold text-violet-950">
            {loading ? '—' : report.topRep?.repName || '—'}
          </p>
          <p className="mt-1 text-xs font-medium tabular-nums text-violet-900/80">
            {loading || !report.topRep ? 'No entries' : formatMoney(report.topRep.amount)}
          </p>
        </article>
        <article className="rounded-2xl border border-amber-200/90 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
            Team users / Todays Sales
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-950">
            {loading ? '—' : `${report.totalUsers}/${report.activeRepsScoped}`}
          </p>
          <p className="mt-1 text-xs text-amber-900/70">
            Active this view, total this month: {loading ? '—' : report.activeRepsMonth}
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-0 shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Team daily entries</h2>
              <p className="mt-1 text-sm text-slate-500">
                Cards and table follow this date filter. Clear to view full-month report.
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:max-w-md sm:flex-row sm:items-center sm:gap-2">
              <label
                htmlFor="manager-daily-date"
                className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500"
              >
                Date
              </label>
              <input
                id="manager-daily-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:w-auto"
              />
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="min-h-[44px] shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:min-h-0"
              >
                Month
              </button>
            </div>
          </div>
        </div>
        {!loading && filteredRows.length > 0 ? (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
            <p className="text-xs text-slate-600">
              Showing <span className="font-semibold">{filteredRows.length}</span> logs from{' '}
              <span className="font-semibold">{report.activeRepsScoped}</span> reps
            </p>
          </div>
        ) : null}
        {loading ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">Loading…</p>
        ) : dailyActivity.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No daily entries for this month.</p>
        ) : filteredRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">
            No entries found for the selected date.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Rep</th>
                    <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-4 py-3 sm:px-6">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {formatSaleDate(row.saleDate)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="font-medium text-slate-900">{row.repName}</span>
                        <span className="ml-2 text-xs text-slate-500">{row.repPhone}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-slate-600 sm:px-6">
                        {row.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {filteredRows.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatSaleDate(row.saleDate)}
                      </p>
                      <p className="mt-1 font-medium text-slate-900">{row.repName}</p>
                      <p className="text-xs text-slate-500">{row.repPhone}</p>
                    </div>
                    <p className="shrink-0 text-right text-base font-semibold tabular-nums text-slate-900">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                  {row.note ? (
                    <p className="mt-2 text-sm text-slate-600">{row.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
