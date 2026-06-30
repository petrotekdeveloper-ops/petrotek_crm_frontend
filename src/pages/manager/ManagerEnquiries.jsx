import EnquiriesPage from '../../features/enquiries/EnquiriesPage.jsx'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { getCompanyTheme } from '../../lib/managerTheme.js'

export default function ManagerEnquiries({ user, onLogout }) {
  const theme = getCompanyTheme(user)

  return (
    <EnquiriesPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/manager/enquiries"
      theme={theme}
      showCreatedBy
      controlsInSectionHeader
      header={() => <ManagerHeader user={user} />}
      renderMonthControl={(props) => <ManagerMonthControl {...props} />}
      shellProps={{
        badge: 'Manager workspace',
        title: 'Enquiries',
        subtitle: 'View and manage enquiries from your sales team',
        ...managerShellLogoProps(user),
      }}
    />
  )
}
