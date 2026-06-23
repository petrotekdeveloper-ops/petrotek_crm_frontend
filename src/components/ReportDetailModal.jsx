import petrotekLogo from '../assets/logopdf.png'
import seltecLogo from '../assets/seltecLogo.png'

function value(v) {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

function isSeltecCompany(company) {
  return String(company || '').trim().toLowerCase().includes('seltec')
}

function yesNo(v) {
  return v ? 'Yes' : 'No'
}

function getReview(report) {
  return report?.managementCheck || report?.managementReview || {}
}

function listRows(items) {
  const values = Array.isArray(items) ? items.filter((x) => String(x || '').trim() !== '') : []
  return values.length > 0 ? values : ['']
}

const kpiRows = [
  ['newCustomers', 'New customers'],
  ['existingFollowUps', 'Existing follow-ups'],
  ['customerVisits', 'Customer visits'],
  ['callsMade', 'Calls made'],
  ['quotationsSent', 'Quotations sent'],
  ['ordersReceived', 'Orders received'],
  ['collectionFollowUps', 'Collection follow-ups'],
]

export default function ReportDetailModal({
  report,
  onClose,
  onDownload,
  downloading = false,
  formatDate,
  showManagerCheck = false,
}) {
  if (!report) return null

  const companyName = report?.companyName || report?.user?.company || ''
  const isSeltec = isSeltecCompany(companyName)
  const logoSrc = isSeltec ? seltecLogo : petrotekLogo
  const logoClass = isSeltec
    ? 'h-10 w-auto max-w-[9rem] object-contain sm:h-12 sm:max-w-[11rem]'
    : 'h-7 w-auto object-contain sm:h-8'
  const headingBg = isSeltec ? '#1d4ed8' : '#E7000B'
  const headingStyle = {
    border: '1px solid #e2e8f0',
    backgroundColor: headingBg,
    color: '#fff',
    padding: '5px 6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    textAlign: 'left',
  }
  const subtitleParts = []
  if (report?.user?.name) subtitleParts.push(report.user.name)
  subtitleParts.push(formatDate(report?.date))
  subtitleParts.push(report?.type || '—')
  const review = getReview(report)
  const achievements = listRows(report?.topAchievementsToday)
  const plans = listRows(report?.tomorrowsPlan)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[96vh] w-full max-w-6xl overflow-y-auto bg-white sm:rounded-xl">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">Report details</h3>
              <p className="mt-1 text-xs text-slate-500">{subtitleParts.join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              {onDownload ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={onDownload}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading...' : 'Download PDF'}
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white px-4 py-3 sm:px-6 sm:py-5">
          <div className="mx-auto max-w-5xl">
            <header className="border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {logoSrc ? <img src={logoSrc} alt="" className={logoClass} /> : null}
                  <h4 className="text-base font-semibold text-slate-900">Daily Sales Report</h4>
                </div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {showManagerCheck ? 'Manager/Admin view' : 'Sales view'}
                </p>
              </div>
              <div className="mt-3 flex items-stretch justify-between gap-3 text-xs">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <p className="m-0">Date: {formatDate(report?.date)}</p>
                  <p className="m-0">Type: {value(report?.type)}</p>
                </div>
                <div className="min-w-[44%] rounded border border-slate-200 px-2 py-1">
                  <p className="m-0 font-semibold">Sales Executive: {value(report?.salesExecutiveName || report?.user?.name)}</p>
                  <p className="m-0">Phone: {value(report?.user?.phone)}</p>
                </div>
              </div>
            </header>

            <section className="mt-3">
              <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">1. Daily Target Achievement</h5>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th style={headingStyle}>KPI</th>
                    <th style={headingStyle}>Daily</th>
                    <th style={headingStyle}>Today</th>
                    <th style={headingStyle}>Till date</th>
                    <th style={headingStyle}>Balance</th>
                    <th style={headingStyle}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiRows.map(([key, label]) => {
                    const row = report?.dailyTargetAchievement?.[key] || {}
                    return (
                      <tr key={key}>
                        <td className="border border-slate-200 px-2 py-1">{label}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(row.dailyTarget)}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(row.achievedToday)}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(row.achievedTillDate)}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(row.balance)}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(row.percentage)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            <section className="mt-3">
              <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">2. Customer Activities</h5>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th style={headingStyle}>Type</th>
                    <th style={headingStyle}>Customer</th>
                    <th style={headingStyle}>Purpose</th>
                    <th style={headingStyle}>Outcome / next</th>
                    <th style={headingStyle}>Quote</th>
                    <th style={headingStyle}>Order</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.customerActivities?.length ? report.customerActivities : [{}]).map((row, i) => (
                    <tr key={`customer-${i}`}>
                      <td className="border border-slate-200 px-2 py-1">{value(row.customerType)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.customerName)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.purpose)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.outcomeNextAction)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.quoteAed)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.orderAed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">3. Activity Summary</h5>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {[
                      ['Total activities done', report?.activityCountSummary?.totalActivitiesDoneToday],
                      ['Pending/non-productive', report?.activityCountSummary?.pendingNonProductive],
                      ['Activities not in CRM', report?.activityCountSummary?.activitiesNotInCrm],
                      ['Productive activities', report?.activityCountSummary?.productiveActivities],
                      ['Activities updated in CRM', report?.activityCountSummary?.activitiesUpdatedInCrm],
                      ['CRM updated', yesNo(report?.activityCountSummary?.crmUpdated)],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td className="border border-slate-200 px-2 py-1 text-slate-600">{k}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">4. Business Generated</h5>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {[
                      ['Quotation value', report?.businessGenerated?.totalQuotationValue],
                      ['Order value', report?.businessGenerated?.totalOrderValue],
                      ['Collections followed-up', report?.businessGenerated?.collectionsFollowedUp],
                      ['Pipeline value', report?.businessGenerated?.pipelineValue],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td className="border border-slate-200 px-2 py-1 text-slate-600">{k}</td>
                        <td className="border border-slate-200 px-2 py-1">{value(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-3">
              <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">5. Achievements & Plan</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200">
                  <div className="border-b border-slate-200 px-2 py-1 text-xs font-bold">TOP ACHIEVEMENTS TODAY</div>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {achievements.map((row, i) => (
                        <tr key={`ach-${i}`}>
                          <td className="w-6 px-2 py-1 font-semibold">{i + 1}.</td>
                          <td className="border-b border-slate-200 px-2 py-1">{value(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border border-slate-200">
                  <div className="border-b border-slate-200 px-2 py-1 text-xs font-bold">TOMORROW'S PLAN</div>
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {plans.map((row, i) => (
                        <tr key={`plan-${i}`}>
                          <td className="w-6 px-2 py-1 font-semibold">{i + 1}.</td>
                          <td className="border-b border-slate-200 px-2 py-1">{value(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {showManagerCheck ? (
              <section className="mt-3">
                <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">6. Management Check</h5>
                <div className="rounded border border-slate-200 p-2 text-xs text-slate-700">
                  <div className="grid grid-cols-2 gap-1">
                    <p className="m-0">Customer Names Recorded: {yesNo(review?.customerNamesRecorded)}</p>
                    <p className="m-0">Outcomes Mentioned: {yesNo(review?.outcomesMentioned)}</p>
                    <p className="m-0">Quote Values Recorded: {yesNo(review?.quoteValuesRecorded)}</p>
                    <p className="m-0">Order Values Recorded: {yesNo(review?.orderValuesRecorded)}</p>
                    <p className="m-0">New Customers Marked: {yesNo(review?.newCustomersClearlyMarked)}</p>
                    <p className="m-0">Business Generated Visible: {yesNo(review?.businessGeneratedVisible)}</p>
                    <p className="m-0">CRM Updated: {yesNo(review?.crmUpdated)}</p>
                    <p className="m-0">Verified by Manager: {yesNo(review?.verifiedByManager)}</p>
                  </div>
                  <p className="mt-1 m-0">Manager Remarks: {value(review?.managerRemarks)} · Initials: {value(review?.managerInitials)}</p>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
