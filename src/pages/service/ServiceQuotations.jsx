import QuotationsPage from '../../features/quotations/QuotationsPage.jsx'
import ServiceWorkspaceHeader from '../../components/ServiceWorkspaceHeader.jsx'

export default function ServiceQuotations({ user, onLogout }) {
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
      }}
    />
  )
}
