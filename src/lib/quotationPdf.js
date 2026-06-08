import petrotekQuotationLogo from '../assets/logopdf.png'
import seltecQuotationLogo from '../assets/seltecLogo.png'
import { resolveLogoForPdf } from './pdfLogo.js'
import { runPdfExport } from './runPdfExport.js'

export const QUOTATION_PDF_ACCENTS = {
  petrotek: '#dc2626',
  seltec: '#2563eb',
}

export function isSeltecCompanyUser(user) {
  return String(user?.company ?? '').trim().toLowerCase() === 'seltec'
}

export function resolveQuotationPdfBranding(user) {
  const isSeltec = isSeltecCompanyUser(user)
  return {
    isSeltec,
    accentColor: isSeltec ? QUOTATION_PDF_ACCENTS.seltec : QUOTATION_PDF_ACCENTS.petrotek,
    logoAsset: isSeltec ? seltecQuotationLogo : petrotekQuotationLogo,
    logoAlt: isSeltec ? 'Seltec' : 'Petrotek',
    fallbackTitle: isSeltec ? 'SELTEC' : 'PETROTEK',
  }
}

/** Prefer quotation owner company (admin view); fall back to logged-in user. */
export function resolveQuotationPdfBrandingForQuotation(quotation, fallbackUser) {
  const owner = quotation?.salesUserId
  const ownerUser =
    owner && typeof owner === 'object' && owner.company != null ? owner : fallbackUser
  return resolveQuotationPdfBranding(ownerUser ?? fallbackUser)
}

export const PETROTEK_COMPANY = {
  name: 'Petrotek General Trading LLC, P.O. Box:119638, Dubai, UAE',
  contact:
    'Tel: +971 4 2896166   E: lubeinfo@petrotek.ae   W: www.petrotek.ae',
  headerLines: [
    'Petrotek General Trading LLC, P.O. Box:119638,',
    'Dubai, UAE',
    'Tel: +971 4 2896166',
    'E: lubeinfo@petrotek.ae   W: www.petrotek.ae',
  ],
}

export const QUOTATION_DEFAULT_TERMS = {
  currency: 'AED',
  payment: 'As usual',
  leadTime: 'Ex stock, 1-2 days upon order confirm',
  delivery: 'Ex works Dubai',
  validity: '10 days',
}

export const QUOTATION_GENERAL_TERMS = [
  'Prices applicable only if all quantities are purchased together.',
  'The document is electronically generated and is valid without signature.',
  'Any document legalisation and additional certificates will be charged extra.',
  'Product datasheets and safety information are available upon request for technical evaluation.',
  'Stock is subject to prior sale and will not be blocked until the payment is received against the order.',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatQuotationPdfDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.getUTCDate()
  const month = MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day}-${month}-${year}`
}

export function parseQuotationAmount(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export function formatQuotationMoney(value, { withPrefix = true } = {}) {
  const n = parseQuotationAmount(value)
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return withPrefix ? `AED ${formatted}` : formatted
}

/** Subtotal pre-VAT, 5% VAT, and total (uses stored total when present). */
export function quotationTotals(quotation) {
  const subTotal = parseQuotationAmount(quotation?.subTotal)
  const storedTotal = parseQuotationAmount(quotation?.total)
  const vat = Math.round(subTotal * 0.05 * 100) / 100
  const computedTotal = Math.round((subTotal + vat) * 100) / 100
  const total = storedTotal > 0 ? storedTotal : computedTotal
  return { subTotal, vat, total }
}

/** Payable total including VAT (subtotal + 5% VAT). */
export function quotationGrandTotal(quotation) {
  const { subTotal, vat } = quotationTotals(quotation)
  return Math.round((subTotal + vat) * 100) / 100
}

const BELOW_TWENTY = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function wordsUnder1000(n) {
  if (n === 0) return ''
  if (n < 20) return BELOW_TWENTY[n]
  if (n < 100) {
    const tens = Math.floor(n / 10)
    const rest = n % 10
    return rest ? `${TENS[tens]} ${BELOW_TWENTY[rest]}` : TENS[tens]
  }
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  const head = `${BELOW_TWENTY[hundreds]} Hundred`
  return rest ? `${head} ${wordsUnder1000(rest)}` : head
}

function integerToWords(n) {
  if (n === 0) return 'Zero'
  const parts = []
  const scales = [
    [1_000_000_000, 'Billion'],
    [1_000_000, 'Million'],
    [1_000, 'Thousand'],
  ]
  let remaining = n
  for (const [scale, label] of scales) {
    if (remaining >= scale) {
      const count = Math.floor(remaining / scale)
      parts.push(`${wordsUnder1000(count)} ${label}`)
      remaining %= scale
    }
  }
  if (remaining > 0) parts.push(wordsUnder1000(remaining))
  return parts.join(' ')
}

/** Convert a numeric AED amount to words for invoice/quotation display. */
export function amountToWords(amount) {
  const value = parseQuotationAmount(amount)
  if (value <= 0) return ''

  const dirhams = Math.floor(value)
  const fils = Math.round((value - dirhams) * 100)

  const parts = []
  if (dirhams > 0) {
    parts.push(`${integerToWords(dirhams)} Dirham${dirhams === 1 ? '' : 's'}`)
  }
  if (fils > 0) {
    parts.push(`${integerToWords(fils)} Fil${fils === 1 ? '' : 's'}`)
  }

  if (parts.length === 0) return 'Zero Dirhams Only'
  return `${parts.join(' and ')} Only`
}

export function resolveQuotationAmountInWords(quotation) {
  const grandTotal = quotationGrandTotal(quotation)
  if (grandTotal > 0) return amountToWords(grandTotal)
  return String(quotation?.totalWords ?? '').trim()
}

export function quotationPdfFileName(quotation) {
  const quoteNo = String(quotation?.quoteNo ?? 'quotation')
    .trim()
    .replace(/[^\w.-]+/g, '-')
  return `Quotation-${quoteNo || 'document'}.pdf`
}

export function resolveSalesUserForPdf(quotation, fallbackUser) {
  const ref = quotation?.salesUserId
  if (ref && typeof ref === 'object' && ref.name) {
    return { name: ref.name, phone: ref.phone ?? '' }
  }
  return { name: fallbackUser?.name ?? '—', phone: fallbackUser?.phone ?? '—' }
}

export function buildQuotationPdfPayload(quotation, salesUser, branding) {
  const rep = resolveSalesUserForPdf(quotation, salesUser)
  const resolved =
    typeof branding === 'object' && branding != null
      ? branding
      : resolveQuotationPdfBranding(salesUser)
  return {
    quotation,
    logoSrc: resolved.logoSrc ?? resolved.logoAsset ?? null,
    logoAlt: resolved.logoAlt ?? 'Petrotek',
    fallbackTitle: resolved.fallbackTitle ?? 'PETROTEK',
    accentColor: resolved.accentColor ?? QUOTATION_PDF_ACCENTS.petrotek,
    isSeltec: Boolean(resolved.isSeltec),
    salesPersonName: rep.name,
    salesPersonPhone: rep.phone,
    generatedAt: new Date().toLocaleString(),
  }
}

export async function exportQuotationPdf({
  quotation,
  salesUser,
  brandingUser,
  reportRef,
  setPdfPayload,
  flushSync,
}) {
  const branding = resolveQuotationPdfBrandingForQuotation(quotation, brandingUser ?? salesUser)
  const logoSrc = await resolveLogoForPdf(branding.logoAsset)
  const payload = buildQuotationPdfPayload(quotation, salesUser, { ...branding, logoSrc })
  await runPdfExport({
    setPayload: setPdfPayload,
    flushSync,
    reportRef,
    payload,
    fileName: quotationPdfFileName(quotation),
  })
}
