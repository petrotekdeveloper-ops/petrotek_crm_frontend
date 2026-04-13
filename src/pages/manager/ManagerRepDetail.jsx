import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader from '../../components/ManagerHeader.jsx'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import { useMonthState } from '../../hooks/useMonthState.js'

export default function ManagerRepDetail({ user, onLogout }) {
  const { repId } = useParams()
  const { state } = useLocation()
  const { year, month, goPrev, goNext } = useMonthState()
  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const monthPicker = (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={goPrev}
        className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white"
      >
        ←
      </button>
      <span className="min-w-[8rem] text-center text-sm font-medium text-slate-800">
        {monthLabel(year, month)}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white"
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
      <div className="mb-6">
        <Link
          to="/manager/team"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
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
        <div className="rounded-2xl border border-slate-200/90 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Loading selected user details...
          </p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-semibold tracking-wide text-red-900">
                  {initials || 'SU'}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    User profile
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
                    {selectedUser.name}
                  </h2>
                  <p className="text-sm text-slate-600">{selectedUser.phone || '—'}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Month total
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatMoney(data?.monthTotal ?? 0)}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.02]">
            <div className="border-b border-slate-100 bg-slate-50/90 px-6 py-5">
              <h3 className="text-base font-semibold tracking-tight text-slate-900">
                Daily activity
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Logs for {selectedUser.name} in {monthLabel(year, month)}
              </p>
            </div>

            {rows.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm leading-relaxed text-slate-500">
                No daily logs found for this user in this month.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5 text-right">Amount</th>
                      <th className="px-6 py-3.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row._id} className="bg-white transition hover:bg-slate-50/90">
                        <td className="whitespace-nowrap px-6 py-3.5 font-medium text-slate-900">
                          {formatSaleDate(row.saleDate)}
                        </td>
                        <td className="px-6 py-3.5 text-right text-sm font-semibold tabular-nums text-red-900">
                          {formatMoney(row.amount)}
                        </td>
                        <td className="max-w-md px-6 py-3.5 text-slate-600">
                          <span className="line-clamp-2">{row.note?.trim() || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  )
}
