import { forwardRef } from 'react'
import html2pdf from 'html2pdf.js'
import { formatMoney, formatSaleDate } from '../lib/format.js'

/**
 * Printable HTML layout for monthly sales PDF (used with html2pdf.js).
 *
 * Important: html2canvas (inside html2pdf) cannot parse Tailwind v4's `oklab()` colors.
 * This component uses layout-only Tailwind plus inline hex/RGB styles for all colors.
 */

/** html2pdf options for the monthly sales report (A4, margins, canvas quality). */
const PDF_EXPORT_OPTIONS = {
  margin: [8, 8, 8, 8],
  image: { type: 'jpeg', quality: 0.96 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: ['css', 'legacy'] },
}

/**
 * Saves a PDF from the root DOM node that wraps {@link SalesMonthlyReportHtml}.
 * Call only after the report is mounted (e.g. ref attached).
 */
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
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
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

  const accent = isSeltecUser
    ? {
        primary: '#2563eb',
        primaryDark: '#1d4ed8',
        soft: '#eff6ff',
        border: '#93c5fd',
        text: '#1d4ed8',
        theadBg: '#2563eb',
        barGradient: 'linear-gradient(to right, #2563eb, #1d4ed8)',
      }
    : {
        primary: '#dc2626',
        primaryDark: '#b91c1c',
        soft: '#fef2f2',
        border: '#fca5a5',
        text: '#b91c1c',
        theadBg: '#dc2626',
        barGradient: 'linear-gradient(to right, #dc2626, #b91c1c)',
      }

  const cardBorder = `1px solid ${C.slate200}`

  return (
    <article
      ref={ref}
      {...rest}
      className="pointer-events-none fixed left-0 top-0 z-[200] box-border w-[210mm] max-w-[210mm] overflow-hidden rounded-2xl shadow-sm"
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        backgroundColor: C.white,
        border: `1px solid ${C.slate200}`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
        color: '#0f172a',
      }}
    >
      <div className="h-1 w-full" style={{ background: accent.barGradient }} aria-hidden />

      <div
        className="px-7 pb-7 pt-5"
        style={{
          background: `linear-gradient(to bottom, ${C.slate50}, ${C.white})`,
        }}
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {logoSrc ? (
              <div
                className="flex h-14 w-[7.5rem] shrink-0 items-center justify-center rounded-xl p-2 shadow-sm"
                style={{
                  border: `1px solid ${accent.border}`,
                  backgroundColor: C.white,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                }}
              >
                <img src={logoSrc} alt="" className="max-h-10 w-auto max-w-full object-contain" />
              </div>
            ) : null}
            <div className="min-w-0 pt-0.5">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: accent.text }}
              >
                Performance
              </p>
              <h1
                className="mt-1 text-[20px] font-bold leading-tight tracking-tight"
                style={{ color: C.slate900 }}
              >
                Monthly Sales Report
              </h1>
              <p className="mt-1.5 text-[11px] font-medium" style={{ color: C.slate500 }}>
                Reporting period · <span style={{ color: C.slate800 }}>{monthTitle}</span>
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent.primary }}
              aria-hidden
            />
            <h2
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: C.slate500 }}
            >
              User details
            </h2>
          </div>
          <div
            className="overflow-hidden rounded-xl shadow-sm"
            style={{
              border: cardBorder,
              backgroundColor: C.white,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
          >
            <dl>
              {[
                ['Sales executive', userName || '—'],
                ['Contact', userPhone || '—'],
                ['Organization', companyName || '—'],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-6 px-4 py-3 sm:px-5"
                  style={{
                    borderTop: i > 0 ? `1px solid ${C.slate100}` : 'none',
                  }}
                >
                  <dt
                    className="w-[34%] shrink-0 text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: C.slate400 }}
                  >
                    {label}
                  </dt>
                  <dd
                    className="min-w-0 flex-1 text-right text-[12px] font-medium leading-snug"
                    style={{ color: C.slate900 }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent.primary }}
              aria-hidden
            />
            <h2
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: C.slate500 }}
            >
              Summary
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Entries', value: String(safeEntries.length), sub: 'Logged rows' },
              { label: 'Total amount', value: formatMoney(total), sub: 'This period' },
              {
                label: 'Monthly target',
                value: tgt != null ? formatMoney(tgt) : 'Not set',
                sub: tgt != null ? 'Assigned goal' : '—',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="relative overflow-hidden rounded-xl p-3 shadow-sm"
                style={{
                  border: cardBorder,
                  backgroundColor: accent.soft,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full w-1"
                  style={{ backgroundColor: accent.primary }}
                  aria-hidden
                />
                <p
                  className="pl-2 text-[9px] font-medium uppercase tracking-wide"
                  style={{ color: C.slate500 }}
                >
                  {item.label}
                </p>
                <p
                  className="mt-1.5 pl-2 text-[15px] font-bold tabular-nums tracking-tight"
                  style={{ color: C.slate900 }}
                >
                  {item.value}
                </p>
                <p className="mt-0.5 pl-2 text-[8px]" style={{ color: C.slate500 }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: accent.primary }}
                aria-hidden
              />
              <h2
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: C.slate500 }}
              >
                Daily logs
              </h2>
            </div>
            <span
              className="rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: accent.soft,
                color: accent.text,
                border: `1px solid ${accent.border}`,
              }}
            >
              {safeEntries.length} records
            </span>
          </div>

          <div
            className="overflow-hidden rounded-xl shadow-sm"
            style={{
              border: cardBorder,
              backgroundColor: C.white,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            }}
          >
            <table className="w-full border-collapse text-[9px]">
              <thead>
                <tr style={{ backgroundColor: accent.theadBg, color: C.white }}>
                  <th className="px-3 py-2.5 text-left text-[8px] font-bold uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-right text-[8px] font-bold uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-left text-[8px] font-bold uppercase tracking-wider">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody style={{ color: C.slate800 }}>
                {safeEntries.length ? (
                  safeEntries.map((entry, index) => (
                    <tr
                      key={entry._id || `row-${index}`}
                      style={{
                        backgroundColor: index % 2 === 0 ? C.white : C.slate50,
                      }}
                    >
                      <td
                        className="px-3 py-2 font-medium"
                        style={{ borderTop: `1px solid ${C.slate100}` }}
                      >
                        {formatSaleDate(entry.saleDate)}
                      </td>
                      <td
                        className="px-3 py-2 text-right text-[10px] font-semibold tabular-nums"
                        style={{ borderTop: `1px solid ${C.slate100}` }}
                      >
                        {formatMoney(entry.amount || 0)}
                      </td>
                      <td
                        className="px-3 py-2"
                        style={{ borderTop: `1px solid ${C.slate100}`, color: C.slate600 }}
                      >
                        {entry.note || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-6 text-center text-[10px]"
                      style={{ borderTop: `1px solid ${C.slate100}`, color: C.slate500 }}
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
          className="mt-8 flex flex-wrap items-center justify-between gap-2 pt-4 text-[8px]"
          style={{ borderTop: `1px solid ${C.slate200}`, color: C.slate500 }}
        >
          <span className="font-medium">Report generated · {generatedAt}</span>
          <span
            className="rounded-md px-2 py-0.5 font-medium"
            style={{ backgroundColor: C.slate100, color: C.slate500 }}
          >
            CRM export
          </span>
        </footer>
      </div>
    </article>
  )
})

SalesMonthlyReportHtml.displayName = 'SalesMonthlyReportHtml'

export default SalesMonthlyReportHtml
