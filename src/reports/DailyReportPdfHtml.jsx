import { forwardRef } from 'react'
import { REPORT_CONTENT_MM } from './pdfExport.js'
import { REPORT_COLORS as C, REPORT_FONT } from './reportTheme.js'

const rule = `1px solid ${C.slate200}`

const KPI_ROWS = [
  ['newCustomers', 'New customers'],
  ['existingFollowUps', 'Existing follow-ups'],
  ['customerVisits', 'Customer visits'],
  ['callsMade', 'Calls made'],
  ['quotationsSent', 'Quotations sent'],
  ['ordersReceived', 'Orders received'],
  ['collectionFollowUps', 'Collection follow-ups'],
]

function value(v) {
  if (v == null) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

function rowDate(date) {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
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

const DailyReportPdfHtml = forwardRef(function DailyReportPdfHtml(
  { report, logoSrc, companyName, generatedAt, salesExecutiveName, salesExecutivePhone, viewerLabel = 'CRM', preview = false, ...rest },
  ref,
) {
  const target = report?.dailyTargetAchievement || {}
  const customerActivities = Array.isArray(report?.customerActivities) ? report.customerActivities : []
  const activityCountSummary = report?.activityCountSummary || {}
  const businessGenerated = report?.businessGenerated || {}
  const supportActivities = supportActivitiesFromReport(report)
  const review = getReview(report)
  const achievements = listRows(report?.topAchievementsToday)
  const plans = listRows(report?.tomorrowsPlan)
  const isSeltecTheme = String(companyName || report?.companyName || '').trim().toLowerCase().includes('seltec')
  const headerColor = isSeltecTheme ? '#1d4ed8' : '#E7000B'
  const logoHeight = isSeltecTheme ? '32px' : '24px'
  const tableHeadingStyle = {
    border: rule,
    padding: '5px 6px',
    textAlign: 'left',
    color: '#fff',
    backgroundColor: headerColor,
    fontWeight: 700,
  }
  const sectionTitleStyle = { margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 800 }

  return (
    <article
      ref={ref}
      {...rest}
      className={preview ? 'box-border' : 'pointer-events-none fixed left-[-9999px] top-0 z-0 box-border'}
      style={{
        fontFamily: REPORT_FONT,
        width: preview ? '100%' : `${REPORT_CONTENT_MM}mm`,
        maxWidth: `${REPORT_CONTENT_MM}mm`,
        minHeight: preview ? 'auto' : '281mm',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: C.white,
        color: C.slate900,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-6" style={{ backgroundColor: C.white }}>
        <header style={{ borderBottom: rule, paddingBottom: '10px' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoSrc ? <img src={logoSrc} alt="" style={{ height: logoHeight, width: 'auto', objectFit: 'contain' }} /> : null}
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Daily Sales Report</h1>
            </div>
            <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase', color: C.slate500 }}>{viewerLabel}</p>
          </div>
          <div className="mt-3 flex items-stretch justify-between gap-3 text-[10px]">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <p style={{ margin: 0 }}>Date: {rowDate(report?.date)}</p>
              <p style={{ margin: 0 }}>Type: {value(report?.type)}</p>
            </div>
            <div
              style={{
                border: rule,
                minWidth: '46%',
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>Sales Executive: {value(salesExecutiveName)}</p>
              <p style={{ margin: 0 }}>Phone: {value(salesExecutivePhone)}</p>
            </div>
          </div>
        </header>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>1. Daily Target vs Achievement</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr>
                <th style={tableHeadingStyle}>KPI</th>
                <th style={tableHeadingStyle}>Achieved today</th>
                <th style={tableHeadingStyle}>Remarks</th>
                <th style={tableHeadingStyle}>Manager comments</th>
              </tr>
            </thead>
            <tbody>
              {KPI_ROWS.map(([key, label]) => {
                const row = target?.[key] || {}
                return (
                  <tr key={key}>
                    <td style={{ border: rule, padding: '5px 6px', color: C.slate600, verticalAlign: 'top' }}>
                      {label}
                    </td>
                    <td style={{ border: rule, padding: '5px 6px', verticalAlign: 'top' }}>{value(row.achievedToday)}</td>
                    <td style={{ border: rule, padding: '5px 6px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                      {value(row.remarks)}
                    </td>
                    <td style={{ border: rule, padding: '5px 6px', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                      {value(row.managerComments)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>2. Customer Activities</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr>
                <th style={tableHeadingStyle}>Type</th>
                <th style={tableHeadingStyle}>Customer</th>
                <th style={tableHeadingStyle}>Purpose</th>
                <th style={tableHeadingStyle}>Outcome / Next</th>
                <th style={tableHeadingStyle}>Quote</th>
                <th style={tableHeadingStyle}>Order</th>
              </tr>
            </thead>
            <tbody>
              {(customerActivities.length ? customerActivities : [{}]).map((row, i) => (
                <tr key={`customer-${i}`}>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.customerType)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.customerName)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.purpose)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.outcomeNextAction)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.quoteAed)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.orderAed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>3. Activity Summary</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {[
                ['Total activities done', activityCountSummary.totalActivitiesDoneToday],
                ['Pending/non-productive', activityCountSummary.pendingNonProductive],
                ['Activities not in CRM', activityCountSummary.activitiesNotInCrm],
                ['Productive activities', activityCountSummary.productiveActivities],
                ['Activities updated in CRM', activityCountSummary.activitiesUpdatedInCrm],
                ['CRM updated', yesNo(activityCountSummary.crmUpdated)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: rule, width: '58%', padding: '5px 6px', color: C.slate600 }}>{k}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>4. Business Generated</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {[
                ['Quotation value', businessGenerated.totalQuotationValue],
                ['Order value', businessGenerated.totalOrderValue],
                ['Collections followed-up', businessGenerated.collectionsFollowedUp],
                ['Pipeline value', businessGenerated.pipelineValue],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: rule, width: '58%', padding: '5px 6px', color: C.slate600 }}>{k}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>5. Support Activities (Meetings/Technical Support)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr>
                <th style={tableHeadingStyle}>Task completed</th>
                <th style={tableHeadingStyle}>Customer / department</th>
                <th style={tableHeadingStyle}>Result / outcome</th>
                <th style={tableHeadingStyle}>Whom supported</th>
                <th style={tableHeadingStyle}>Qty / value</th>
              </tr>
            </thead>
            <tbody>
              {(supportActivities.length ? supportActivities : [{}]).map((row, i) => (
                <tr key={`support-${i}`}>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.taskCompleted)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.customerOrDepartment)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.resultOutcome)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.whomSupported)}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(row.qtyOrValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>6. Achievements & Plan</h2>
          <div className="grid grid-cols-2 gap-3">
            <div style={{ border: rule }}>
              <div style={{ borderBottom: rule, padding: '4px 6px', fontSize: '10px', fontWeight: 700 }}>
                TOP ACHIEVEMENTS TODAY
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <tbody>
                  {achievements.map((row, i) => (
                    <tr key={`ach-${i}`}>
                      <td style={{ width: '22px', padding: '4px 6px', fontWeight: 600 }}>{i + 1}.</td>
                      <td style={{ borderBottom: i === achievements.length - 1 ? 'none' : rule, padding: '4px 6px' }}>
                        {value(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ border: rule }}>
              <div style={{ borderBottom: rule, padding: '4px 6px', fontSize: '10px', fontWeight: 700 }}>
                TOMORROW'S PLAN
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <tbody>
                  {plans.map((row, i) => (
                    <tr key={`plan-${i}`}>
                      <td style={{ width: '22px', padding: '4px 6px', fontWeight: 600 }}>{i + 1}.</td>
                      <td style={{ borderBottom: i === plans.length - 1 ? 'none' : rule, padding: '4px 6px' }}>
                        {value(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={sectionTitleStyle}>7. Management Check</h2>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <p style={{ margin: 0 }}>Customer Names Recorded: {yesNo(review.customerNamesRecorded)}</p>
            <p style={{ margin: 0 }}>Outcomes Mentioned: {yesNo(review.outcomesMentioned)}</p>
            <p style={{ margin: 0 }}>Quote Values Recorded: {yesNo(review.quoteValuesRecorded)}</p>
            <p style={{ margin: 0 }}>Order Values Recorded: {yesNo(review.orderValuesRecorded)}</p>
            <p style={{ margin: 0 }}>New Customers Marked: {yesNo(review.newCustomersClearlyMarked)}</p>
            <p style={{ margin: 0 }}>Business Generated Visible: {yesNo(review.businessGeneratedVisible)}</p>
            <p style={{ margin: 0 }}>CRM Updated: {yesNo(review.crmUpdated)}</p>
            <p style={{ margin: 0 }}>Verified by Manager: {yesNo(review.verifiedByManager)}</p>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '9px', color: C.slate600 }}>
            Manager Remarks: {value(review?.managerRemarks)} · Initials: {value(review?.managerInitials)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '9px', color: C.slate600 }}>
            Verified By: {value(review?.verifiedBy?.name)} · Verified At:{' '}
            {review?.verifiedAt ? new Date(review.verifiedAt).toLocaleString() : '—'}
          </p>
        </section>

        <footer
          style={{
            marginTop: 'auto',
            paddingTop: '10px',
            borderTop: rule,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '8px',
            color: C.slate500,
          }}
        >
          <span>Generated {generatedAt}</span>
          <span>CRM · Confidential</span>
        </footer>
      </div>
    </article>
  )
})

DailyReportPdfHtml.displayName = 'DailyReportPdfHtml'

export default DailyReportPdfHtml
