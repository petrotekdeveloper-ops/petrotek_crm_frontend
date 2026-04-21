import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import SalesMonthlyReportHtml, {
  exportSalesMonthlyReportElementToPdf,
} from '../../reports/SalesMonthlyReportHtml.jsx'
import { useMonthState } from '../../hooks/useMonthState.js'
import { formatMoney, formatSaleDate, monthLabel } from '../../lib/format.js'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import { field, fieldTextarea, btnPrimary } from '../../lib/salesFormStyles.js'
import petrotekLogo from '../../assets/logo.png'
import seltecLogo from '../../assets/seltecLogo.png'

const actionIconBtnClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900'

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function StatCard({ label, value, hint, accent = 'slate', progress = null, progressClassName = '' }) {
  const accents = {
    slate: {
      card: 'border-slate-200/80 from-slate-100/70 via-white to-slate-200/50',
      iconWrap: 'bg-slate-700 text-white ring-slate-300/80',
      glow: 'bg-slate-400/30',
    },
    red: {
      card: 'border-rose-200/80 from-rose-100/70 via-white to-red-200/50',
      iconWrap: 'bg-rose-600 text-white ring-rose-300/80',
      glow: 'bg-rose-400/35',
    },
    indigo: {
      card: 'border-indigo-200/80 from-indigo-100/70 via-white to-blue-200/50',
      iconWrap: 'bg-indigo-600 text-white ring-indigo-300/80',
      glow: 'bg-indigo-400/35',
    },
    emerald: {
      card: 'border-emerald-200/80 from-emerald-100/70 via-white to-green-200/50',
      iconWrap: 'bg-emerald-600 text-white ring-emerald-300/80',
      glow: 'bg-emerald-400/35',
    },
  }
  const a = accents[accent] ?? accents.slate
  return (
    <article className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${a.card}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${a.glow}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
            {label}
          </p>
          <p className="mt-1.5 break-words text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${a.iconWrap}`}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M4 13h4l3 6 4-13 3 7h2" />
          </svg>
        </span>
      </div>
      {progress != null ? (
        <div className="relative mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/70 ring-1 ring-slate-200/70">
            <div
              className={`h-full rounded-full transition-all ${progressClassName || 'bg-gradient-to-r from-red-500 to-red-700'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
      {hint ? <p className="relative mt-2 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

export default function SalesDashboard({ user, onLogout }) {
  const isSeltecUser = String(user?.company || '').toLowerCase() === 'seltec'
  const companyLogoSrc = isSeltecUser ? seltecLogo : petrotekLogo
  const companyLogoAlt = isSeltecUser ? 'Seltec' : 'Petrotek'

  const { year, month, goPrev, goNext } = useMonthState()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dailySales, setDailySales] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [addLogOpen, setAddLogOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [pdfExport, setPdfExport] = useState(null)
  const reportPdfRef = useRef(null)
  const [form, setForm] = useState({ date: todayIso(), amount: '', note: '' })

  const ymQuery = useMemo(() => `year=${year}&month=${month}`, [year, month])

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const [{ data: summaryData }, { data: dailyData }] = await Promise.all([
        api.get(`/api/sales/summary?${ymQuery}`),
        api.get(`/api/sales/daily?${ymQuery}`),
      ])
      setSummary(summaryData ?? null)
      setDailySales(Array.isArray(dailyData?.dailySales) ? dailyData.dailySales : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Your account cannot access sales tools. Contact your administrator.')
      } else {
        setError('Could not load dashboard data.')
      }
      setSummary(null)
      setDailySales([])
    } finally {
      setLoading(false)
    }
  }, [ymQuery])

  useEffect(() => {
    load()
  }, [load])

  const target = summary?.monthlyTargetAmount ?? summary?.teamTargetAmount
  const myTotal = summary?.myTotalSales ?? 0
  const remaining = summary?.remaining
  const pct =
    target != null && target > 0
      ? Math.min(100, Math.round((myTotal / target) * 100))
      : null
  const addEntryBtnClass = isSeltecUser
    ? 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
    : btnPrimary
  const tableHeadClass = isSeltecUser
    ? 'bg-blue-50/80 text-blue-900/80'
    : 'bg-red-50/80 text-red-900/80'

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!form.date || form.amount === '') {
      setError('Enter date and amount.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/sales/daily', {
        date: form.date,
        amount: Number(form.amount),
        note: form.note || undefined,
      })
      setForm({ date: todayIso(), amount: '', note: '' })
      await load()
      setAddLogOpen(false)
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Could not save entry.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this daily entry?')) return
    try {
      await api.delete(`/api/sales/daily/${id}`)
      await load()
    } catch {
      setError('Could not delete entry.')
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing) return
    const dateStr =
      editing._dateInput ??
      (editing.saleDate
        ? new Date(editing.saleDate).toISOString().slice(0, 10)
        : '')
    setSaving(true)
    try {
      await api.put(`/api/sales/daily/${editing._id}`, {
        date: dateStr,
        amount: Number(editing.amount),
        note: editing.note ?? '',
      })
      setEditing(null)
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  async function downloadMonthlyReportPdf() {
    if (!dailySales.length) {
      setError('No sales logs available for this month to export.')
      return
    }
    if (reporting) return

    setError('')
    setReporting(true)
    try {
      const resolveLogoForPdf = async (src) => {
        if (!src) return null
        try {
          const response = await fetch(src)
          const blob = await response.blob()
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
          return typeof dataUrl === 'string' ? dataUrl : src
        } catch {
          return src
        }
      }
      const monthTitle = monthLabel(year, month)
      const pdfLogoSrc = await resolveLogoForPdf(companyLogoSrc)
      const monthPart = `${year}-${String(month).padStart(2, '0')}`
      const namePart = String(user?.name || 'user')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const fileName = `sales-report-${namePart || 'user'}-${monthPart}.pdf`

      const payload = {
        monthTitle,
        generatedAt: new Date().toLocaleString(),
        userName: user?.name || 'Sales user',
        userPhone: user?.phone || '',
        companyName: user?.company || 'Petrotek',
        entries: dailySales,
        monthlyTotal: myTotal,
        monthlyTarget: target,
        logoSrc: pdfLogoSrc || companyLogoSrc,
        isSeltecUser,
        fileName,
      }

      flushSync(() => {
        setPdfExport(payload)
      })

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })
      await new Promise((resolve) => setTimeout(resolve, 80))

      let el = reportPdfRef.current
      if (!el) {
        await new Promise((resolve) => requestAnimationFrame(resolve))
        el = reportPdfRef.current
      }
      if (!el) {
        throw new Error('PDF container not mounted')
      }

      await exportSalesMonthlyReportElementToPdf(el, fileName)
    } catch (err) {
      console.error('PDF export failed:', err)
      setError('Could not generate PDF report. Please try again.')
    } finally {
      setReporting(false)
      setPdfExport(null)
    }
  }

  const monthPicker = (
    <div className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
      <button
        type="button"
        onClick={goPrev}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800 sm:min-w-[8rem] sm:flex-none">
        {monthLabel(year, month)}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )

  return (
    <DashboardShell
      badge="Sales workspace"
      title="Performance"
      subtitle={`Monthly overview · ${monthLabel(year, month)}`}
      primaryLogoSrc={isSeltecUser ? seltecLogo : undefined}
      primaryLogoAlt={isSeltecUser ? 'Seltec' : 'Petrotek'}
      user={user}
      onLogout={onLogout}
      logoutConfirm={{
        enabled: true,
        title: 'Log out from sales workspace?',
        message: 'You will be signed out and returned to the login page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
        confirmTone: isSeltecUser ? 'blue' : 'red',
      }}
      actions={<SalesWorkspaceHeader endSlot={monthPicker} />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Monthly target"
          value={target != null ? formatMoney(target) : 'Not set'}
          hint="Goal set for this month"
          accent="slate"
        />
        <StatCard
          label="Sales this month"
          value={loading ? '…' : formatMoney(myTotal)}
          hint="Total logged amount"
          accent="red"
        />
        <StatCard
          label="Remaining"
          value={remaining != null ? formatMoney(remaining) : '—'}
          hint="Target − current total"
          accent="indigo"
        />
        <StatCard
          label="Progress"
          value={pct != null ? `${pct}%` : '—'}
          hint="Completion toward target"
          accent="emerald"
          progress={pct ?? 0}
          progressClassName={isSeltecUser ? 'bg-gradient-to-r from-blue-500 to-blue-700' : 'bg-gradient-to-r from-red-500 to-red-700'}
        />
      </div>

      <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100 sm:mt-8">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900">Your daily logs</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Entries for {monthLabel(year, month)}.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={downloadMonthlyReportPdf}
                disabled={loading || !dailySales.length || reporting}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:py-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v1a2 2 0 002 2h12a2 2 0 002-2v-1" />
                </svg>
                {reporting ? 'Generating PDF...' : 'Report PDF'}
              </button>
              <button
                type="button"
                onClick={() => setAddLogOpen(true)}
                className={`${addEntryBtnClass} w-full sm:w-auto sm:min-w-[10rem]`}
              >
                Add daily log
              </button>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">Loading…</p>
        ) : dailySales.length === 0 ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No entries yet for this month.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className={`${tableHeadClass} text-xs font-semibold uppercase tracking-wide`}>
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                    <th className="px-4 py-3 text-right sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailySales.map((row) => (
                    <tr key={row._id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {formatSaleDate(row.saleDate)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <button
                          type="button"
                          title="View entry"
                          aria-label="View entry"
                          className={actionIconBtnClass}
                          onClick={() => setViewing(row)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Edit entry"
                          aria-label="Edit entry"
                          className={`${actionIconBtnClass} ml-1`}
                          onClick={() =>
                            setEditing({
                              ...row,
                              _dateInput: row.saleDate
                                ? new Date(row.saleDate).toISOString().slice(0, 10)
                                : '',
                            })
                          }
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Delete entry"
                          aria-label="Delete entry"
                          className={`${actionIconBtnClass} ml-1 border-red-100 text-red-700 hover:bg-red-50 hover:text-red-800`}
                          onClick={() => handleDelete(row._id)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {dailySales.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatSaleDate(row.saleDate)}
                      </p>
                      {row.note ? (
                        <p className="mt-1 break-words text-sm text-slate-600">{row.note}</p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-400">—</p>
                      )}
                    </div>
                    <p className="shrink-0 text-base font-semibold tabular-nums text-slate-900">
                      {formatMoney(row.amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="View entry"
                    className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    onClick={() => setViewing(row)}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
                    </svg>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      aria-label="Edit entry"
                      className="min-h-[44px] flex-1 touch-manipulation rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                      onClick={() =>
                        setEditing({
                          ...row,
                          _dateInput: row.saleDate
                            ? new Date(row.saleDate).toISOString().slice(0, 10)
                            : '',
                        })
                      }
                    >
                      <span className="sr-only">Edit</span>
                      <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete entry"
                      className="min-h-[44px] flex-1 touch-manipulation rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                      onClick={() => handleDelete(row._id)}
                    >
                      <span className="sr-only">Delete</span>
                      <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(90dvh,90vh)] w-full max-w-[min(100%,42rem)] overflow-y-auto rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 sm:max-h-[min(85vh,85dvh)] sm:rounded-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300"
            role="dialog"
            aria-labelledby="sales-edit-entry-title"
            aria-modal="true"
          >
            <div
              className={`h-1 w-full ${isSeltecUser ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}
              aria-hidden
            />
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={companyLogoSrc}
                    alt={companyLogoAlt}
                    className="h-10 w-auto shrink-0 object-contain sm:h-11"
                  />
                  <div className="min-w-0">
                    <h3 id="sales-edit-entry-title" className="text-lg font-semibold tracking-tight text-slate-900">
                      Edit entry
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Update this log · {monthLabel(year, month)}
                    </p>
                  </div>
                </div>
              </div>
              <form onSubmit={saveEdit} className="pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                    <label
                      htmlFor="sales-edit-date"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Date
                    </label>
                    <input
                      id="sales-edit-date"
                      type="date"
                      required
                      value={editing._dateInput ?? ''}
                      onChange={(e) =>
                        setEditing((x) => ({ ...x, _dateInput: e.target.value }))
                      }
                      className={field}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                    <label
                      htmlFor="sales-edit-amount"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Amount
                    </label>
                    <input
                      id="sales-edit-amount"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={editing.amount}
                      onChange={(e) => setEditing((x) => ({ ...x, amount: e.target.value }))}
                      className={field}
                      inputMode="decimal"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                  <label
                    htmlFor="sales-edit-note"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Note
                  </label>
                  <textarea
                    id="sales-edit-note"
                    rows={3}
                    value={editing.note ?? ''}
                    onChange={(e) => setEditing((x) => ({ ...x, note: e.target.value }))}
                    className={fieldTextarea}
                    placeholder="Customer, channel, reference..."
                  />
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:min-h-0 sm:py-2"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`${addEntryBtnClass} min-h-[44px] w-full touch-manipulation sm:min-h-0 sm:w-auto sm:min-w-[9rem]`}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {addLogOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(90dvh,90vh)] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:max-h-[min(85vh,85dvh)] sm:max-w-2xl sm:rounded-2xl sm:p-6 sm:pb-6"
            role="dialog"
            aria-labelledby="sales-add-entry-title"
            aria-modal="true"
          >
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img src={companyLogoSrc} alt={companyLogoAlt} className="h-10 w-auto shrink-0 object-contain sm:h-12" />
                <div className="min-w-0">
                  <h3 id="sales-add-entry-title" className="text-lg font-semibold text-slate-900">
                    Add daily log
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a new entry for {monthLabel(year, month)}.
                  </p>
                </div>
              </div>
            </div>
            <form onSubmit={handleAdd} className="pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                  <label
                    htmlFor="sales-log-date"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Date
                  </label>
                  <input
                    id="sales-log-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className={field}
                  />
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                  <label
                    htmlFor="sales-log-amount"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Amount
                  </label>
                  <input
                    id="sales-log-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className={field}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
                <label htmlFor="sales-log-note" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Note <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="sales-log-note"
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className={fieldTextarea}
                  placeholder="Customer, channel, reference..."
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">Tip: add one entry per meaningful sale update.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:py-2"
                    onClick={() => setAddLogOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`${addEntryBtnClass} w-full touch-manipulation sm:w-auto sm:min-w-[10rem]`}
                  >
                    {saving ? 'Saving…' : 'Add entry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {viewing ? (
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(90dvh,90vh)] w-full max-w-[min(100%,28rem)] overflow-y-auto rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 sm:max-h-[min(85vh,85dvh)] sm:rounded-2xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300"
            role="dialog"
            aria-labelledby="sales-view-entry-title"
            aria-modal="true"
          >
            <div
              className={`h-1 w-full ${isSeltecUser ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}
              aria-hidden
            />
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={companyLogoSrc}
                    alt={companyLogoAlt}
                    className="h-10 w-auto shrink-0 object-contain sm:h-11"
                  />
                  <div className="min-w-0">
                    <h3 id="sales-view-entry-title" className="text-lg font-semibold tracking-tight text-slate-900">
                      Entry details
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {formatSaleDate(viewing.saleDate)} · {monthLabel(year, month)}
                    </p>
                  </div>
                </div>
              </div>
              <dl className="mt-4 overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40">
                {[
                  ['Date', formatSaleDate(viewing.saleDate)],
                  ['Amount', formatMoney(viewing.amount)],
                  ['Logged at', formatDateTime(viewing.createdAt)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-5"
                  >
                    <dt className="w-[38%] shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </dt>
                    <dd className="min-w-0 flex-1 text-right text-sm font-medium leading-snug text-slate-900">
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Note</dt>
                  <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
                    {viewing.note || '—'}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  className={`${addEntryBtnClass} min-h-[44px] w-full px-6 py-2.5 text-sm font-semibold shadow-sm sm:min-h-0 sm:w-auto`}
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pdfExport ? (
        <SalesMonthlyReportHtml
          ref={reportPdfRef}
          monthTitle={pdfExport.monthTitle}
          generatedAt={pdfExport.generatedAt}
          userName={pdfExport.userName}
          userPhone={pdfExport.userPhone}
          companyName={pdfExport.companyName}
          entries={pdfExport.entries}
          monthlyTotal={pdfExport.monthlyTotal}
          monthlyTarget={pdfExport.monthlyTarget}
          logoSrc={pdfExport.logoSrc}
          isSeltecUser={pdfExport.isSeltecUser}
          aria-hidden
        />
      ) : null}
    </DashboardShell>
  )
}
