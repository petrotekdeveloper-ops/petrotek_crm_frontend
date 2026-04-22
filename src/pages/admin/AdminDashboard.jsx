import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import logo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
const btnPrimary =
  'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
const btnSecondary =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50'
const actionIconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50'

const DESIGNATIONS = ['manager', 'sales', 'driver', 'service']
const ROLE_FILTERS = ['all', ...DESIGNATIONS]
const COMPANY_VALUES = ['Petrotek', 'Seltec']
/** Directory / approvals filter: all, or exact company (manager & sales rows only match). */
const COMPANY_FILTERS = ['all', ...COMPANY_VALUES]
const UAE_COUNTRY_CODE = '+971'
const UAE_LOCAL_DIGITS = 9

function normalizeUaeLocalPhoneInput(value) {
  let next = String(value ?? '')
  next = next.replace(/\+971/gi, '').replace(/\s+/g, '')
  let digits = next.replace(/\D/g, '')
  if (digits.startsWith('971')) {
    digits = digits.slice(3)
  }
  return digits.slice(0, UAE_LOCAL_DIGITS)
}

function extractUaeLocalPhone(phone) {
  if (!phone) return ''
  return normalizeUaeLocalPhoneInput(String(phone))
}

function formatDate(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString()
}

function formatDateTime(d) {
  if (!d) return '—'
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleString()
}

function dobInputValue(d) {
  if (!d) return ''
  const x = new Date(d)
  return Number.isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

function roleBadgeClass(designation) {
  const map = {
    manager: 'bg-violet-100 text-violet-900 ring-violet-200',
    sales: 'bg-sky-100 text-sky-900 ring-sky-200',
    driver: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
    service: 'bg-amber-100 text-amber-900 ring-amber-200',
  }
  return map[designation] ?? 'bg-slate-100 text-slate-800 ring-slate-200'
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
  const [phone, setPhone] = useState(extractUaeLocalPhone(initial?.phone))
  const [email, setEmail] = useState(initial?.email ?? '')
  const [dob, setDob] = useState(dobInputValue(initial?.dob))
  const [designation, setDesignation] = useState(initial?.designation ?? 'sales')
  const [vehicleNumber, setVehicleNumber] = useState(initial?.vehicleNumber ?? '')
  const [company, setCompany] = useState(initial?.company ?? 'Petrotek')
  const [managerId, setManagerId] = useState(
    initial?.managerId ? String(initial.managerId) : ''
  )
  const [password, setPassword] = useState('')
  const [approvalStatus, setApprovalStatus] = useState(
    initial?.approvalStatus ?? 'approved'
  )
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setName(initial?.name ?? '')
    setPhone(extractUaeLocalPhone(initial?.phone))
    setEmail(initial?.email ?? '')
    setDob(dobInputValue(initial?.dob))
    setDesignation(initial?.designation ?? 'sales')
    setVehicleNumber(initial?.vehicleNumber ?? '')
    setCompany(initial?.company ?? 'Petrotek')
    setManagerId(initial?.managerId ? String(initial.managerId) : '')
    setPassword('')
    setApprovalStatus(initial?.approvalStatus ?? 'approved')
    setFormError('')
  }, [initial])

  function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const localPhone = normalizeUaeLocalPhoneInput(phone)
    if (localPhone.length < 1 || localPhone.length > UAE_LOCAL_DIGITS) {
      setFormError('Enter a valid +971 phone number with up to 9 digits.')
      return
    }
    const fullPhone = `${UAE_COUNTRY_CODE}${localPhone}`
    const body = {
      name: name.trim(),
      phone: fullPhone,
      email: email.trim() || undefined,
      dob: dob || undefined,
      designation,
      company:
        designation === 'manager' || designation === 'sales'
          ? company
          : undefined,
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-900/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
          {formError ? (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-snug text-red-900 shadow-sm ring-1 ring-red-900/5"
            >
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <span>{formError}</span>
            </div>
          ) : null}
          <fieldset>
            <legend className="mb-2 block text-xs font-medium text-slate-600">Designation</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'sales', label: 'Sales' },
                { value: 'driver', label: 'Driver' },
                { value: 'service', label: 'Service' },
                { value: 'manager', label: 'Manager' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    designation === option.value
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="designation"
                    value={option.value}
                    checked={designation === option.value}
                    onChange={(e) => {
                      const value = e.target.value
                      setDesignation(value)
                      if (value !== 'driver') setVehicleNumber('')
                      if (value !== 'sales') setManagerId('')
                      if (value !== 'manager' && value !== 'sales') setCompany('Petrotek')
                    }}
                    className="h-4 w-4 accent-red-600"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700">
                {UAE_COUNTRY_CODE}
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(normalizeUaeLocalPhoneInput(e.target.value))}
                required
                inputMode="numeric"
                className={`${fieldClass} pl-16`}
                placeholder="5XXXXXXXX"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Leave blank if not available"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Date of birth <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={fieldClass}
            />
          </div>
          {designation === 'manager' || designation === 'sales' ? (
            <fieldset>
              <legend className="mb-2 block text-xs font-medium text-slate-600">Company</legend>
              <div className="grid grid-cols-2 gap-2">
                {COMPANY_VALUES.map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      company === value
                        ? value === 'Seltec'
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-red-500 bg-red-50 text-red-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="company"
                      value={value}
                      checked={company === value}
                      onChange={(e) => setCompany(e.target.value)}
                      className={`h-4 w-4 ${value === 'Seltec' ? 'accent-blue-600' : 'accent-red-600'}`}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
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
                <option value="">Select manager (optional)</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} — {m.phone}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                If selected, this sales user will be assigned for approval and reporting.
              </p>
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

function StatCard({ label, value, hint, accent, onClick }) {
  const accents = {
    red: {
      card: 'border-2 border-rose-300/90 from-rose-200/80 via-rose-100/70 to-red-200/70',
      iconWrap: 'bg-rose-600 text-white ring-2 ring-rose-300/80',
      glow: 'bg-rose-500/35',
    },
    indigo: {
      card: 'border-2 border-blue-300/90 from-blue-200/80 via-blue-100/70 to-indigo-200/70',
      iconWrap: 'bg-blue-600 text-white ring-2 ring-blue-300/80',
      glow: 'bg-blue-500/35',
    },
    amber: {
      card: 'border-2 border-amber-300/90 from-amber-200/80 via-amber-100/70 to-yellow-200/70',
      iconWrap: 'bg-amber-600 text-white ring-2 ring-amber-300/80',
      glow: 'bg-amber-500/35',
    },
    slate: {
      card: 'border-2 border-slate-300/90 from-slate-200/70 via-slate-100/70 to-slate-300/60',
      iconWrap: 'bg-slate-700 text-white ring-2 ring-slate-300/80',
      glow: 'bg-slate-500/30',
    },
  }
  const a = accents[accent] ?? accents.slate

  const iconByLabel = {
    'Total users': (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5V9H2v11h5m10 0v-2a3 3 0 00-3-3H10a3 3 0 00-3 3v2m10 0H7m9-11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    Managers: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.055 12.083 12.083 0 015.84 10.578L12 14z" />
      </svg>
    ),
    Sales: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 17l6-6 4 4 8-8M21 10V3h-7" />
      </svg>
    ),
    'Pending approval': (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l2.5 2.5M22 12A10 10 0 112 12a10 10 0 0120 0z" />
      </svg>
    ),
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative w-full overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-default sm:rounded-2xl sm:p-5 ${onClick ? 'cursor-pointer' : ''} ${a.card}`}
    >
      <div className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full blur-2xl sm:-right-8 sm:-top-8 sm:h-24 sm:w-24 ${a.glow}`} />
      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px] sm:tracking-[0.16em]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:mt-2 sm:text-3xl">
            {value}
          </p>
        </div>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 sm:h-9 sm:w-9 sm:rounded-xl ${a.iconWrap}`}>
          {iconByLabel[label] ?? iconByLabel['Total users']}
        </span>
      </div>
      {hint ? <p className="relative mt-2 text-[11px] text-slate-500 sm:mt-2.5 sm:text-xs">{hint}</p> : null}
    </button>
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
  const [viewUser, setViewUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  const managers = useMemo(
    () => users.filter((u) => u.designation === 'manager'),
    [users]
  )

  const pendingUsers = useMemo(
    () => users.filter((u) => u.approvalStatus === 'pending'),
    [users]
  )
  const managerNameById = useMemo(
    () =>
      new Map(
        users
          .filter((u) => u.designation === 'manager')
          .map((u) => [String(u._id), u.name || u.phone || '—'])
      ),
    [users]
  )

  const filteredUsers = useMemo(() => {
    let list = users
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.designation === roleFilter)
    }
    if (companyFilter !== 'all') {
      list = list.filter((u) => {
        const c =
          u.company != null && String(u.company).trim() !== ''
            ? String(u.company).trim()
            : null
        return c === companyFilter
      })
    }
    return list
  }, [users, roleFilter, companyFilter])

  const filteredPendingUsers = useMemo(() => {
    let list = pendingUsers
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.designation === roleFilter)
    }
    if (companyFilter !== 'all') {
      list = list.filter((u) => {
        const c =
          u.company != null && String(u.company).trim() !== ''
            ? String(u.company).trim()
            : null
        return c === companyFilter
      })
    }
    return list
  }, [pendingUsers, roleFilter, companyFilter])

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
        navigate('/', { replace: true })
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

  useEffect(() => {
    if (!banner) return
    const id = window.setTimeout(() => setBanner(''), 5500)
    return () => window.clearTimeout(id)
  }, [banner])

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
      const data = axios.isAxiosError(err) ? err.response?.data : null
      const msg = typeof data?.error === 'string' ? data.error : null
      const detail = typeof data?.detail === 'string' ? data.detail : ''
      setError(
        typeof msg === 'string'
          ? detail
            ? `${msg} ${detail}`
            : msg
          : 'Create failed.',
      )
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

  function openDeleteConfirm(user) {
    setError('')
    setViewUser(null)
    setEditUser(null)
    setDeleteUser(user)
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
    navigate('/', { replace: true })
  }

  if (!token) {
    return <Navigate to="/" replace />
  }

  return (
    <DashboardShell
      badge="Administration"
      title="Control center"
      subtitle="Users, roles, and approvals"
      secondaryLogoSrc={seltecLogo}
      secondaryLogoAlt="Seltec"
      user={{ name: 'Administrator' }}
      onLogout={logout}
      actionsPlacement="belowHeading"
      logoutConfirm={{
        enabled: true,
        title: 'Log out from admin panel?',
        message: 'You will be signed out from the admin panel and returned to the main login page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
      }}
      actions={<AdminSectionHeaderNav />}
    >
      {/* Toasts sit above user modals (z-50) and shell */}
      <div
        className="pointer-events-none fixed right-0 top-0 z-[110] flex max-h-screen w-full flex-col items-stretch gap-3 overflow-y-auto p-4 sm:max-w-md sm:items-end sm:p-6"
        aria-live="polite"
      >
        {error ? (
          <div
            role="alert"
            className="pointer-events-auto flex gap-3 rounded-2xl border border-red-200/90 bg-white/95 px-4 py-3 text-sm text-red-900 shadow-2xl shadow-red-900/10 ring-1 ring-red-900/5 backdrop-blur-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-0.5 leading-snug">
              {error}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
              aria-label="Dismiss"
              onClick={() => setError('')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
        {banner ? (
          <div
            role="status"
            className="pointer-events-auto flex gap-3 rounded-2xl border border-emerald-200/90 bg-white/95 px-4 py-3 text-sm text-emerald-950 shadow-2xl shadow-emerald-900/10 ring-1 ring-emerald-900/5 backdrop-blur-sm"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 pt-0.5 leading-snug">{banner}</div>
            <button
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-50"
              aria-label="Dismiss"
              onClick={() => setBanner('')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
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
          onClick={() => setTab('approvals')}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`flex-1 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ${
                tab === 'users'
                  ? 'bg-blue-700 text-white shadow-md'
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
                  ? 'bg-blue-700 text-white shadow-md'
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
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto lg:max-w-none">
            <div className="w-full min-w-0 sm:w-auto sm:min-w-[11rem]">
              <select
                id="admin-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={fieldClass}
              >
                {ROLE_FILTERS.map((role) => (
                  <option key={role} value={role}>
                    {role === 'all' ? 'All roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full min-w-0 sm:w-auto sm:min-w-[11rem]">
              <select
                id="admin-company-filter"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className={fieldClass}
              >
                {COMPANY_FILTERS.map((co) => (
                  <option key={co} value={co}>
                    {co === 'all' ? 'All companies' : co}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {tab === 'users' ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">User directory</h2>
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
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Company</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="transition hover:bg-slate-50/80">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-3.5 tabular-nums text-slate-600">{u.phone}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${roleBadgeClass(u.designation)}`}
                        >
                          {u.designation}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{u.company || '—'}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="View user"
                            aria-label={`View ${u.name}`}
                            className={actionIconBtn}
                            onClick={() => {
                              setError('')
                              setViewUser(u)
                            }}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Edit user"
                            aria-label={`Edit ${u.name}`}
                            className={actionIconBtn}
                            onClick={() => {
                              setError('')
                              setEditUser(u)
                            }}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Delete user"
                            aria-label={`Delete ${u.name}`}
                            className={`${actionIconBtn} border-red-100 text-red-700 hover:bg-red-50 hover:text-red-800`}
                            onClick={() => openDeleteConfirm(u)}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 ? (
                <p className="p-12 text-center text-slate-500">
                  {users.length === 0
                    ? 'No users yet. Add your first account.'
                    : 'No users found for the selected filters.'}
                </p>
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
          ) : filteredPendingUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-slate-800">All caught up</p>
              <p className="mt-1 text-sm text-slate-500">
                {pendingUsers.length === 0
                  ? 'No accounts waiting for approval.'
                  : 'No pending accounts for the selected filters.'}
              </p>
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
                  {filteredPendingUsers.map((u) => (
                    <tr key={u._id} className="transition hover:bg-amber-50/30">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{u.name}</td>
                      <td className="px-6 py-3.5 tabular-nums text-slate-600">{u.phone}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${roleBadgeClass(u.designation)}`}
                        >
                          {u.designation}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title="Approve"
                            aria-label={`Approve ${u.name}`}
                            disabled={saving}
                            className={`${actionIconBtn} border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800`}
                            onClick={() => setApproval(u, 'approved')}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            aria-label={`Reject ${u.name}`}
                            disabled={saving}
                            className={`${actionIconBtn} border-red-100 text-red-700 hover:bg-red-50 hover:text-red-800`}
                            onClick={() => setApproval(u, 'rejected')}
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
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
          onClose={() => {
            setCreateOpen(false)
            setError('')
          }}
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
          onClose={() => {
            setEditUser(null)
            setError('')
          }}
          onSubmit={handleEdit}
        />
      ) : null}

      {viewUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Petrotek" className="h-8 w-auto object-contain" />
                  <img src={seltecLogo} alt="Seltec" className="h-8 w-auto object-contain" />
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ${roleBadgeClass(viewUser.designation)}`}>
                  {viewUser.designation || '—'}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">User details</h3>
              <p className="mt-1 text-sm text-slate-500">Complete account profile and access controls.</p>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{viewUser.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                  <dd className="mt-1 text-sm text-slate-700">{viewUser.phone || '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="mt-1 text-sm text-slate-700">{viewUser.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date of birth</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatDate(viewUser.dob)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</dt>
                  <dd className="mt-1 text-sm text-slate-700">{viewUser.company || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Approval</dt>
                  <dd className="mt-1 text-sm text-slate-700">{viewUser.approvalStatus || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manager</dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {viewUser.managerId
                      ? managerNameById.get(String(viewUser.managerId)) || String(viewUser.managerId)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle number</dt>
                  <dd className="mt-1 text-sm text-slate-700">{viewUser.vehicleNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatDateTime(viewUser.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</dt>
                  <dd className="mt-1 text-sm text-slate-700">{formatDateTime(viewUser.updatedAt)}</dd>
                </div>
              </dl>

            </div>

            <div className="flex justify-end border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setViewUser(null)
                }}
                className={btnSecondary}
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-900">{deleteUser.name || '—'}</p>
              <p className="mt-1 text-slate-600">
                {deleteUser.designation || '—'} {deleteUser.company ? `· ${deleteUser.company}` : ''}
              </p>
            </div>
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
