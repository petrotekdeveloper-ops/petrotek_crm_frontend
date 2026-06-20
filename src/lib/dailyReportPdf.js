import petrotekLogo from '../assets/logo.png'
import seltecLogo from '../assets/seltecLogo.png'
import { resolveLogoForPdf } from './pdfLogo.js'
import { runPdfExport } from './runPdfExport.js'

function companyNameFromReport(report, fallbackUser) {
  const reportUser = report?.user
  if (reportUser && typeof reportUser === 'object' && reportUser.company) {
    return String(reportUser.company)
  }
  if (fallbackUser?.company) return String(fallbackUser.company)
  return 'Petrotek'
}

function isSeltec(company) {
  return String(company || '').trim().toLowerCase() === 'seltec'
}

function safeName(value, fallback = 'report') {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDatePart(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'date'
  return d.toISOString().slice(0, 10)
}

function buildDailyReportPdfPayload({ report, logoSrc, companyName, fallbackUser, viewerLabel }) {
  const reportUser = report?.user
  const salesExecutiveName =
    reportUser && typeof reportUser === 'object'
      ? reportUser.name || fallbackUser?.name || 'Sales executive'
      : fallbackUser?.name || 'Sales executive'
  return {
    report,
    logoSrc,
    companyName,
    generatedAt: new Date().toLocaleString(),
    salesExecutiveName,
    viewerLabel,
  }
}

function dailyReportPdfFileName(report, fallbackUser) {
  const reportUser = report?.user
  const name =
    reportUser && typeof reportUser === 'object'
      ? reportUser.name || fallbackUser?.name
      : fallbackUser?.name
  return `daily-report-${safeName(name, 'user')}-${formatDatePart(report?.date)}.pdf`
}

export async function exportDailyReportPdf({
  report,
  fallbackUser,
  reportRef,
  setPdfPayload,
  flushSync,
  viewerLabel,
}) {
  const companyName = companyNameFromReport(report, fallbackUser)
  const logoAsset = isSeltec(companyName) ? seltecLogo : petrotekLogo
  const logoSrc = await resolveLogoForPdf(logoAsset)
  const payload = buildDailyReportPdfPayload({
    report,
    logoSrc,
    companyName,
    fallbackUser,
    viewerLabel,
  })
  await runPdfExport({
    setPayload: setPdfPayload,
    flushSync,
    reportRef,
    payload,
    fileName: dailyReportPdfFileName(report, fallbackUser),
  })
}
