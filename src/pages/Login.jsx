import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { api, TOKEN_KEY } from '../api'
import logo from '../assets/logo.png'
import seltecLogo from '../assets/seltecLogo.png'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/20'

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

function CloseIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function AdministrationIcon({ className }) {
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
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  )
}

function FinancePortalIcon({ className }) {
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

function LoginForm({ onLoggedIn }) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const normalizedLocal = normalizeUaeLocalPhoneInput(phone)
    const fullPhone = `${UAE_COUNTRY_CODE}${normalizedLocal}`
    if (normalizedLocal.length < 1 || normalizedLocal.length > UAE_LOCAL_DIGITS || !password) {
      setError('Enter a valid +971 phone number and password.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/api/users/login', {
        phone: fullPhone,
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
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700">
            {UAE_COUNTRY_CODE}
          </span>
          <input
            id="login-phone"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(normalizeUaeLocalPhoneInput(e.target.value))}
            placeholder="5XXXXXXXX"
            className={`${fieldClass} pl-16`}
          />
        </div>
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
  if (
    designation === 'driver' ||
    designation === 'service' ||
    designation === 'manager'
  ) {
    return 'Your account is pending approval from an administrator. You can sign in once your account has been approved.'
  }
  return 'Your account is pending approval from your manager or an administrator. You can sign in once your account has been approved.'
}

function RegisterForm({ onGoToLogin }) {
  const COMPANY_VALUES = ['Petrotek', 'Seltec']
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [designation, setDesignation] = useState('sales')
  const [company, setCompany] = useState('Petrotek')
  const [managerId, setManagerId] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
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
    const normalizedLocal = normalizeUaeLocalPhoneInput(phone)
    const fullPhone = `${UAE_COUNTRY_CODE}${normalizedLocal}`

    if (
      !String(name).trim() ||
      normalizedLocal.length < 1 ||
      normalizedLocal.length > UAE_LOCAL_DIGITS ||
      !password
    ) {
      setError('Please fill in name, a valid +971 phone number, password, and role.')
      return
    }

    setLoading(true)
    try {
      const body = {
        name: String(name).trim(),
        phone: fullPhone,
        designation,
        password,
      }
      const trimmedEmail = String(email).trim()
      if (trimmedEmail) body.email = trimmedEmail
      if (designation === 'manager' || designation === 'sales') {
        body.company = company
      }
      if (dob !== '') {
        body.dob = dob
      }
      if (designation === 'sales') {
        const mid = String(managerId).trim()
        if (mid) body.managerId = mid
      }
      if (designation === 'driver') {
        const vn = String(vehicleNumber).trim()
        if (vn) body.vehicleNumber = vn
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
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-slate-700">Role</legend>
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
                  const v = e.target.value
                  setDesignation(v)
                  if (v !== 'sales') setManagerId('')
                  if (v !== 'driver') setVehicleNumber('')
                  if (v !== 'manager' && v !== 'sales') setCompany('Petrotek')
                }}
                className="h-4 w-4 accent-red-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm font-medium text-slate-700">
            {UAE_COUNTRY_CODE}
          </span>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(normalizeUaeLocalPhoneInput(e.target.value))}
            className={`${fieldClass} pl-16`}
            placeholder="5XXXXXXXX"
          />
        </div>
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
          Date of birth{' '}
          <span className="font-normal text-slate-500">(optional)</span>
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

      {designation === 'manager' || designation === 'sales' ? (
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-700">Company</legend>
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
                className={fieldClass}
              >
                <option value="">Select your manager (optional)</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} — {m.phone}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                If selected, you will be assigned to this manager for approval and reporting.
              </p>
            </>
          )}
        </div>
      ) : null}

      {designation === 'driver' ? (
        <div>
          <label
            htmlFor="reg-vehicle-number"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Vehicle number
          </label>
          <input
            id="reg-vehicle-number"
            name="vehicleNumber"
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className={fieldClass}
            placeholder="e.g. KA 01 AB 1234"
          />
          <p className="mt-1 text-xs text-slate-500">Optional for driver registration.</p>
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
          disabled={loading}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Create account'}
        </button>
      )}
    </form>
  )
}

const secondaryActionClass =
  'flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200/50 bg-slate-50/60 px-3 py-2.5 text-left text-sm transition hover:border-slate-300/80 hover:bg-slate-100/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'

export default function Login({ onLoggedIn }) {
  const [view, setView] = useState('signin')

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      {view === 'register' ? (
        <button
          type="button"
          onClick={() => setView('signin')}
          aria-label="Close and return to sign in"
          className="fixed right-4 top-4 z-50 border-0 bg-transparent p-0 text-slate-500 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          <CloseIcon className="h-8 w-8" />
        </button>
      ) : null}

      {/* Dedicated left logo section on desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[min(54vw,760px)] lg:items-center lg:justify-center lg:border-r lg:border-slate-200/80 lg:bg-[#f4f6f9] lg:px-10 xl:px-14">
        <div className="w-full max-w-[620px]">
          <div className="grid w-full grid-cols-2 items-center gap-5 xl:gap-7">
            <img
              src={logo}
              alt="Petrotek"
              className="h-auto max-h-[min(400px,50vh)] w-full object-contain xl:max-h-[min(430px,54vh)]"
              width={560}
              height={240}
            />
            <img
              src={seltecLogo}
              alt="Seltec"
              className="h-auto max-h-[min(290px,36vh)] w-full object-contain opacity-95 xl:max-h-[min(320px,40vh)]"
              width={560}
              height={200}
            />
          </div>
          <p className="mt-6 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Customer relationship management
          </p>
        </div>
      </aside>

      {/* Form section */}
      <div className="flex min-h-screen flex-col px-4 pb-8 pt-16 sm:px-6 sm:pb-10 sm:pt-20 lg:ml-[min(54vw,760px)] lg:min-h-screen lg:overflow-y-auto lg:px-8 lg:pb-12 lg:pt-0">
        <div
          className={`mx-auto flex w-full min-w-0 flex-col max-lg:flex-none lg:mt-0 lg:max-w-none lg:flex-1 lg:justify-center ${
            view === 'register'
              ? 'mt-6 mx-auto max-w-[27rem] sm:mt-8 sm:max-w-[28rem] lg:mx-auto lg:mt-10 lg:w-[500px] lg:max-w-[500px] lg:shrink-0'
              : 'mx-auto max-w-[23rem] sm:max-w-[24rem] lg:mx-auto lg:w-[440px] lg:max-w-[440px] lg:shrink-0'
          }`}
        >
          <div className="mb-6 w-full lg:hidden">
            <div className="grid w-full grid-cols-2 items-center gap-3 sm:gap-5">
              <img
                src={logo}
                alt="Petrotek"
                className="h-auto max-h-[min(220px,30vh)] w-full object-contain"
                width={560}
                height={240}
              />
              <img
                src={seltecLogo}
                alt="Seltec"
                className="h-auto max-h-[min(160px,22vh)] w-full object-contain opacity-95"
                width={560}
                height={200}
              />
            </div>
            <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Customer relationship management
            </p>
          </div>

          <header className="mb-5 text-center sm:mb-6 lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-800/90">
              {view === 'signin' ? 'Staff portal' : 'Request access'}
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.35rem]">
              {view === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {view === 'signin'
                ? 'Use the phone number and password issued to you by your organization.'
                : 'Register as sales, driver, service, or manager. Your account must be approved before you can sign in.'}
            </p>
          </header>

          <div className="rounded-xl border border-slate-200/50 bg-white/70 p-5 shadow-sm backdrop-blur-sm sm:p-6">
            {view === 'signin' ? (
              <>
                <LoginForm onLoggedIn={onLoggedIn} />
                <div className="mt-7 space-y-3">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    New employees
                  </p>
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-blue-700 bg-blue-600 px-3 py-2.5 text-left text-sm text-white transition hover:border-blue-800 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                  >
                    <span>
                      <span className="block font-semibold text-white">
                        Request account access
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-blue-100">
                        Submit your details for manager or admin approval
                      </span>
                    </span>
                    <span className="shrink-0 text-blue-100" aria-hidden>
                      →
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <RegisterForm onGoToLogin={() => setView('signin')} />
            )}
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-500 lg:text-left">
            By continuing you agree to your organization&apos;s use of this
            application.
          </p>

          <div className="mt-6 flex w-full shrink-0 flex-col items-stretch justify-center gap-3 pb-4 sm:flex-row sm:flex-wrap sm:pb-6 lg:justify-start">
            <Link
              to="/finance/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/20 transition hover:border-emerald-800 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              <FinancePortalIcon className="h-5 w-5 shrink-0 opacity-95" />
              Finance login
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-900/20 transition hover:border-red-800 hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800"
            >
              <AdministrationIcon className="h-5 w-5 shrink-0 opacity-95" />
              Administration login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
