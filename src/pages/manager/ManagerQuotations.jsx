import QuotationsPage from '../../features/quotations/QuotationsPage.jsx'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'

export default function ManagerQuotations({ user, onLogout }) {
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
    />
  )
}
