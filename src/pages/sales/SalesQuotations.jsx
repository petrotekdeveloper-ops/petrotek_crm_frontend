import QuotationsPage from '../quotations/QuotationsPage.jsx'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import { btnPrimary } from '../../lib/salesFormStyles.js'
import petrotekLogo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

export default function SalesQuotations({ user, onLogout }) {
  const isSeltecUser = String(user?.company || '').toLowerCase() === 'seltec'

  return (
    <QuotationsPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/sales/quotations"
      header={({ monthPicker }) => <SalesWorkspaceHeader endSlot={monthPicker} />}
      shellProps={{
        badge: 'Sales workspace',
        title: 'Quotations',
        subtitle: 'Prepare and track customer quotations',
        primaryLogoSrc: isSeltecUser ? seltecLogo : petrotekLogo,
        primaryLogoAlt: isSeltecUser ? 'Seltec' : 'Petrotek',
      }}
      primaryBtnClass={
        isSeltecUser
          ? 'min-h-[44px] rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2'
          : btnPrimary
      }
      tableHeadClass={
        isSeltecUser ? 'bg-blue-50/80 text-blue-900/80' : 'bg-red-50/80 text-red-900/80'
      }
    />
  )
}
