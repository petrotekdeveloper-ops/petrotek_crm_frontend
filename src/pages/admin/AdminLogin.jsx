import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import logo from '../../assets/logo.png'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Enter username and password.')
      return
    }
    setLoading(true)
    try {
      const { data } = await adminApi.post('/api/admin/login', {
        username: username.trim(),
        password,
      })
      if (data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token)
      }
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        const msg = err.response.data.error
        setError(typeof msg === 'string' ? msg : 'Sign in failed.')
      } else {
        setError('Network error. Is the API running?')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-10 text-slate-900 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 flex justify-center">
          <img
            src={logo}
            alt="Petrotek"
            className="block h-auto w-full max-w-[240px] object-contain sm:max-w-[280px]"
            width={280}
            height={105}
          />
        </div>
        <header className="mb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-800/90">
            CRM Admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Administrator sign in
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use the credentials configured for your server environment.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-username"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link to="/" className="font-medium text-red-800 hover:text-red-900">
            ← Back to app sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
