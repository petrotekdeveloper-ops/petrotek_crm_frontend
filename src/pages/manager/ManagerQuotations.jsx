import QuotationsPage from '../../features/quotations/QuotationsPage.jsx'
import ManagerHeader, { ManagerMonthControl, managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { getManagerTheme } from '../../lib/managerTheme.js'

export default function ManagerQuotations({ user, onLogout }) {
  const theme = getManagerTheme(user)

  return (
    <QuotationsPage
      user={user}
      onLogout={onLogout}
      apiBasePath="/api/manager/quotations"
      controlsInSectionHeader
      header={() => <ManagerHeader user={user} />}
      renderMonthControl={(props) => <ManagerMonthControl {...props} />}
      shellProps={{
        badge: 'Manager workspace',
        title: 'Quotations',
        subtitle: 'Create and manage your quotations',
        ...managerShellLogoProps(user),
      }}
      primaryBtnClass={theme.btnPrimary}
      sectionAccentClass={theme.accentBg}
      isSeltecUser={theme.isSeltec}
    />
  )
}