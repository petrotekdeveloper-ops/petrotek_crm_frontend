import { forwardRef } from 'react'
import { REPORT_CONTENT_MM } from './pdfExport.js'
import { REPORT_COLORS as C, REPORT_FONT } from './reportTheme.js'

const rule = `1px solid ${C.slate200}`

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

const DailyReportPdfHtml = forwardRef(function DailyReportPdfHtml(
  {
    report,
    logoSrc,
    companyName,
    generatedAt,
    salesExecutiveName,
    viewerLabel = 'CRM',
    ...rest
  },
  ref,
) {
  const attendance = report?.attendacne?.[0] || {}
  const activity = report?.activity?.[0] || {}
  const generatedBusiness = report?.generatedBusiness?.[0] || {}
  const visits = Array.isArray(report?.customerVisit) ? report.customerVisit.slice(0, 4) : []
  const review = report?.managementReview || {}

  return (
    <article
      ref={ref}
      {...rest}
      className="pointer-events-none fixed left-[-9999px] top-0 z-0 box-border"
      style={{
        fontFamily: REPORT_FONT,
        width: `${REPORT_CONTENT_MM}mm`,
        maxWidth: `${REPORT_CONTENT_MM}mm`,
        minHeight: '281mm',
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
              {logoSrc ? (
                <img
                  src={logoSrc}
                  alt=""
                  style={{ height: '30px', width: 'auto', objectFit: 'contain' }}
                />
              ) : null}
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Daily Sales Report</h1>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: C.slate600 }}>
                  {value(companyName)}
                </p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase', color: C.slate500 }}>
              {viewerLabel}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
            <p style={{ margin: 0 }}>Date: {rowDate(report?.date)}</p>
            <p style={{ margin: 0 }}>Type: {value(report?.type)}</p>
            <p style={{ margin: 0, textAlign: 'right' }}>Sales Executive: {value(salesExecutiveName)}</p>
          </div>
        </header>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Attendance & Vehicle</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {[
                ['Office In', attendance.officeIn],
                ['Office Out', attendance.officeOut],
                ['ODO Start', attendance.odoStart],
                ['ODO End', attendance.odoEnd],
                ['KM Covered', attendance.covered],
                ['Vehicle No.', attendance.vehicleNumber],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: rule, width: '35%', padding: '5px 6px', color: C.slate600 }}>{k}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Sales Activity</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {[
                ['New Visits', activity.newVisit],
                ['Repeat Visits', activity.repeatVisit],
                ['Customer Calls', activity.customerCalls],
                ['Quotations Sent', activity.quotationSend],
                ['Orders Received', activity.quotationReceived],
                ['Payment Follow-Ups', activity.paymentFollowUp],
                ['New Customers Added', activity.newCustomer],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: rule, width: '55%', padding: '5px 6px', color: C.slate600 }}>{k}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Business Generated (AED)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <tbody>
              {[
                ['Quotation Value', generatedBusiness.quotationValue],
                ['Order Value', generatedBusiness.orderValue],
                ['Expected Business', generatedBusiness.expectedBusiness],
                ['Collections Received', generatedBusiness.collectionRecived],
                ['30-Day Pipeline', generatedBusiness.pipeline],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ border: rule, width: '55%', padding: '5px 6px', color: C.slate600 }}>{k}</td>
                  <td style={{ border: rule, padding: '5px 6px' }}>{value(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Customer Visits</h2>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => {
              const visit = visits[i] || {}
              return (
                <div key={i} style={{ border: rule, padding: '6px', minHeight: '52px' }}>
                  <p style={{ margin: 0, fontSize: '9px', color: C.slate600 }}>Customer {i + 1}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '10px' }}>{value(visit.customerName)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: C.slate600 }}>Purpose: {value(visit.purpouse)}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '9px', color: C.slate600 }}>Outcome: {value(visit.outcome)}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Next Day Plan / Notes</h2>
          <div style={{ border: rule, minHeight: '40px', padding: '6px', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
            {value(report?.notes)}
          </div>
        </section>

        <section style={{ marginTop: '12px' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '11px', textTransform: 'uppercase' }}>Management Review</h2>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <p style={{ margin: 0 }}>Outdoor Visit Verified: {yesNo(review.outdoorVisitVerified)}</p>
            <p style={{ margin: 0 }}>Attendance Verified: {yesNo(review.attendanceVerified)}</p>
            <p style={{ margin: 0 }}>Report Submitted: {yesNo(review.reportSubmitted)}</p>
            <p style={{ margin: 0 }}>CRM Updated: {yesNo(review.crmUpdated)}</p>
          </div>
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
