import { useEffect, useRef, useState } from 'react'
import logo from '../assets/logo.png'

function TitleBlock({ badge, title, subtitle }) {
  return (
    <div className="min-w-0">
      {badge ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-900/75">
          {badge}
        </p>
      ) : null}
      <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
        {title}
      </h1>
      {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  )
}

function UserActions({ user, onLogout }) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <div className="text-right">
        <p className="max-w-[10rem] truncate text-sm font-medium text-slate-900 sm:max-w-none">
          {user?.name}
        </p>
        {user?.phone ? <p className="text-xs text-slate-500">{user.phone}</p> : null}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  )
}

function LogoutConfirmModal({
  open,
  title = 'Confirm sign out',
  message = 'Are you sure you want to sign out?',
  confirmLabel = 'Sign out',
  cancelLabel = 'Cancel',
  confirmTone = 'red',
  onConfirm,
  onCancel,
}) {
  if (!open) return null
  const confirmBtnClass =
    confirmTone === 'blue'
      ? 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800'
      : 'rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmBtnClass}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardShell({
  badge,
  title,
  subtitle,
  primaryLogoSrc,
  primaryLogoAlt = 'Petrotek',
  secondaryLogoSrc,
  secondaryLogoAlt = 'Secondary brand',
  user,
  onLogout,
  children,
  actions,
  /** 'inline' = actions beside title (default). 'belowHeading' = full-width row under title + user row. */
  actionsPlacement = 'inline',
  logoutConfirm,
}) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [mobileHeaderHidden, setMobileHeaderHidden] = useState(false)
  const lastScrollYRef = useRef(0)
  const resolvedPrimaryLogoSrc = primaryLogoSrc || logo
  const resolvedPrimaryLogoAlt = primaryLogoAlt

  function handleLogoutClick() {
    if (logoutConfirm?.enabled) {
      setIsLogoutConfirmOpen(true)
      return
    }
    onLogout?.()
  }

  function handleLogoutConfirm() {
    setIsLogoutConfirmOpen(false)
    onLogout?.()
  }

  function handleLogoutCancel() {
    setIsLogoutConfirmOpen(false)
  }

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY || 0
      const delta = y - lastScrollYRef.current

      if (y <= 8) {
        setMobileHeaderHidden(false)
      } else if (delta > 6 && y > 72) {
        // scrolling down -> hide header on mobile for more content space
        setMobileHeaderHidden(true)
      } else if (delta < -6) {
        // scrolling up -> quickly reveal header on mobile
        setMobileHeaderHidden(false)
      }

      lastScrollYRef.current = y
    }

    lastScrollYRef.current = window.scrollY || 0
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      <header
        className={`sticky top-0 z-40 border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-transform duration-300 md:translate-y-0 ${
          mobileHeaderHidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
        }`}
      >
        {/* Mobile / small: stacked */}
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <div className="flex min-w-0 items-center gap-2">
                <img
                  src={resolvedPrimaryLogoSrc}
                  alt={resolvedPrimaryLogoAlt}
                  className="h-8 w-auto max-w-[40vw] shrink-0 object-contain object-left"
                  width={400}
                  height={100}
                />
                {secondaryLogoSrc ? (
                  <img
                    src={secondaryLogoSrc}
                    alt={secondaryLogoAlt}
                    className="h-8 w-auto max-w-[30vw] shrink-0 object-contain"
                    width={240}
                    height={80}
                  />
                ) : null}
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <TitleBlock badge={badge} title={title} subtitle={subtitle} />
              <UserActions user={user} onLogout={handleLogoutClick} />
            </div>
            {actions ? (
              <div className="w-full min-w-0 border-t border-slate-100 pt-3">{actions}</div>
            ) : null}
          </div>
        </div>

        {/* Desktop */}
        {actions && actionsPlacement === 'belowHeading' ? (
          <div className="mx-auto hidden max-w-7xl flex-col gap-4 px-4 py-3.5 sm:px-6 md:flex lg:px-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <img
                    src={resolvedPrimaryLogoSrc}
                    alt={resolvedPrimaryLogoAlt}
                    className="h-14 w-auto shrink-0 object-contain object-left sm:h-20 sm:max-w-[min(400px,40vw)]"
                    width={400}
                    height={100}
                  />
                  {secondaryLogoSrc ? (
                    <img
                      src={secondaryLogoSrc}
                      alt={secondaryLogoAlt}
                      className="h-10 w-auto shrink-0 object-contain sm:h-14"
                      width={240}
                      height={80}
                    />
                  ) : null}
                </div>
                <div className="hidden h-16 w-px shrink-0 bg-slate-200 sm:block sm:h-20" aria-hidden />
                <TitleBlock badge={badge} title={title} subtitle={subtitle} />
              </div>
              <UserActions user={user} onLogout={handleLogoutClick} />
            </div>
            <div className="min-w-0 border-t border-slate-100 pt-3">{actions}</div>
          </div>
        ) : (
          <div className="mx-auto hidden max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 md:flex lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <img
                  src={resolvedPrimaryLogoSrc}
                  alt={resolvedPrimaryLogoAlt}
                  className="h-14 w-auto shrink-0 object-contain object-left sm:h-20 sm:max-w-[min(400px,40vw)]"
                  width={400}
                  height={100}
                />
                {secondaryLogoSrc ? (
                  <img
                    src={secondaryLogoSrc}
                    alt={secondaryLogoAlt}
                    className="h-10 w-auto shrink-0 object-contain sm:h-14"
                    width={240}
                    height={80}
                  />
                ) : null}
              </div>
              <div className="hidden h-16 w-px shrink-0 bg-slate-200 sm:block sm:h-20" aria-hidden />
              <TitleBlock badge={badge} title={title} subtitle={subtitle} />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {actions}
              {actions ? (
                <div className="hidden h-9 w-px bg-slate-200 sm:block" aria-hidden />
              ) : null}
              <UserActions user={user} onLogout={handleLogoutClick} />
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
      <LogoutConfirmModal
        open={isLogoutConfirmOpen}
        title={logoutConfirm?.title}
        message={logoutConfirm?.message}
        confirmLabel={logoutConfirm?.confirmLabel}
        cancelLabel={logoutConfirm?.cancelLabel}
        confirmTone={logoutConfirm?.confirmTone}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </div>
  )
}
