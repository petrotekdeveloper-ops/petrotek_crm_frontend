import { forwardRef } from 'react'
import {
  formatQuotationMoney,
  formatQuotationPdfDate,
  PETROTEK_COMPANY,
  QUOTATION_DEFAULT_TERMS,
  QUOTATION_GENERAL_TERMS,
  QUOTATION_PDF_ACCENTS,
  resolveQuotationAmountInWords,
  quotationTotals,
} from '../lib/quotationPdf.js'
import { REPORT_CONTENT_MM } from './pdfExport.js'
import { REPORT_COLORS as C, REPORT_FONT } from './reportTheme.js'

function accentRule(color) {
  return `3px solid ${color}`
}

function LabelValue({ label, value, boldValue = false }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', fontSize: '11px', lineHeight: 1.45 }}>
      <span style={{ minWidth: '118px', flexShrink: 0, color: C.slate900 }}>{label}</span>
      <span
        style={{
          flex: 1,
          fontWeight: boldValue ? 700 : 400,
          color: C.slate900,
        }}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function CustomerBlock({ customer, index }) {
  return (
    <div style={{ marginBottom: index > 0 ? '10px' : 0 }}>
      <p
        style={{
          margin: '0 0 4px',
          fontSize: '11px',
          lineHeight: 1.45,
          color: C.slate900,
          textAlign: 'justify',
        }}
      >
        {customer?.address || '—'}
      </p>
      <LabelValue label="TRN :" value={customer?.trn} />
      <LabelValue label="PH :" value={customer?.phone} />
      <LabelValue label="Contact Person :" value={customer?.name} />
      <LabelValue label="Mobile :" value={customer?.mobile} />
      <LabelValue label="Email :" value={customer?.email} />
    </div>
  )
}

const QuotationPdfHtml = forwardRef(function QuotationPdfHtml(
  {
    quotation,
    logoSrc,
    logoAlt = 'Petrotek',
    fallbackTitle = 'PETROTEK',
    accentColor = QUOTATION_PDF_ACCENTS.petrotek,
    isSeltec = false,
    salesPersonName,
    salesPersonPhone,
  },
  ref
) {
  const customers = Array.isArray(quotation?.customerDetails) ? quotation.customerDetails : []
  const items = Array.isArray(quotation?.quotationItems) ? quotation.quotationItems : []
  const { subTotal, vat, total } = quotationTotals(quotation)
  const amountInWords = resolveQuotationAmountInWords(quotation)
  const rule = accentRule(accentColor)
  const logoStyle = isSeltec
    ? {
        height: '90px',
        maxHeight: '96px',
        width: 'auto',
        maxWidth: '220px',
        objectFit: 'contain',
        display: 'block',
      }
    : {
        width: '440px',
        maxWidth: '65%',
        height: 'auto',
        maxHeight: '96px',
        objectFit: 'contain',
        display: 'block',
      }

  return (
    <article
      ref={ref}
      className="box-border max-w-full"
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
        padding: '8mm 12mm 10mm',
      }}
    >
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {logoSrc ? (
            <img src={logoSrc} alt={logoAlt} style={logoStyle} />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 800,
                color: accentColor,
                letterSpacing: '0.04em',
              }}
            >
              {fallbackTitle}
            </p>
          )}
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: C.slate900,
            }}
          >
            QUOTATION
          </p>
        </div>
        <div
          style={{
            width: '220px',
            maxWidth: '52%',
            marginLeft: 'auto',
            fontSize: '10px',
            lineHeight: 1.5,
            color: C.slate900,
          }}
        >
          {(PETROTEK_COMPANY.headerLines ?? [PETROTEK_COMPANY.name, PETROTEK_COMPANY.contact]).map(
            (line, index) => (
              <p
                key={line}
                style={{
                  margin: index === 0 ? 0 : '2px 0 0',
                  textAlign: 'justify',
                  textAlignLast: 'right',
                }}
              >
                {line}
              </p>
            )
          )}
        </div>
      </header>

      <div style={{ marginTop: '6px', borderTop: rule }} />

      {/* Quote + customer */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginTop: '12px',
          alignItems: 'start',
        }}
      >
        <div>
          <LabelValue label="Quote No :" value={quotation?.quoteNo} />
          <LabelValue label="Dated :" value={formatQuotationPdfDate(quotation?.date)} />
          <LabelValue label="Enquiry Ref :" value={quotation?.ref} />
          <LabelValue label="Sales Person :" value={salesPersonName} />
          <LabelValue label="Sales Direct No :" value={salesPersonPhone} />
          <LabelValue label="TRN :" value={quotation?.trn} />
        </div>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: C.slate900 }}>
            Customer details:
          </p>
          {customers.length > 0 ? (
            customers.map((row, index) => <CustomerBlock key={index} customer={row} index={index} />)
          ) : (
            <CustomerBlock customer={{}} index={0} />
          )}
        </div>
      </section>

      <div style={{ marginTop: '12px', borderTop: rule }} />

      {/* Items table */}
      <section style={{ marginTop: '10px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10px',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ borderBottom: rule }}>
              {['No.', 'ITEM NO', 'ITEM DESCRIPTION', 'QUANTITY', 'UNIT PRICE', 'TOTAL/AED'].map((head, i) => (
                <th
                  key={head}
                  style={{
                    padding: '6px 4px',
                    fontWeight: 700,
                    textAlign: i >= 3 ? 'right' : 'left',
                    verticalAlign: 'bottom',
                    width:
                      i === 0
                        ? '6%'
                        : i === 1
                          ? '12%'
                          : i === 2
                            ? '38%'
                            : i === 3
                              ? '10%'
                              : i === 4
                                ? '16%'
                                : '18%',
                  }}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row, index) => (
              <tr key={index} style={{ verticalAlign: 'top' }}>
                <td style={{ padding: '8px 4px 10px', textAlign: 'left' }}>{index + 1}</td>
                <td style={{ padding: '8px 4px 10px', wordBreak: 'break-word' }}>{row.itemCode || '—'}</td>
                <td
                  style={{
                    padding: '8px 4px 10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.45,
                  }}
                >
                  {row.item || '—'}
                </td>
                <td style={{ padding: '8px 4px 10px', textAlign: 'right' }}>{row.itemQuantity || '—'}</td>
                <td style={{ padding: '8px 4px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatQuotationMoney(row.itemUnitPrice)}
                </td>
                <td style={{ padding: '8px 4px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatQuotationMoney(row.itemTotalPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Flexible space between table and totals */}
      <div style={{ flex: '1 1 auto', minHeight: '20mm' }} aria-hidden="true" />
      </div>

      {/* Totals — pinned just above footer */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '24px',
          flexShrink: 0,
          paddingTop: '14px',
          alignItems: 'start',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <div style={{ fontSize: '11px', lineHeight: 1.55, color: C.slate900 }}>
          <p style={{ margin: '0 0 6px' }}>
            <span>Amount : </span>
            <strong>{amountInWords || '—'}</strong>
          </p>
          <p style={{ margin: '0 0 4px' }}>Currency: {QUOTATION_DEFAULT_TERMS.currency}</p>
          <p style={{ margin: '0 0 4px' }}>Payment: {QUOTATION_DEFAULT_TERMS.payment}</p>
          <p style={{ margin: '0 0 4px' }}>Lead time: {QUOTATION_DEFAULT_TERMS.leadTime}</p>
          <p style={{ margin: '0 0 4px' }}>Delivery: {QUOTATION_DEFAULT_TERMS.delivery}</p>
          <p style={{ margin: 0 }}>Quotation validity {QUOTATION_DEFAULT_TERMS.validity}</p>
        </div>
        <div style={{ fontSize: '11px', color: C.slate900 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>Sub Total</span>
            <span>{formatQuotationMoney(subTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>VAT 5%</span>
            <span>{formatQuotationMoney(vat)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '12px',
              marginTop: '4px',
            }}
          >
            <span>TOTAL</span>
            <span>{formatQuotationMoney(total)}</span>
          </div>
        </div>
      </section>

      {/* Footer — General terms pinned to bottom of page */}
      <footer
        style={{
          flexShrink: 0,
          marginTop: '14px',
          paddingTop: '14px',
          borderTop: `1px solid ${C.slate200}`,
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
        <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: C.slate900 }}>
          General Terms &amp; Conditions:
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: '14px',
            fontSize: '8.5px',
            lineHeight: 1.5,
            color: C.slate900,
          }}
        >
          {QUOTATION_GENERAL_TERMS.map((line) => (
            <li key={line} style={{ marginBottom: '3px' }}>
              {line}
            </li>
          ))}
        </ul>
      </footer>
    </article>
  )
})

export default QuotationPdfHtml
