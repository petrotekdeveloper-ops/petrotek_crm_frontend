import EnquiriesPage from '../../features/enquiries/EnquiriesPage.jsx'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import { getCompanyTheme } from '../../lib/managerTheme.js'
import petrotekLogo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

export default function SalesEnquiries({ user, onLogout }) {
  const theme = getCompanyTheme(user)

  return (
    <EnquiriesPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/sales/enquiries"
      theme={theme}
      monthPickerInHeaderOnly
      header={({ monthPicker }) => <SalesWorkspaceHeader endSlot={monthPicker} />}
      shellProps={{
        badge: 'Sales workspace',
        title: 'Enquiries',
        subtitle: 'Track customer enquiries and follow-ups',
        primaryLogoSrc: theme.isSeltec ? seltecLogo : petrotekLogo,
        primaryLogoAlt: theme.isSeltec ? 'Seltec' : 'Petrotek',
      }}
    />
  )
}
