import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import QuotationPdfHtml from '../reports/QuotationPdfHtml.jsx'
import { buildQuotationPdfPayload, exportQuotationPdf } from '../lib/quotationPdf.js'
import { btnGhost, btnPrimary } from '../lib/salesFormStyles.js'
import quotationPdfLogo from '../assets/logopdf.png'

export default function QuotationPdfPreviewModal({
  open,
  quotation,
  salesUser,
  onClose,
  primaryBtnClass = btnPrimary,
}) {
  const reportRef = useRef(null)
  const [pdfPayload, setPdfPayload] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  if (!open || !quotation) return null

  const previewPayload = buildQuotationPdfPayload(quotation, salesUser, quotationPdfLogo)

  async function handleDownload() {
    setError('')
    setDownloading(true)
    try {
      await exportQuotationPdf({
        quotation,
        salesUser,
        reportRef,
        setPdfPayload,
        flushSync,
      })
    } catch {
      setError('Could not generate PDF. Please try again.')
    } finally {
      setDownloading(false)
      setPdfPayload(null)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
        <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-slate-100 shadow-2xl sm:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Quotation PDF</h2>
              <p className="truncate text-sm text-slate-500">{quotation.quoteNo || '—'}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button type="button" className={btnGhost} onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                disabled={downloading}
                className={primaryBtnClass}
                onClick={handleDownload}
              >
                {downloading ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 sm:px-5"
            >
              {error}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
            <div className="mx-auto w-fit rounded-lg border border-slate-200 bg-white shadow-sm">
              <QuotationPdfHtml ref={null} {...previewPayload} />
            </div>
          </div>
        </div>
      </div>

      {pdfPayload ? (
        <div className="pointer-events-none fixed left-[-9999px] top-0 z-0">
          <QuotationPdfHtml ref={reportRef} {...pdfPayload} />
        </div>
      ) : null}
    </>
  )
}
