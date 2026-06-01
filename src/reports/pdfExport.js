import html2pdf from 'html2pdf.js'

/** Printable width (mm): A4 210mm minus default side margins (8 + 8). */
export const REPORT_CONTENT_MM = 194

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

/** Render a hidden report element to PDF and trigger download. */
export async function exportElementToPdf(domElement, fileName) {
  if (!domElement) {
    throw new Error('exportElementToPdf: missing DOM element')
  }
  const opt = { ...PDF_EXPORT_OPTIONS, filename: fileName }
  const chain = html2pdf().set(opt).from(domElement).save()
  if (chain != null && typeof chain.then === 'function') {
    await chain
  }
}

/** @deprecated Use exportElementToPdf — kept for sales dashboard import path. */
export async function exportSalesMonthlyReportElementToPdf(domElement, fileName) {
  return exportElementToPdf(domElement, fileName)
}
