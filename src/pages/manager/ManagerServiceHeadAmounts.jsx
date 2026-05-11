import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { monthLabel } from '../../lib/format.js'
import { useMonthState } from '../../hooks/useMonthState.js'

const card =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02]'

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function formatAmount(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n))
}

export default function ManagerServiceHeadAmounts({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    try {
      const { data } = await api.get(`/api/manager/service-head-amount-logs?${params.toString()}`)
      setLogs(Array.isArray(data?.logs) ? data.logs : [])
      setSummary(data?.summary ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else {
        setError('Could not load service head amount logs.')
      }
      setLogs([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  const totalAmount = Number(summary?.totalAmount ?? 0)
  const logCount = Number(summary?.logCount ?? 0)

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Service head amounts"
      subtitle={
        <span className="block max-w-full break-words leading-snug">
          Amount entries from field service heads · {monthPill}
        </span>
      }
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
          className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            className="min-h-[44px] shrink-0 self-start rounded-lg border border-red-200/80 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100/80 sm:min-h-0 sm:self-auto"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <article className="min-w-0 rounded-2xl border border-amber-200/90 bg-amber-50 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
            Total amount
          </p>
          <p className="mt-2 break-all text-xl font-semibold tabular-nums text-amber-950 sm:break-normal sm:text-2xl">
            {loading ? '—' : formatAmount(totalAmount)}
          </p>
          <p className="mt-1 break-words text-xs text-amber-900/70">Sum for {monthPill}</p>
        </article>
        <article className="min-w-0 rounded-2xl border border-cyan-200/90 bg-cyan-50 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900/80">
            Entries with amount
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-cyan-950 sm:text-2xl">
            {loading ? '—' : String(logCount)}
          </p>
          <p className="mt-1 text-xs text-cyan-900/70">Logs in {monthPill}</p>
        </article>
      </section>

      <section className={`min-w-0 ${card}`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Amount log lines</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
            Date, service head, and recorded amount (read-only).
          </p>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
            <p className="text-sm text-slate-600">Loading…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-12 text-center ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
            <p className="font-medium text-slate-800">No amount logs for this selection</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Try another month, or there are no amount entries from service heads yet.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {logs.map((row) => (
                <li
                  key={row._id}
                  className="px-4 py-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {formatDate(row.date)}
                  </p>
                  <p className="mt-2 break-words text-base font-semibold leading-snug text-slate-900">
                    {row.serviceUserName}
                  </p>
                  <p className="mt-0.5 break-all text-sm text-slate-500">{row.serviceUserPhone}</p>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-500">Amount</span>
                    <p className="text-right text-xl font-bold tabular-nums tracking-tight text-amber-900">
                      {formatAmount(row.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Service head</th>
                    <th className="px-4 py-3 text-right font-bold sm:px-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-800 sm:px-6">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <p className="font-medium text-slate-900">{row.serviceUserName}</p>
                        <p className="text-xs text-slate-500">{row.serviceUserPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-amber-900 sm:px-6">
                        {formatAmount(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
