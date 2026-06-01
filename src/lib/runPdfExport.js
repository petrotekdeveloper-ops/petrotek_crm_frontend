import { exportElementToPdf } from '../reports/pdfExport.js'

/** Mount off-screen report, wait for layout, then save PDF. */
export async function runPdfExport({ setPayload, flushSync, reportRef, payload, fileName }) {
  flushSync(() => {
    setPayload(payload)
  })

  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
  await new Promise((resolve) => setTimeout(resolve, 80))

  let el = reportRef.current
  if (!el) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    el = reportRef.current
  }
  if (!el) {
    throw new Error('PDF report container not mounted')
  }

  await exportElementToPdf(el, fileName)
}
