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

export default function DashboardShell({
  badge,
  title,
  subtitle,
  user,
  onLogout,
  children,
  actions,
}) {
  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        {/* Mobile / small: stacked */}
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 md:hidden">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <img
                src={logo}
                alt="Petrotek"
                className="h-10 w-auto max-w-[55vw] shrink-0 object-contain object-left"
                width={400}
                height={100}
              />
              <UserActions user={user} onLogout={onLogout} />
            </div>
            <TitleBlock badge={badge} title={title} subtitle={subtitle} />
            {actions ? (
              <div className="w-full min-w-0 border-t border-slate-100 pt-3">{actions}</div>
            ) : null}
          </div>
        </div>

        {/* Desktop: single row */}
        <div className="mx-auto hidden max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 md:flex lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
            <img
              src={logo}
              alt="Petrotek"
              className="h-14 w-auto shrink-0 object-contain object-left sm:h-20 sm:max-w-[min(400px,40vw)]"
              width={400}
              height={100}
            />
            <div className="hidden h-16 w-px shrink-0 bg-slate-200 sm:block sm:h-20" aria-hidden />
            <TitleBlock badge={badge} title={title} subtitle={subtitle} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {actions}
            {actions ? (
              <div className="hidden h-9 w-px bg-slate-200 sm:block" aria-hidden />
            ) : null}
            <UserActions user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  )
}
