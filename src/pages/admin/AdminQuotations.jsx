import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { monthLabel } from '../../lib/format.js'
import {
  formatQuotationDate,
  ownerDisplayName,
  primaryCustomerName,
} from '../../lib/quotationForm.js'
import { QuotationDetailView, MonthPicker } from '../quotations/QuotationsPage.jsx'
import { btnGhost } from '../../lib/salesFormStyles.js'

export default function AdminQuotations() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { year, month, goPrev, goNext } = useMonthState()

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(null)

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])
  const monthPicker = <MonthPicker year={year} month={month} goPrev={goPrev} goNext={goNext} />

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users.slice(0, 8)
    return users
      .filter((u) => {
        const name = String(u?.name || '').toLowerCase()
        const phone = String(u?.phone || '').toLowerCase()
        const role = String(u?.designation || '').toLowerCase()
        return name.includes(q) || phone.includes(q) || role.includes(q)
      })
      .slice(0, 8)
  }, [userQuery, users])

  const loadUsers = useCallback(async () => {
    try {
      const [salesRes, serviceRes] = await Promise.all([
        adminApi.get('/api/admin/sales-users'),
        adminApi.get('/api/admin/service-users'),
      ])
      const salesUsers = Array.isArray(salesRes.data?.salesUsers) ? salesRes.data.salesUsers : []
      const serviceUsers = Array.isArray(serviceRes.data?.serviceUsers)
        ? serviceRes.data.serviceUsers
        : []
      const merged = [...salesUsers, ...serviceUsers].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      setUsers(merged)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
      }
    }
  }, [navigate])

  const loadQuotations = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const userPart = selectedUserId ? `&salesUserId=${selectedUserId}` : ''
      const { data } = await adminApi.get(`/api/admin/quotations?${ymQuery}${userPart}`)
      setQuotations(Array.isArray(data?.quotations) ? data.quotations : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
        return
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not load quotations.')
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }, [navigate, selectedUserId, ymQuery])

  useEffect(() => {
    if (!token) return
    loadUsers()
  }, [loadUsers, token])

  useEffect(() => {
    if (!token) return
    loadQuotations()
  }, [loadQuotations, token])

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <DashboardShell
      badge="Admin"
      title="Quotations"
      subtitle={`Read-only view of user quotations · ${monthLabel(year, month)}`}
      user={{ name: 'Administrator', phone: '' }}
      onLogout={() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
      }}
      actionsPlacement="belowHeading"
      actions={
        <div className="flex w-full min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <AdminSectionHeaderNav />
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
            {monthPicker}
            <div className="relative min-w-0 sm:min-w-[18rem] sm:flex-1 xl:max-w-xs">
              <label htmlFor="admin-q-user" className="mb-1 block text-xs font-medium text-slate-600">
                Filter by user
              </label>
              <input
                id="admin-q-user"
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                placeholder="All users"
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value)
                  setSelectedUserId('')
                }}
                onFocus={() => {}}
                autoComplete="off"
              />
              {userQuery.trim() && filteredUsers.length > 0 && !selectedUserId ? (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <li>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedUserId('')
                        setUserQuery('')
                      }}
                    >
                      All users
                    </button>
                  </li>
                  {filteredUsers.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setSelectedUserId(u._id)
                          setUserQuery(`${u.name} (${u.phone}) · ${u.designation}`)
                        }}
                      >
                        {u.name} ({u.phone}) · {u.designation}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      }
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Submitted quotations</h2>
          <p className="mt-1 text-sm text-slate-500">{monthLabel(year, month)}</p>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">Loading…</p>
        ) : quotations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
            No quotations found for this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-6">Date</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">User</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Quote no.</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Customer</th>
                  <th className="px-4 py-3 font-semibold sm:px-6">Ref</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-6">Total</th>
                  <th className="px-4 py-3 text-right font-semibold sm:px-6">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((row) => (
                  <tr key={row._id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                      {formatQuotationDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 sm:px-6">
                      {ownerDisplayName(row.salesUserId)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 sm:px-6">{row.quoteNo || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 sm:px-6">{primaryCustomerName(row)}</td>
                    <td className="px-4 py-3 text-slate-700 sm:px-6">{row.ref || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                      {row.total || '—'}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <button type="button" className={btnGhost} onClick={() => setViewing(row)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Quotation details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {viewing.quoteNo || '—'} · {ownerDisplayName(viewing.salesUserId)}
                </p>
              </div>
              <button type="button" className={btnGhost} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
            <QuotationDetailView quotation={viewing} />
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
