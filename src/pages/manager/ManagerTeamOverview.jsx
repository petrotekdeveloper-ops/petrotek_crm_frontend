import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { formatMoney } from '../../lib/format.js'
import { useMonthState } from '../../hooks/useMonthState.js'

const card =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02]'

export default function ManagerTeamOverview({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get(`/api/manager/team-summary?${ymQuery}`)
      setMembers(Array.isArray(data?.members) ? data.members : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else {
        setError('Could not load sales users.')
      }
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Sales users"
      subtitle="Targets and roster"
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

      <section className={card}>
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/95 to-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Team directory
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                All sales users
              </h2>
            </div>
            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:px-3 sm:py-2 sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total users
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 sm:text-base">
                {members.length}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center sm:px-6 sm:py-14">
            <p className="text-sm font-medium text-slate-600">Loading sales users…</p>
            <p className="mt-1 text-xs text-slate-500">Please wait while we fetch your roster.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="px-4 py-12 text-center sm:px-6 sm:py-14">
            <p className="text-sm font-medium text-slate-700">
              No approved sales users are assigned to you yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Once users are approved and mapped to your team, they will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Sales user</th>
                    <th className="px-4 py-3 sm:px-6">Phone</th>
                    <th className="px-4 py-3 text-right sm:px-6">Target</th>
                    <th className="px-4 py-3 text-right sm:px-6">Month sales</th>
                    <th className="px-4 py-3 text-right sm:px-6">Remaining</th>
                    <th className="px-4 py-3 text-right sm:px-6"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 sm:px-6">
                        <p className="font-semibold text-slate-900">{m.name}</p>
                        {m.hasTarget ? (
                          <p className="mt-0.5 text-[11px] font-medium text-emerald-700">
                            Target set
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                            No target yet
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 sm:px-6">
                        {m.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {m.targetAmount != null ? formatMoney(m.targetAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800 sm:px-6">
                        {formatMoney(m.myTotalSales ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-800 sm:px-6">
                        {m.remaining != null ? formatMoney(m.remaining) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <Link
                          to={`/manager/team/rep/${m.userId}`}
                          state={{
                            repName: m.name,
                            repPhone: m.phone,
                            repUserId: m.userId,
                          }}
                          className="inline-block min-h-[44px] py-2 text-sm font-medium text-red-700 hover:text-red-900 sm:min-h-0 sm:py-0"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {members.map((m) => (
                <li key={m.userId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">Phone</p>
                      <p className="text-sm tabular-nums text-slate-700">{m.phone || '—'}</p>
                      {m.hasTarget ? (
                        <p className="mt-1 text-[11px] font-medium text-emerald-700">Target set</p>
                      ) : (
                        <p className="mt-1 text-[11px] font-medium text-amber-700">
                          No target yet
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/manager/team/rep/${m.userId}`}
                      state={{
                        repName: m.name,
                        repPhone: m.phone,
                        repUserId: m.userId,
                      }}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-slate-50"
                    >
                      Details
                    </Link>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Target</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-900">
                        {m.targetAmount != null ? formatMoney(m.targetAmount) : '—'}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Sales</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-slate-900">
                        {formatMoney(m.myTotalSales ?? 0)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <dt className="font-semibold uppercase tracking-wide text-slate-500">Left</dt>
                      <dd className="mt-0.5 tabular-nums font-medium text-indigo-800">
                        {m.remaining != null ? formatMoney(m.remaining) : '—'}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
