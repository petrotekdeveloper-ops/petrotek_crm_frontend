import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { financeApi, FINANCE_TOKEN_KEY } from '../../api'
import logo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'

function FinanceIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m0 0H21.75m-1.5 0H12m-8.25-3h7.5m-7.5 3h3m-3 4.5h7.5M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75M8.25 8.25v-1.5m0 1.5h-7.5m7.5 0v-1.5m-7.5 1.5h7.5m0 0v1.5m0-1.5H15"
      />
    </svg>
  )
}

export default function FinanceLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(FINANCE_TOKEN_KEY)) {
      navigate('/finance/sales-logs', { replace: true })
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
      const { data } = await financeApi.post('/api/finance/login', {
        username: username.trim(),
        password,
      })
      if (data.token) {
        localStorage.setItem(FINANCE_TOKEN_KEY, data.token)
      }
      navigate('/finance/sales-logs', { replace: true })
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
    <div className="min-h-[100dvh] bg-[#f4f6f9] text-slate-900 sm:min-h-screen">
      <div className="flex min-h-[100dvh] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:min-h-screen sm:px-6">
        <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center py-8 sm:py-10">
          <div className="mb-5 w-full">
            <div className="grid w-full grid-cols-2 items-center gap-4 sm:gap-5">
              <img
                src={logo}
                alt="Petrotek"
                className="h-auto max-h-[120px] w-full object-contain sm:max-h-[132px]"
                width={280}
                height={120}
              />
              <img
                src={seltecLogo}
                alt="Seltec"
                className="h-auto max-h-[96px] w-full object-contain sm:max-h-[108px]"
                width={280}
                height={96}
              />
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Customer relationship management
            </p>
          </div>

          <header className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-200/80 bg-red-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-900/90">
              <FinanceIcon className="h-3.5 w-3.5 shrink-0" />
              Finance
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Sign in to finance
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Use the finance credentials configured for your organization. This area is separate from
              staff sign-in.
            </p>
          </header>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="finance-username"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Username
                </label>
                <input
                  id="finance-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={fieldClass}
                  placeholder="Finance username"
                />
              </div>
              <div>
                <label
                  htmlFor="finance-password"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="finance-password"
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
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in to finance'}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
            By signing in you confirm you are authorized to access finance reporting.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <Link
              to="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
            >
              <span aria-hidden className="text-slate-400">
                ←
              </span>
              Staff portal sign in
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
            >
              Administration login
              <span aria-hidden className="text-slate-400">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
