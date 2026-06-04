import { forwardRef } from 'react'
import { formatMoney } from '../lib/format.js'
import { REPORT_CONTENT_MM } from './pdfExport.js'
import { REPORT_COLORS as C, REPORT_FONT } from './reportTheme.js'

const rule = `1px solid ${C.slate200}`

const AdminMonthlySalesLogsReportHtml = forwardRef(function AdminMonthlySalesLogsReportHtml(
  {
    reportTitle = 'Monthly sales logs',
    portalLabel = 'Administration',
    monthTitle,
    generatedAt,
    filterLabel,
    summary,
    rows,
    petrotekLogoSrc,
    seltecLogoSrc,
    ...rest
  },
  ref,
) {
  const safeRows = Array.isArray(rows) ? rows : []
  const totalLogs = summary?.totalLogs ?? 0
  const totalAmount = Number(summary?.totalAmount ?? 0)
  const activeUsers = summary?.activeSalesUsers ?? safeRows.length
  const topName = summary?.topPerformerName || '—'
  const topAmount =
    summary?.topPerformerAmount != null ? formatMoney(summary.topPerformerAmount) : '—'
  const tableHeaders = ['User', 'Phone', 'Target', 'Sales achieved']

  const stats = [
    { label: 'Total amount', value: formatMoney(totalAmount) },
    { label: 'Log entries', value: String(totalLogs) },
    { label: 'Users with logs', value: String(activeUsers) },
    { label: 'Top performer', value: topName, sub: topAmount !== '—' ? topAmount : null },
  ]

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
        <header>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {petrotekLogoSrc ? (
                <img
                  src={petrotekLogoSrc}
                  alt=""
                  style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                />
              ) : null}
              {seltecLogoSrc ? (
                <img
                  src={seltecLogoSrc}
                  alt=""
                  style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
                />
              ) : null}
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.slate500,
              }}
            >
              {portalLabel}
            </p>
          </div>
          <div style={{ marginTop: '20px', paddingBottom: '16px', borderBottom: `2px solid ${C.slate900}` }}>
            <h1
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: C.slate900,
                lineHeight: 1.25,
              }}
            >
              {reportTitle}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: C.slate600 }}>
              {monthTitle}
              {filterLabel ? (
                <span style={{ color: C.slate400 }}> · {filterLabel}</span>
              ) : null}
            </p>
          </div>
        </header>

        <section style={{ marginTop: '24px' }}>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.slate500,
            }}
          >
            Overview
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            {stats.map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '12px 10px',
                  backgroundColor: C.slate50,
                  borderRadius: '6px',
                  border: rule,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '8px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: C.slate500,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: C.slate900,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.value}
                </p>
                {item.sub ? (
                  <p style={{ margin: '2px 0 0', fontSize: '10px', color: C.slate600 }}>{item.sub}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: '28px', flex: '1 1 auto' }}>
          <p
            style={{
              margin: '0 0 10px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.slate500,
            }}
          >
            Totals by user
          </p>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: '10px',
            }}
          >
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '22%' }} />
            </colgroup>
            <thead>
              <tr>
                {tableHeaders.map((label, i) => (
                  <th
                    key={label}
                    style={{
                      padding: '8px 10px',
                      textAlign: i >= 2 ? 'right' : 'left',
                      fontSize: '8px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: C.slate600,
                      backgroundColor: C.slate100,
                      borderBottom: rule,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.length ? (
                safeRows.map((row, index) => (
                  <tr
                    key={String(row.salesUserId ?? index)}
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <td
                      style={{
                        padding: '9px 10px',
                        borderTop: rule,
                        color: C.slate900,
                        fontWeight: 500,
                        verticalAlign: 'top',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.salesUserName || '—'}
                    </td>
                    <td
                      style={{
                        padding: '9px 10px',
                        borderTop: rule,
                        color: C.slate600,
                        verticalAlign: 'top',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.salesUserPhone || '—'}
                    </td>
                    <td
                      style={{
                        padding: '9px 10px',
                        borderTop: rule,
                        textAlign: 'right',
                        fontWeight: 600,
                        color: C.slate900,
                        verticalAlign: 'top',
                      }}
                    >
                          {row.targetAmount != null ? formatMoney(row.targetAmount) : '—'}
                    </td>
                    <td
                      style={{
                        padding: '9px 10px',
                        borderTop: rule,
                        textAlign: 'right',
                        fontWeight: 600,
                        color: C.slate900,
                        verticalAlign: 'top',
                      }}
                    >
                          {formatMoney(row.totalAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '24px 10px',
                      textAlign: 'center',
                      color: C.slate500,
                      borderTop: rule,
                    }}
                  >
                    No sales activity for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <footer
          style={{
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: rule,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '8px',
            color: C.slate500,
            flexShrink: 0,
          }}
        >
          <span>Generated {generatedAt}</span>
          <span>CRM · Confidential</span>
        </footer>
      </div>
    </article>
  )
})

AdminMonthlySalesLogsReportHtml.displayName = 'AdminMonthlySalesLogsReportHtml'

export default AdminMonthlySalesLogsReportHtml
