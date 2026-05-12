import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import ManagerHeader, { managerShellLogoProps } from '../../components/ManagerHeader.jsx'
import { monthLabel } from '../../lib/format.js'
import { useMonthState } from '../../hooks/useMonthState.js'
import { field } from '../../lib/salesFormStyles.js'

const card =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03] ring-1 ring-slate-900/[0.02]'

/** Backdrop + sheet sit above dashboard chrome (headers ~z-50, other modals in app often &lt; 120). */
const TARGET_PANEL_Z = 120

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function formatAmount(n) {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n))
}

const violetBtn =
  'min-h-[40px] shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0'

const subtleBtn =
  'min-h-[40px] shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:min-h-0'

export default function ManagerServiceHeadAmounts({ user, onLogout }) {
  const { year, month, goPrev, goNext } = useMonthState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [headSummaries, setHeadSummaries] = useState([])
  const [targetDraftById, setTargetDraftById] = useState({})
  const [targetMsg, setTargetMsg] = useState('')
  const [savingHeadId, setSavingHeadId] = useState(null)
  const [targetsPanelOpen, setTargetsPanelOpen] = useState(false)

  const monthPill = useMemo(() => monthLabel(year, month), [year, month])

  const headCount = headSummaries.length
  const headsWithGoal = useMemo(
    () => headSummaries.filter((s) => s.hasTarget).length,
    [headSummaries]
  )

  const load = useCallback(async () => {
    setError('')
    setLoading(true)
    setTargetMsg('')
    const params = new URLSearchParams({ year: String(year), month: String(month) })
    try {
      const { data } = await api.get(`/api/manager/service-head-amount-logs?${params.toString()}`)
      setLogs(Array.isArray(data?.logs) ? data.logs : [])
      setSummary(data?.summary ?? null)
      const list = Array.isArray(data?.serviceHeadSummaries) ? data.serviceHeadSummaries : []
      setHeadSummaries(list)
      const next = {}
      for (const s of list) {
        const id = String(s.serviceHeadUserId)
        next[id] = s.hasTarget && s.targetAmount != null ? String(s.targetAmount) : ''
      }
      setTargetDraftById(next)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('You do not have access to the manager workspace.')
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(String(err.response.data.error))
      } else {
        setError('Could not load service head amount logs.')
      }
      setLogs([])
      setSummary(null)
      setHeadSummaries([])
      setTargetDraftById({})
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!targetsPanelOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [targetsPanelOpen])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape' || !targetsPanelOpen) return
      setTargetsPanelOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [targetsPanelOpen])

  useEffect(() => {
    setTargetsPanelOpen(false)
  }, [year, month])

  const totalAmount = Number(summary?.totalAmount ?? 0)
  const logCount = Number(summary?.logCount ?? 0)

  function updateDraft(id, value) {
    const key = String(id)
    setTargetDraftById((prev) => ({ ...prev, [key]: value }))
  }

  async function saveHeadTarget(serviceHeadUserId) {
    const id = String(serviceHeadUserId)
    const raw = targetDraftById[id] ?? ''
    const trimmed = String(raw).trim()
    setTargetMsg('')
    if (trimmed === '') {
      setTargetMsg('Enter a non-negative target amount.')
      return
    }
    const amt = Number(trimmed)
    if (!Number.isFinite(amt) || amt < 0) {
      setTargetMsg('Target must be a non-negative number.')
      return
    }
    setSavingHeadId(id)
    try {
      await api.put('/api/manager/service-head-target', {
        serviceHeadUserId,
        year,
        month,
        targetAmount: amt,
      })
      setTargetMsg('Target saved.')
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setTargetMsg(typeof msg === 'string' ? msg : 'Could not save target.')
    } finally {
      setSavingHeadId(null)
    }
  }

  async function clearHeadTarget(serviceHeadUserId) {
    if (
      !window.confirm(
        'Remove the monthly amount target for this service head? Achievement data is unchanged.'
      )
    ) {
      return
    }
    const id = String(serviceHeadUserId)
    setSavingHeadId(id)
    setTargetMsg('')
    try {
      await api.delete(
        `/api/manager/service-head-target?serviceHeadUserId=${encodeURIComponent(serviceHeadUserId)}&year=${year}&month=${month}`
      )
      setTargetMsg('Target removed.')
      await load()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setTargetMsg(typeof msg === 'string' ? msg : 'Could not clear target.')
    } finally {
      setSavingHeadId(null)
    }
  }

  function openTargetsPanel() {
    setTargetsPanelOpen(true)
    setTargetMsg('')
  }

  function closeTargetsPanel() {
    setTargetsPanelOpen(false)
    setTargetMsg('')
  }

  const targetsBody =
    loading ? (
      <div className="px-4 py-10 text-center sm:px-6">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    ) : headSummaries.length === 0 ? (
      <div className="px-4 py-10 text-center sm:px-6">
        <p className="text-sm font-medium text-slate-700">No approved service heads</p>
      </div>
    ) : (
      <>
        <ul className="divide-y divide-slate-100 lg:hidden">
          {headSummaries.map((row) => {
            const id = String(row.serviceHeadUserId)
            return (
              <li
                key={id}
                className="space-y-3 px-4 py-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]"
              >
                <div>
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="text-xs text-slate-500">{row.phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] font-medium uppercase text-slate-500">Achieved</p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {formatAmount(row.achievedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase text-slate-500">Remaining</p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      {row.hasTarget ? formatAmount(row.remaining) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Target amount</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className={field}
                      placeholder="Monthly target"
                      value={targetDraftById[id] ?? ''}
                      onChange={(e) => updateDraft(id, e.target.value)}
                      disabled={savingHeadId === id}
                    />
                  </label>
                  <button
                    type="button"
                    className={violetBtn}
                    disabled={savingHeadId === id}
                    onClick={() => saveHeadTarget(row.serviceHeadUserId)}
                  >
                    {savingHeadId === id ? '…' : 'Save'}
                  </button>
                  {row.hasTarget ? (
                    <button
                      type="button"
                      className={subtleBtn}
                      disabled={savingHeadId === id}
                      onClick={() => clearHeadTarget(row.serviceHeadUserId)}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="hidden min-w-0 overflow-x-auto lg:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-slate-50/95 text-xs font-semibold uppercase text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 sm:px-6">Service head</th>
                <th className="px-4 py-3 text-right sm:px-6">Achieved</th>
                <th className="px-4 py-3 text-right sm:px-6">%</th>
                <th className="px-4 py-3 sm:px-6">Monthly target</th>
                <th className="px-4 py-3 text-right sm:px-6">Remaining</th>
                <th className="px-4 py-3 text-right sm:px-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {headSummaries.map((row) => {
                const id = String(row.serviceHeadUserId)
                return (
                  <tr key={id} className="align-middle hover:bg-violet-50/40">
                    <td className="px-4 py-3 sm:px-6">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-800 sm:px-6">
                      {formatAmount(row.achievedAmount)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-violet-900 sm:px-6">
                      {row.progressPct != null ? `${row.progressPct}%` : '—'}
                    </td>
                    <td className="max-w-[200px] px-4 py-3 sm:px-6">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        className={`${field} py-2 text-sm`}
                        placeholder="Enter target"
                        value={targetDraftById[id] ?? ''}
                        onChange={(e) => updateDraft(id, e.target.value)}
                        disabled={savingHeadId === id}
                      />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 sm:px-6">
                      {row.hasTarget ? formatAmount(row.remaining) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                      <button
                        type="button"
                        className={`${violetBtn} me-2 inline-flex min-h-[36px] px-3 py-1.5`}
                        disabled={savingHeadId === id}
                        onClick={() => saveHeadTarget(row.serviceHeadUserId)}
                      >
                        {savingHeadId === id ? '…' : 'Save'}
                      </button>
                      {row.hasTarget ? (
                        <button
                          type="button"
                          className={`${subtleBtn} inline-flex`}
                          disabled={savingHeadId === id}
                          onClick={() => clearHeadTarget(row.serviceHeadUserId)}
                        >
                          Clear
                        </button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )

  return (
    <DashboardShell
      {...managerShellLogoProps(user)}
      badge="Manager workspace"
      title="Service head amounts"
      subtitle={
        <span className="block max-w-full break-words leading-snug">
          Amount entries · set monthly targets · {monthPill}
        </span>
      }
      user={user}
      onLogout={onLogout}
      actionsPlacement="belowHeading"
      actions={<ManagerHeader year={year} month={month} goPrev={goPrev} goNext={goNext} />}
    >
      {error ? (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            className="min-h-[44px] shrink-0 self-start rounded-lg border border-red-200/80 bg-white px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100/80 sm:min-h-0 sm:self-auto"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <article className="min-w-0 rounded-2xl border border-amber-200/90 bg-amber-50 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">Total amount</p>
          <p className="mt-2 break-all text-xl font-semibold tabular-nums text-amber-950 sm:break-normal sm:text-2xl">
            {loading ? '—' : formatAmount(totalAmount)}
          </p>
          <p className="mt-1 break-words text-xs text-amber-900/70">Sum for {monthPill}</p>
        </article>
        <article className="min-w-0 rounded-2xl border border-cyan-200/90 bg-cyan-50 p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-900/80">
            Entries with amount
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-cyan-950 sm:text-2xl">
            {loading ? '—' : String(logCount)}
          </p>
          <p className="mt-1 text-xs text-cyan-900/70">Logs in {monthPill}</p>
        </article>

        <button
          type="button"
          onClick={openTargetsPanel}
          aria-expanded={targetsPanelOpen}
          aria-haspopup="dialog"
          className={`min-w-0 rounded-2xl border p-4 text-left shadow-sm transition sm:p-5 ${
            targetsPanelOpen
              ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-50'
              : 'border-violet-200/90 bg-gradient-to-br from-white to-violet-50/60 hover:border-violet-400 hover:shadow-md'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/90">
            Service heads
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-violet-950 sm:text-2xl">
            {loading ? '—' : String(headCount)}
          </p>
          <p className="mt-1 break-words text-xs text-violet-900/75">
            {loading
              ? '…'
              : headCount === 0
                ? 'No heads on file'
                : `${headsWithGoal} with a target · Tap to manage`}
          </p>
        </button>
      </section>

      {targetsPanelOpen ? (
        <div
          className="fixed inset-0 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          style={{ zIndex: TARGET_PANEL_Z }}
          onClick={closeTargetsPanel}
        >
          <div
            className={`relative isolate flex max-h-[min(92dvh,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-900/15 sm:max-h-[min(88vh,88dvh)] sm:rounded-2xl`}
            style={{ zIndex: TARGET_PANEL_Z + 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="svc-head-targets-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-4 ps-[max(1.25rem,env(safe-area-inset-left))] pe-[max(1.25rem,env(safe-area-inset-right))] sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                    {monthPill}
                  </p>
                  <h2 id="svc-head-targets-title" className="text-lg font-semibold text-slate-900">
                    Service heads · targets and progress
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {headCount === 0
                      ? 'No approved service heads for this workspace.'
                      : `${headCount} service head${headCount === 1 ? '' : 's'} · update monthly amount targets`}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-[44px] min-w-[44px] shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  aria-label="Close panel"
                  onClick={closeTargetsPanel}
                >
                  ✕
                </button>
              </div>
              {targetMsg ? (
                <div
                  role="status"
                  className="mt-3 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2 text-sm text-violet-950"
                >
                  {targetMsg}
                </div>
              ) : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
              {targetsBody}
            </div>
          </div>
        </div>
      ) : null}

      <section className={`min-w-0 ${card}`}>
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Amount log lines</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
            Date, service head, and recorded amount (read-only).
          </p>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
            <p className="text-sm text-slate-600">Loading…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-12 text-center ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] sm:px-6">
            <p className="font-medium text-slate-800">No amount logs for this selection</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Try another month, or there are no amount entries from service heads yet.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {logs.map((row) => (
                <li
                  key={row._id}
                  className="px-4 py-4 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {formatDate(row.date)}
                  </p>
                  <p className="mt-2 break-words text-base font-semibold leading-snug text-slate-900">
                    {row.serviceUserName}
                  </p>
                  <p className="mt-0.5 break-all text-sm text-slate-500">{row.serviceUserPhone}</p>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-500">Amount</span>
                    <p className="text-right text-xl font-bold tabular-nums tracking-tight text-amber-900">
                      {formatAmount(row.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Service head</th>
                    <th className="px-4 py-3 text-right font-bold sm:px-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-800 sm:px-6">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <p className="font-medium text-slate-900">{row.serviceUserName}</p>
                        <p className="text-xs text-slate-500">{row.serviceUserPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-amber-900 sm:px-6">
                        {formatAmount(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  )
}
