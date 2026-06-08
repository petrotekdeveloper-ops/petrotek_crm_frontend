import QuotationsPage from '../../features/quotations/QuotationsPage.jsx'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { btnPrimary } from '../../lib/salesFormStyles.js'

export default function ManagerQuotations({ user, onLogout }) {
  const isSeltecUser = String(user?.company || '').toLowerCase() === 'seltec'

  return (
    <QuotationsPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/manager/quotations"
      controlsInSectionHeader
      header={() => <ManagerHeader />}
      renderMonthControl={(props) => <ManagerMonthControl {...props} />}
      shellProps={{
        badge: 'Manager workspace',
        title: 'Quotations',
        subtitle: 'Create and manage your quotations',
        ...managerShellLogoProps(user),
      }}
      primaryBtnClass={
        isSeltecUser
          ? 'min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2'
          : btnPrimary
      }
      sectionAccentClass={isSeltecUser ? 'bg-blue-600' : 'bg-red-600'}
      isSeltecUser={isSeltecUser}
    />
  )
}