import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import EnquiriesPage, { MonthPicker } from '../../features/enquiries/EnquiriesPage.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { monthLabel } from '../../lib/format.js'
import seltecLogo from '../../assets/seltecLogo.png'

export default function AdminEnquiries() {
  const navigate = useNavigate()
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  const { year, month } = useMonthState()

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userQuery, setUserQuery] = useState('')

  const extraQuery = selectedUserId ? `createdById=${selectedUserId}` : ''

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    const eligible = users.filter((u) => ['sales', 'manager'].includes(u.designation))
    if (!q) return eligible.slice(0, 8)
    return eligible
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
      const { data } = await adminApi.get('/api/admin/sales-users')
      setUsers(Array.isArray(data?.salesUsers) ? data.salesUsers : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
      }
    }
  }, [navigate])

  useEffect(() => {
    if (!token) return
    loadUsers()
  }, [loadUsers, token])

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  const creatorFilter = (
    <div className="relative min-w-0 sm:min-w-[18rem] sm:max-w-xs">
      <input
        id="admin-enq-user"
        type="text"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
        placeholder="All creators"
        value={userQuery}
        onChange={(e) => {
          setUserQuery(e.target.value)
          setSelectedUserId('')
        }}
        autoComplete="off"
      />
      {userQuery.trim() && filteredUsers.length > 0 && !selectedUserId ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filteredUsers.map((u) => (
            <li key={u._id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setSelectedUserId(u._id)
                  setUserQuery(u.name || u.phone || u._id)
                }}
              >
                <span className="font-medium text-slate-900">{u.name || '—'}</span>
                <span className="ml-2 text-xs capitalize text-slate-500">{u.designation}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )

  return (
    <EnquiriesPage
      user={{ name: 'Administrator', phone: '' }}
      onLogout={() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY)
        navigate('/admin/login', { replace: true })
      }}
      apiBasePath="/api/admin/enquiries"
      apiClient={adminApi}
      readOnly
      showCreatedBy
      extraQuery={extraQuery}
      sectionExtra={creatorFilter}
      header={<AdminSectionHeaderNav />}
      shellProps={{
        badge: 'Administration',
        title: 'Enquiries',
        subtitle: `Read-only view of all enquiries · ${monthLabel(year, month)}`,
        secondaryLogoSrc: seltecLogo,
        secondaryLogoAlt: 'Seltec',
      }}
      renderMonthControl={(props) => <MonthPicker {...props} />}
    />
  )
}
