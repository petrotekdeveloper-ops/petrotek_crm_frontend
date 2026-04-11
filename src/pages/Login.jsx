import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { api, TOKEN_KEY } from '../api'
import logo from '../assets/logo.png'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'

function LoginForm({ onLoggedIn }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const trimmed = phone.trim()
    if (!trimmed || !password) {
      setError('Enter your phone number and password.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/api/users/login', {
        phone: trimmed,
        password,
      })

      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token)
      }
      onLoggedIn?.(data.user ?? null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const { error: apiError, code } = err.response.data
        if (typeof apiError === 'string') {
          setError(apiError)
        } else if (code === 'PHONE_NOT_REGISTERED') {
          setError('No account is registered with this phone number.')
        } else if (code === 'INVALID_PASSWORD') {
          setError('Incorrect password.')
        } else {
          setError('Sign in failed. Try again.')
        }
      } else {
        setError('Network error. Check that the server is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="login-phone"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Phone number
        </label>
        <input
          id="login-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +1 555 000 0000"
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
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
  )
}

function registrationApprovalSuccessMessage(designation) {
  if (designation === 'driver' || designation === 'manager') {
    return 'Your account is pending approval from an administrator. You can sign in once your account has been approved.'
  }
  return 'Your account is pending approval from your manager or an administrator. You can sign in once your account has been approved.'
}

function RegisterForm({ onGoToLogin }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [designation, setDesignation] = useState('sales')
  const [managerId, setManagerId] = useState('')
  const [managers, setManagers] = useState([])
  const [managersLoading, setManagersLoading] = useState(true)
  const [managersLoadError, setManagersLoadError] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadManagers() {
      setManagersLoading(true)
      setManagersLoadError('')
      try {
        const { data } = await api.get('/api/users/registration-managers')
        const list = Array.isArray(data?.managers) ? data.managers : []
        if (!cancelled) {
          setManagers(list)
        }
      } catch {
        if (!cancelled) {
          setManagers([])
          setManagersLoadError(
            'Could not load managers. Check your connection and try again.'
          )
        }
      } finally {
        if (!cancelled) setManagersLoading(false)
      }
    }
    loadManagers()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (
      !String(name).trim() ||
      !String(phone).trim() ||
      dob === '' ||
      !password
    ) {
      setError('Please fill in name, phone, date of birth, and password.')
      return
    }

    if (designation === 'sales') {
      if (managersLoading) {
        setError('Please wait while managers are loaded.')
        return
      }
      if (managersLoadError) {
        setError(managersLoadError)
        return
      }
      if (managers.length === 0) {
        setError('No managers are listed.')
        return
      }
      const mid = String(managerId).trim()
      if (!mid) {
        setError('Select the manager you report to.')
        return
      }
    }

    setLoading(true)
    try {
      const body = {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email === '' ? '' : String(email).trim(),
        dob,
        designation,
        password,
      }
      if (designation === 'sales') {
        body.managerId = String(managerId).trim()
      }

      await api.post('/api/users/register', body)
      setSuccess(registrationApprovalSuccessMessage(designation))
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        const msg = err.response.data.error
        setError(typeof msg === 'string' ? msg : 'Registration failed.')
      } else {
        setError('Network error. Check that the server is running.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="reg-name"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Full name
        </label>
        <input
          id="reg-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="reg-phone"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Phone number
        </label>
        <input
          id="reg-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="reg-email"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Email{' '}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="reg-dob"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Date of birth
        </label>
        <input
          id="reg-dob"
          name="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label
          htmlFor="reg-designation"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Role
        </label>
        <select
          id="reg-designation"
          name="designation"
          value={designation}
          onChange={(e) => {
            const v = e.target.value
            setDesignation(v)
            if (v !== 'sales') setManagerId('')
          }}
          className={fieldClass}
        >
          <option value="sales">Sales</option>
          <option value="driver">Driver</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {designation === 'sales' ? (
        <div>
          <label
            htmlFor="reg-manager-id"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Your manager
          </label>
          {managersLoading ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Loading managers…
            </p>
          ) : managersLoadError ? (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {managersLoadError}
            </p>
          ) : managers.length === 0 ? (
            <p
              role="status"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
            >
              No managers are listed.
            </p>
          ) : (
            <>
              <select
                id="reg-manager-id"
                name="managerId"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select your manager</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} — {m.phone}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                You will be assigned to this manager for approval and reporting.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="reg-password"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="reg-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
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

      {success ? (
        <div className="space-y-3">
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900"
          >
            <p className="font-semibold text-emerald-950">Registration successful</p>
            <p className="mt-1.5 leading-relaxed">{success}</p>
          </div>
          <button
            type="button"
            onClick={() => onGoToLogin?.()}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={
            loading ||
            (designation === 'sales' &&
              (managersLoading ||
                !!managersLoadError ||
                managers.length === 0))
          }
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Create account'}
        </button>
      )}
    </form>
  )
}

export default function Login({ onLoggedIn }) {
  const [panel, setPanel] = useState('login')

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      {/* Desktop: fixed white brand column — does not scroll */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[min(560px,50vw)] lg:shrink-0 lg:flex-col lg:items-center lg:justify-center lg:border-r lg:border-slate-200 lg:bg-white lg:px-10 xl:px-14">
        <div className="flex w-full max-w-[400px] flex-col items-center text-center">
          <img
            src={logo}
            alt="Petrotek"
            className="block h-auto w-full max-w-[360px] object-contain xl:max-w-[400px]"
            width={400}
            height={150}
          />
          <p className="-mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Customer relationship management
          </p>
          
        </div>
      </aside>

      {/* Desktop: only this column scrolls (long registration form). Mobile: full page scrolls. */}
      <div className="flex min-h-screen flex-col lg:ml-[min(560px,50vw)] lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden">
        <div className="flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:justify-start lg:px-12 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-md pb-8">
            <header className="mb-4 lg:mb-6">
              <div className="mb-3 flex justify-center lg:hidden">
                <img
                  src={logo}
                  alt="Petrotek"
                  className="block h-auto w-full max-w-[220px] object-contain"
                  width={220}
                  height={88}
                />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {panel === 'login' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {panel === 'login'
                  ? 'Sign in with your phone number and password.'
                  : 'Register as sales or driver. Approval is required before you can sign in.'}
              </p>
            </header>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/40 sm:p-8">
              <div
                className="mb-6 flex rounded-xl border border-slate-200 bg-slate-50/80 p-1"
                role="tablist"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'login'}
                  onClick={() => setPanel('login')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    panel === 'login'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'register'}
                  onClick={() => setPanel('register')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    panel === 'register'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create account
                </button>
              </div>

              {panel === 'login' ? (
                <LoginForm onLoggedIn={onLoggedIn} />
              ) : (
                <RegisterForm onGoToLogin={() => setPanel('login')} />
              )}
            </div>

            <p className="mt-8 text-center text-xs leading-relaxed text-slate-500">
              By continuing you agree to your organization&apos;s use of this
              application.{' '}
              <Link
                to="/admin/login"
                className="font-medium text-red-800 hover:text-red-900 hover:underline"
              >
                Administrator login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
