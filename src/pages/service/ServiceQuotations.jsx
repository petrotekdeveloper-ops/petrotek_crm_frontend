import QuotationsPage from '../../features/quotations/QuotationsPage.jsx'
import ServiceWorkspaceHeader from '../../components/ServiceWorkspaceHeader.jsx'
import seltecLogo from '../../assets/seltecLogo.png'
import petrotekLogo from '../../assets/logo.png'
import { btnPrimary } from '../../lib/salesFormStyles.js'

export default function ServiceQuotations({ user, onLogout }) {
  const isSeltecUser = String(user?.company || '').toLowerCase() === 'seltec'

  return (
    <QuotationsPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/service/quotations"
      header={({ monthPicker }) => <ServiceWorkspaceHeader endSlot={monthPicker} />}
      shellProps={{
        badge: 'Service Portal',
        title: 'Quotations',
        subtitle: 'Create and manage customer quotations',
        primaryLogoSrc: isSeltecUser ? seltecLogo : petrotekLogo,
        primaryLogoAlt: isSeltecUser ? 'Seltec' : 'Petrotek',
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
