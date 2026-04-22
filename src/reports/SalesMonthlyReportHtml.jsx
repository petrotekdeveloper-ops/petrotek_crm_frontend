import { forwardRef } from 'react'
import html2pdf from 'html2pdf.js'
import { formatMoney, formatSaleDate } from '../lib/format.js'

/**
 * Printable HTML layout for monthly sales PDF (used with html2pdf.js).
 *
 * Important: html2canvas (inside html2pdf) cannot parse Tailwind v4's `oklab()` colors.
 * Layout uses Tailwind where safe; colors use inline hex/RGB.
 */

/** Printable width (mm): A4 210mm minus default side margins (8 + 8 from PDF_EXPORT_OPTIONS). */
const REPORT_CONTENT_MM = 194

/** html2pdf options for the monthly sales report (A4, margins, canvas quality). */
const PDF_EXPORT_OPTIONS = {
  margin: [8, 8, 8, 8],
  image: { type: 'jpeg', quality: 0.96 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (_documentClone, clonedContainer) => {
      const inner = clonedContainer?.firstElementChild
      if (!inner || !(inner instanceof HTMLElement)) return
      inner.style.setProperty('position', 'relative', 'important')
      inner.style.setProperty('left', '0', 'important')
      inner.style.setProperty('top', '0', 'important')
      inner.style.setProperty('right', 'auto', 'important')
      inner.style.setProperty('bottom', 'auto', 'important')
      inner.style.setProperty('transform', 'none', 'important')
      inner.style.setProperty('width', `${REPORT_CONTENT_MM}mm`, 'important')
      inner.style.setProperty('max-width', `${REPORT_CONTENT_MM}mm`, 'important')
      inner.style.setProperty('box-sizing', 'border-box', 'important')
    },
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'] },
}

export async function exportSalesMonthlyReportElementToPdf(domElement, fileName) {
  if (!domElement) {
    throw new Error('exportSalesMonthlyReportElementToPdf: missing DOM element')
  }
  const opt = { ...PDF_EXPORT_OPTIONS, filename: fileName }
  const chain = html2pdf().set(opt).from(domElement).save()
  if (chain != null && typeof chain.then === 'function') {
    await chain
  }
}

const C = {
  white: '#ffffff',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate800: '#1e293b',
  slate900: '#0f172a',
}

/** Table header row (Daily logs): brand by user org — inline hex for html2canvas. */
const TABLE_HEAD = {
  seltec: { bg: '#2563eb', color: '#ffffff' },
  petrotek: { bg: '#dc2626', color: '#ffffff' },
}

const SalesMonthlyReportHtml = forwardRef(function SalesMonthlyReportHtml(
  {
    monthTitle,
    generatedAt,
    userName,
    userPhone,
    companyName,
    entries,
    monthlyTotal,
    monthlyTarget,
    logoSrc,
    isSeltecUser,
    ...rest
  },
  ref,
) {
  const safeEntries = Array.isArray(entries) ? entries : []
  const total = Number(monthlyTotal) || 0
  const tgt =
    monthlyTarget != null && !Number.isNaN(Number(monthlyTarget)) ? Number(monthlyTarget) : null

  const theadStyle = isSeltecUser ? TABLE_HEAD.seltec : TABLE_HEAD.petrotek

  const rule = `1px solid ${C.slate200}`

  return (
    <article
      ref={ref}
      {...rest}
      className="pointer-events-none fixed left-[-9999px] top-0 z-0 box-border max-w-full"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
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
      <div
        className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-5 sm:px-6"
        style={{ backgroundColor: C.white }}
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt=""
                className="h-auto max-h-12 w-auto shrink-0 object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight" style={{ color: C.slate900 }}>
                Monthly Sales Report
              </h1>
              <p className="mt-1 text-[11px]" style={{ color: C.slate600 }}>
                Reporting period · <span style={{ color: C.slate800 }}>{monthTitle}</span>
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.slate500 }}>
            User details
          </h2>
          <div style={{ borderTop: rule, borderBottom: rule }}>
            <dl>
              {[
                ['Sales executive', userName || '—'],
                ['Contact', userPhone || '—'],
                ['Organization', companyName || '—'],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-3 px-0 py-2.5"
                  style={{
                    borderTop: i > 0 ? `1px solid ${C.slate100}` : 'none',
                  }}
                >
                  <dt
                    className="shrink-0 text-[9px] font-medium uppercase tracking-wide"
                    style={{ color: C.slate400, flex: '0 0 36%', minWidth: 0 }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="text-right text-[12px] leading-snug"
                    style={{
                      color: C.slate900,
                      flex: '1 1 0%',
                      minWidth: 0,
                      wordBreak: 'break-word',
                    }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.slate500 }}>
            Summary
          </h2>
          <div className="grid grid-cols-3 gap-3 border-t pt-3" style={{ borderColor: C.slate200 }}>
            {[
              { label: 'Entries', value: String(safeEntries.length) },
              { label: 'Total amount', value: formatMoney(total) },
              {
                label: 'Monthly target',
                value: tgt != null ? formatMoney(tgt) : 'Not set',
              },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <p className="text-[9px] font-medium uppercase tracking-wide" style={{ color: C.slate500 }}>
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums leading-tight" style={{ color: C.slate900 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.slate500 }}>
            Daily logs
          </h2>

          <div style={{ border: rule }}>
            <table
              className="w-full border-collapse text-[9px]"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '54%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: theadStyle.bg, color: theadStyle.color }}>
                  <th className="px-2 py-2 text-left text-[8px] font-semibold uppercase sm:px-3">
                    Date
                  </th>
                  <th className="px-2 py-2 text-right text-[8px] font-semibold uppercase sm:px-3">
                    Amount
                  </th>
                  <th className="px-2 py-2 text-left text-[8px] font-semibold uppercase sm:px-3">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: C.slate800 }}>
                {safeEntries.length ? (
                  safeEntries.map((entry, index) => (
                    <tr key={entry._id || `row-${index}`}>
                      <td
                        className="break-words px-2 py-2 font-normal sm:px-3"
                        style={{ borderTop: `1px solid ${C.slate200}`, verticalAlign: 'top' }}
                      >
                        {formatSaleDate(entry.saleDate)}
                      </td>
                      <td
                        className="break-words px-2 py-2 text-right text-[10px] tabular-nums sm:px-3"
                        style={{ borderTop: `1px solid ${C.slate200}`, verticalAlign: 'top' }}
                      >
                        {formatMoney(entry.amount || 0)}
                      </td>
                      <td
                        className="break-words px-2 py-2 sm:px-3"
                        style={{
                          borderTop: `1px solid ${C.slate200}`,
                          color: C.slate600,
                          verticalAlign: 'top',
                          wordBreak: 'break-word',
                        }}
                      >
                        {entry.note || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-2 py-6 text-center text-[10px] sm:px-3"
                      style={{ borderTop: `1px solid ${C.slate200}`, color: C.slate500 }}
                    >
                      No entries available for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer
          className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[8px]"
          style={{
            borderTop: rule,
            color: C.slate500,
            flexShrink: 0,
            paddingTop: '12px',
            marginTop: '24px',
          }}
        >
          <span className="min-w-0">Report generated · {generatedAt}</span>
          <span className="shrink-0">CRM export</span>
        </footer>
      </div>
    </article>
  )
})

SalesMonthlyReportHtml.displayName = 'SalesMonthlyReportHtml'

export default SalesMonthlyReportHtml
