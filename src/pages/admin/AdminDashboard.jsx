import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
const btnPrimary =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50'
const btnDanger =
  'rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50'
const btnGhost =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-800 shadow-sm transition hover:bg-red-50'
const btnGhostDanger =
  'rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50'

const DESIGNATIONS = ['manager', 'sales', 'driver', 'service']

function formatDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString()
}

function dobInputValue(d) {
  if (!d) return ''
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

function UserModal({
  title,
  initial,
  managers,
  onClose,
  onSubmit,
  loading,
  isEdit,
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [dob, setDob] = useState(dobInputValue(initial?.dob))
  const [designation, setDesignation] = useState(initial?.designation ?? 'sales')
  const [vehicleNumber, setVehicleNumber] = useState(initial?.vehicleNumber ?? '')
  const [managerId, setManagerId] = useState(
    initial?.managerId ? String(initial.managerId) : ''
  )
  const [password, setPassword] = useState('')
  const [approvalStatus, setApprovalStatus] = useState(
    initial?.approvalStatus ?? 'approved'
  )

  useEffect(() => {
    setName(initial?.name ?? '')
    setPhone(initial?.phone ?? '')
    setEmail(initial?.email ?? '')
    setDob(dobInputValue(initial?.dob))
    setDesignation(initial?.designation ?? 'sales')
    setVehicleNumber(initial?.vehicleNumber ?? '')
    setManagerId(initial?.managerId ? String(initial.managerId) : '')
    setPassword('')
    setApprovalStatus(initial?.approvalStatus ?? 'approved')
  }, [initial])

  function handleSubmit(e) {
    e.preventDefault()
    const body = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      dob,
      designation,
      vehicleNumber:
        designation === 'driver' && vehicleNumber.trim()
          ? vehicleNumber.trim()
          : undefined,
      managerId:
        designation === 'sales' && managerId.trim()
          ? managerId.trim()
          : null,
    }
    if (isEdit) {
      if (password.trim()) body.password = password.trim()
      body.approvalStatus = approvalStatus
      onSubmit(body)
    } else {
      body.password = password
      onSubmit(body)
    }
  }

  const needManager = designation === 'sales'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-900/10"
        role="dialog"
        aria-labelledby="user-modal-title"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2
            id="user-modal-title"
            className="text-lg font-semibold tracking-tight text-slate-900"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit ? 'Update account details and access.' : 'Create a new CRM user account.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Date of birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Designation
            </label>
            <select
              value={designation}
              onChange={(e) => {
                const value = e.target.value
                setDesignation(value)
                if (value !== 'driver') setVehicleNumber('')
              }}
              className={fieldClass}
            >
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {designation === 'driver' ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Vehicle number
              </label>
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className={fieldClass}
                required
              />
            </div>
          ) : null}
          {needManager ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Manager
              </label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className={fieldClass}
              >
                <option value="">— Select manager —</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.phone})
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {isEdit ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Approval status
              </label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className={fieldClass}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              {isEdit ? 'New password (leave blank to keep)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              className={fieldClass}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={btnPrimary}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, hint, accent }) {
  const accents = {
    red: 'from-red-500/10 to-red-600/5 border-red-200/60',
    indigo: 'from-indigo-500/10 to-indigo-600/5 border-indigo-200/60',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-200/60',
    slate: 'from-slate-500/5 to-slate-600/5 border-slate-200/80',
  }
  const a = accents[accent] ?? accents.slate
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${a}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('users')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState('')

  const managers = useMemo(
    () => users.filter((u) => u.designation === 'manager'),
    [users]
  )

  const pendingUsers = useMemo(
    () => users.filter((u) => u.approvalStatus === 'pending'),
    [users]
  )

  const stats = useMemo(() => {
    const total = users.length
    const mgr = users.filter((u) => u.designation === 'manager').length
    const sales = users.filter((u) => u.designation === 'sales').length
    const pending = pendingUsers.length
    return { total, mgr, sales, pending }
  }, [users, pendingUsers.length])

  const loadUsers = useCallback(async () => {
    setError('')
    try {
      const { data } = await adminApi.get('/api/admin/users')
      setUsers(data.users ?? [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
        return
      }
      setError('Failed to load users.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function handleCreate(body) {
    setSaving(true)
    setBanner('')
    setError('')
    try {
      await adminApi.post('/api/admin/users', body)
      setBanner('User created successfully.')
      setCreateOpen(false)
      await loadUsers()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(body) {
    if (!editUser) return
    setSaving(true)
    setBanner('')
    setError('')
    try {
      await adminApi.put(`/api/admin/users/${editUser._id}`, body)
      setBanner('User updated successfully.')
      setEditUser(null)
      await loadUsers()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteUser) return
    setSaving(true)
    setError('')
    try {
      await adminApi.delete(`/api/admin/users/${deleteUser._id}`)
      setBanner('User removed from the system.')
      setDeleteUser(null)
      await loadUsers()
    } catch {
      setError('Delete failed.')
    } finally {
      setSaving(false)
    }
  }

  async function setApproval(user, status) {
    setSaving(true)
    setBanner('')
    setError('')
    try {
      await adminApi.put(`/api/admin/users/${user._id}`, {
        approvalStatus: status,
      })
      setBanner(
        status === 'approved'
          ? 'Account approved.'
          : 'Account rejected.'
      )
      await loadUsers()
    } catch {
      setError('Could not update approval.')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/admin/login', { replace: true })
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <DashboardShell
      badge="Administration"
      title="Control center"
      subtitle="Users, roles, and approvals"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actions={<AdminSectionHeaderNav />}
    >
      {banner ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 shadow-sm"
        >
          {banner}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm"
        >
          {error}{' '}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={loading ? '…' : stats.total}
          hint="All roles in CRM"
          accent="slate"
        />
        <StatCard
          label="Managers"
          value={loading ? '…' : stats.mgr}
          hint="Team leads"
          accent="red"
        />
        <StatCard
          label="Sales"
          value={loading ? '…' : stats.sales}
          hint="Sales representatives"
          accent="indigo"
        />
        <StatCard
          label="Pending approval"
          value={loading ? '…' : stats.pending}
          hint="Awaiting review"
          accent="amber"
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ${
            tab === 'users'
              ? 'bg-red-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Directory
        </button>
        <button
          type="button"
          onClick={() => setTab('approvals')}
          className={`relative flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ${
            tab === 'approvals'
              ? 'bg-red-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          Approvals
          {pendingUsers.length > 0 ? (
            <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">
              {pendingUsers.length}
            </span>
          ) : null}
        </button>
      </div>

      {tab === 'users' ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">User directory</h2>
              <p className="text-sm text-slate-500">
                Search and manage accounts across your organization
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError('')
                setCreateOpen(true)
              }}
              className={btnPrimary}
            >
              Add user
            </button>
          </div>
          {loading ? (
            <p className="p-12 text-center text-slate-500">Loading directory…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u._id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-3.5 tabular-nums text-slate-600">{u.phone}</td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-800">
                          {u.designation}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-900'
                              : u.approvalStatus === 'pending'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {u.approvalStatus ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => {
                            setError('')
                            setEditUser(u)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${btnGhostDanger} ml-2`}
                          onClick={() => setDeleteUser(u)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 ? (
                <p className="p-12 text-center text-slate-500">No users yet. Add your first account.</p>
              ) : null}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-base font-semibold text-slate-900">Pending approvals</h2>
            <p className="text-sm text-slate-500">
              Review and activate new registrations
            </p>
          </div>
          {loading ? (
            <p className="p-12 text-center text-slate-500">Loading…</p>
          ) : pendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-slate-800">All caught up</p>
              <p className="mt-1 text-sm text-slate-500">No accounts waiting for approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-amber-50/50 text-xs font-semibold uppercase tracking-wide text-amber-900/70">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Registered</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/80">
                  {pendingUsers.map((u) => (
                    <tr key={u._id} className="transition hover:bg-amber-50/30">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-3.5 tabular-nums text-slate-600">{u.phone}</td>
                      <td className="px-6 py-3.5">
                        <span className="rounded-md bg-white px-2 py-0.5 text-xs font-medium capitalize text-slate-800 ring-1 ring-slate-200">
                          {u.designation}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={saving}
                          className={`${btnPrimary} mr-2`}
                          onClick={() => setApproval(u, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          className={btnDanger}
                          onClick={() => setApproval(u, 'rejected')}
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {createOpen ? (
        <UserModal
          key="create"
          title="Create user"
          initial={null}
          managers={managers}
          isEdit={false}
          loading={saving}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      ) : null}

      {editUser ? (
        <UserModal
          key={editUser._id}
          title="Edit user"
          initial={editUser}
          managers={managers}
          isEdit
          loading={saving}
          onClose={() => setEditUser(null)}
          onSubmit={handleEdit}
        />
      ) : null}

      {deleteUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Delete user?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This permanently removes{' '}
              <strong className="text-slate-900">{deleteUser.name}</strong> ({deleteUser.phone}
              ). This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteUser(null)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
