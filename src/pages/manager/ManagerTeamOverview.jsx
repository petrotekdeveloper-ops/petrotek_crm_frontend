import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader from '../../components/ManagerHeader.jsx'
import { getCurrentYearMonth } from '../../hooks/useMonthState.js'

const card =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02]'

export default function ManagerTeamOverview({ user, onLogout }) {
  const { year, month } = useMemo(() => getCurrentYearMonth(), [])
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
      badge="Manager workspace"
      title="Sales users"
      subtitle="List of all approved sales users assigned to you"
      user={user}
      onLogout={onLogout}
      actions={<ManagerHeader />}
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
        <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/95 to-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Team directory
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                All sales users
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                Select a user to open their individual profile and daily activity log.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total users
              </p>
              <p className="text-base font-semibold tabular-nums text-slate-900">{members.length}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-600">Loading sales users…</p>
            <p className="mt-1 text-xs text-slate-500">Please wait while we fetch your roster.</p>
          </div>
        ) : members.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-700">
              No approved sales users are assigned to you yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Once users are approved and mapped to your team, they will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100/90">
            {members.map((m) => (
              <li key={m.userId}>
                <Link
                  to={`/manager/team/rep/${m.userId}`}
                  state={{ repName: m.name, repPhone: m.phone, repUserId: m.userId }}
                  className="group flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-red-600"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-semibold uppercase tracking-wide text-red-900">
                      {String(m.name || '')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join('') || 'SU'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900 group-hover:text-red-900">
                        {m.name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{m.phone}</p>
                    </div>
                  </div>
                  <span
                    className="shrink-0 text-sm font-medium text-slate-400 transition group-hover:text-red-800"
                    aria-hidden
                  >
                    View details →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardShell>
  )
}
