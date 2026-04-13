import DashboardShell from '../../components/DashboardShell.jsx'

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value || '—'}</p>
    </div>
  )
}

export default function DriverDashboard({ user, onLogout }) {
  return (
    <DashboardShell
      badge="Driver Portal"
      title="Driver dashboard"
      subtitle="Your account and vehicle details"
      user={user}
      onLogout={onLogout}
    >
      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard label="Driver name" value={user?.name} />
        <InfoCard label="Phone number" value={user?.phone} />
        <InfoCard label="Vehicle number" value={user?.vehicleNumber} />
        <InfoCard label="Role" value={user?.designation} />
      </section>
    </DashboardShell>
  )
}
