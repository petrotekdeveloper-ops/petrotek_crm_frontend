import petrotekLogo from '../../../assets/logopdf.png'
import seltecLogo from '../../../assets/seltecLogo.png'

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

function supportActivitiesFromReport(report) {
  if (Array.isArray(report?.supportActivities)) return report.supportActivities
  if (Array.isArray(report?.indoorSupportActivities)) return report.indoorSupportActivities
  return []
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

const verificationFieldDefs = [
  { key: 'customerNamesRecorded', label: 'Customer names recorded' },
  { key: 'outcomesMentioned', label: 'Outcomes mentioned' },
  { key: 'quoteValuesRecorded', label: 'Quote values recorded' },
  { key: 'orderValuesRecorded', label: 'Order values recorded' },
  { key: 'newCustomersClearlyMarked', label: 'New customers clearly marked' },
  { key: 'businessGeneratedVisible', label: 'Business generated visible' },
  { key: 'crmUpdated', label: 'CRM updated' },
  { key: 'verifiedByManager', label: 'Verified by manager' },
]

export default function ReportDetailModal({
  report,
  onClose,
  onDownload,
  downloading = false,
  formatDate,
  showManagerCheck = false,
  verificationEditable = false,
  onVerificationChange,
  onKpiManagerCommentChange,
  onSaveVerification,
  savingVerification = false,
}) {
  if (!report) return null

  const companyName = report?.companyName || report?.user?.company || ''
  const isSeltec = isSeltecCompany(companyName)
  const logoSrc = isSeltec ? seltecLogo : petrotekLogo
  const logoClass = isSeltec
    ? 'h-10 w-auto max-w-[9rem] object-contain sm:h-12 sm:max-w-[11rem]'
    : 'h-7 w-auto object-contain sm:h-8'
  const headingBg = isSeltec ? '#1d4ed8' : '#E7000B'
  const fieldFocusClass = isSeltec
    ? 'focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
    : 'focus:border-red-600 focus:ring-2 focus:ring-red-500/20'
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
  const supportActivities = supportActivitiesFromReport(report)

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
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h5 className="text-sm font-extrabold uppercase text-slate-900">
                  1. Daily Target vs Achievement
                </h5>
                {verificationEditable ? (
                  <p className="text-xs text-slate-500">
                    Add per-KPI manager comments below, then save verification at the bottom.
                  </p>
                ) : null}
              </div>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th style={headingStyle}>KPI</th>
                    <th style={headingStyle}>Achieved today</th>
                    <th style={headingStyle}>Remarks</th>
                    <th
                      style={headingStyle}
                      className={verificationEditable ? 'ring-2 ring-inset ring-white/40' : undefined}
                    >
                      Manager comments
                      {verificationEditable ? (
                        <span className="mt-0.5 block text-[10px] font-medium normal-case opacity-90">
                          Editable
                        </span>
                      ) : null}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kpiRows.map(([key, label]) => {
                    const row = report?.dailyTargetAchievement?.[key] || {}
                    return (
                      <tr key={key}>
                        <td className="border border-slate-200 px-2 py-1.5 align-top font-medium text-slate-800">
                          {label}
                        </td>
                        <td className="border border-slate-200 px-2 py-1.5 align-top text-slate-700">
                          {value(row.achievedToday)}
                        </td>
                        <td className="border border-slate-200 px-2 py-1.5 align-top whitespace-pre-wrap text-slate-700">
                          {value(row.remarks)}
                        </td>
                        <td
                          className={`border px-2 py-1.5 align-top ${
                            verificationEditable
                              ? 'border-slate-300 bg-slate-50/80'
                              : 'border-slate-200'
                          }`}
                        >
                          {verificationEditable ? (
                            <label className="block">
                              <span className="sr-only">Manager comment for {label}</span>
                              <textarea
                                rows={3}
                                value={row.managerComments || ''}
                                onChange={(e) => onKpiManagerCommentChange?.(key, e.target.value)}
                                disabled={savingVerification}
                                className={`min-h-[4.5rem] w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none disabled:opacity-60 ${fieldFocusClass}`}
                                placeholder="Your comment on this KPI…"
                              />
                            </label>
                          ) : (
                            <span className="whitespace-pre-wrap text-slate-700">
                              {value(row.managerComments)}
                            </span>
                          )}
                        </td>
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
              <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">
                5. Support Activities (Meetings/Technical Support)
              </h5>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th style={headingStyle}>Task completed</th>
                    <th style={headingStyle}>Customer / department</th>
                    <th style={headingStyle}>Result / outcome</th>
                    <th style={headingStyle}>Whom supported</th>
                    <th style={headingStyle}>Qty / value</th>
                  </tr>
                </thead>
                <tbody>
                  {(supportActivities.length ? supportActivities : [{}]).map((row, i) => (
                    <tr key={`support-${i}`}>
                      <td className="border border-slate-200 px-2 py-1">{value(row.taskCompleted)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.customerOrDepartment)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.resultOutcome)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.whomSupported)}</td>
                      <td className="border border-slate-200 px-2 py-1">{value(row.qtyOrValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="mt-3">
              <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">6. Achievements & Plan</h5>
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
                <h5 className="mb-1 text-sm font-extrabold uppercase text-slate-900">7. Management Check</h5>
                {verificationEditable ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      onSaveVerification?.()
                    }}
                    className="rounded border border-slate-200 p-3 text-sm text-slate-800"
                  >
                    <div className="space-y-2">
                      {verificationFieldDefs.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(review?.[key])}
                            onChange={(e) => onVerificationChange?.(key, e.target.checked)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Manager initials</span>
                        <input
                          value={review?.managerInitials || ''}
                          onChange={(e) => onVerificationChange?.('managerInitials', e.target.value)}
                          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ${fieldFocusClass}`}
                        />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Manager remarks</span>
                        <textarea
                          rows={3}
                          value={review?.managerRemarks || ''}
                          onChange={(e) => onVerificationChange?.('managerRemarks', e.target.value)}
                          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ${fieldFocusClass}`}
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={savingVerification}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ backgroundColor: headingBg }}
                      >
                        {savingVerification ? 'Saving…' : 'Save verification'}
                      </button>
                      <p className="text-xs text-slate-500">
                        Saved by manager with timestamp automatically.
                      </p>
                    </div>
                  </form>
                ) : (
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
                    <p className="mt-1 m-0">
                      Manager Remarks: {value(review?.managerRemarks)} · Initials: {value(review?.managerInitials)}
                    </p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
