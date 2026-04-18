import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { adminApi, ADMIN_TOKEN_KEY } from '../../api'
import logo from '../../assets/logo.png'

const fieldClass =
  'w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 sm:min-h-0 sm:text-sm'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(ADMIN_TOKEN_KEY)) {
      navigate('/admin/sales-logs', { replace: true })
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
      navigate('/admin/sales-logs', { replace: true })
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
    <div className="flex min-h-[100dvh] flex-col bg-[#f4f6f9] pt-6 text-slate-900 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:min-h-screen sm:justify-center sm:pt-12 sm:pb-[max(3rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md flex-1 sm:flex-none">
        <div className="mb-3 flex justify-center px-0 sm:mb-4">
          <img
            src={logo}
            alt="Petrotek"
            className="block h-auto w-full max-w-[min(240px,85vw)] object-contain sm:max-w-[280px]"
            width={280}
            height={105}
          />
        </div>
        <header className="mb-4 px-0 text-center sm:mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-800/90 sm:text-xs">
            CRM Admin
          </p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:mt-2 sm:text-2xl">
            Administrator sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-2.5">
            Use the credentials configured for your server environment.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
                  className={`${fieldClass} pr-[4.75rem] sm:pr-20`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md px-2 text-sm font-medium text-red-800 hover:bg-red-50 sm:right-2 sm:min-h-0 sm:min-w-0 sm:py-1 sm:text-xs"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            {error ? (
              <p
                role="alert"
                className="break-words rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0 sm:py-2.5"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 sm:mt-8">
          <Link
            to="/"
            className="inline-flex min-h-[44px] items-center justify-center font-medium text-red-800 hover:text-red-900 sm:min-h-0"
          >
            ← Back to app sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
