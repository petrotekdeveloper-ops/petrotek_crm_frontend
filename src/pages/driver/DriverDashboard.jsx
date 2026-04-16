import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { api } from '../../api'
import DashboardShell from '../../components/DashboardShell.jsx'
import { btnGhost, btnPrimary, field, fieldTextarea } from '../../lib/salesFormStyles.js'

function InfoCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 sm:text-base">
        {value || '—'}
      </p>
    </div>
  )
}

function toDateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function formatTripDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

function normalizeTripForm(values) {
  return {
    tripDate: values.tripDate,
    pickupLocation: values.pickupLocation.trim(),
    dropLocation: values.dropLocation.trim(),
    distance: Number(values.distance),
    notes: values.notes.trim(),
  }
}

export default function DriverDashboard({ user, onLogout }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    tripDate: '',
    pickupLocation: '',
    dropLocation: '',
    distance: '',
    notes: '',
  })

  const hasTrips = trips.length > 0
  const totalDistance = useMemo(
    () => trips.reduce((sum, row) => sum + (Number(row.distance) || 0), 0),
    [trips]
  )

  const loadTrips = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/api/trips')
      setTrips(Array.isArray(data?.trips) ? data.trips : [])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setError('Only approved driver accounts can access trips.')
      } else {
        setError('Could not load trips.')
      }
      setTrips([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  function updateForm(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleCreateTrip(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/api/trips', normalizeTripForm(form))
      setForm({
        tripDate: '',
        pickupLocation: '',
        dropLocation: '',
        distance: '',
        notes: '',
      })
      await loadTrips()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to create trip.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTrip(id) {
    if (!window.confirm('Delete this trip?')) return
    setError('')
    try {
      await api.delete(`/api/trips/${id}`)
      await loadTrips()
    } catch {
      setError('Failed to delete trip.')
    }
  }

  function openEdit(row) {
    setEditing({
      ...row,
      _tripDateInput: toDateInput(row.tripDate),
      _pickupInput: row.pickupLocation ?? '',
      _dropInput: row.dropLocation ?? '',
      _distanceInput: row.distance ?? '',
      _notesInput: row.notes ?? '',
    })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/api/trips/${editing._id}`, {
        tripDate: editing._tripDateInput,
        pickupLocation: editing._pickupInput,
        dropLocation: editing._dropInput,
        distance: Number(editing._distanceInput),
        notes: editing._notesInput,
      })
      setEditing(null)
      await loadTrips()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
      setError(typeof msg === 'string' ? msg : 'Failed to update trip.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell
      badge="Driver Portal"
      title="Driver dashboard"
      subtitle="Your account, vehicle details, and trip logs"
      user={user}
      onLogout={onLogout}
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:mb-6"
        >
          {error}
        </div>
      ) : null}

      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Add trip</h2>
          <p className="mt-1 text-sm text-slate-500">Log your pickup, drop, date, and distance.</p>
        </div>
        <form onSubmit={handleCreateTrip} className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="trip-date" className="mb-1 block text-xs font-medium text-slate-600">
              Trip date
            </label>
            <input
              id="trip-date"
              type="date"
              required
              className={field}
              value={form.tripDate}
              onChange={(e) => updateForm('tripDate', e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="trip-distance" className="mb-1 block text-xs font-medium text-slate-600">
              Distance
            </label>
            <input
              id="trip-distance"
              type="number"
              min={0}
              step="0.01"
              required
              inputMode="decimal"
              className={field}
              value={form.distance}
              onChange={(e) => updateForm('distance', e.target.value)}
              placeholder="e.g. 14.5"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="trip-pickup" className="mb-1 block text-xs font-medium text-slate-600">
              Pickup location
            </label>
            <input
              id="trip-pickup"
              type="text"
              required
              className={field}
              value={form.pickupLocation}
              onChange={(e) => updateForm('pickupLocation', e.target.value)}
              placeholder="Pickup point"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="trip-drop" className="mb-1 block text-xs font-medium text-slate-600">
              Drop location
            </label>
            <input
              id="trip-drop"
              type="text"
              required
              className={field}
              value={form.dropLocation}
              onChange={(e) => updateForm('dropLocation', e.target.value)}
              placeholder="Drop point"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="trip-notes" className="mb-1 block text-xs font-medium text-slate-600">
              Notes
            </label>
            <textarea
              id="trip-notes"
              rows={3}
              className={fieldTextarea}
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
              {saving ? 'Saving…' : 'Save trip'}
            </button>
          </div>
        </form>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Your trips</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              Trips: {trips.length}
            </p>
            <p className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              Distance: {totalDistance.toFixed(2)}
            </p>
          </div>
          {!hasTrips ? <p className="mt-2 text-sm text-slate-500">No trips logged yet.</p> : null}
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">Loading…</p>
        ) : !hasTrips ? (
          <p className="p-6 text-center text-slate-500 sm:p-8">No trips yet.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Date</th>
                    <th className="px-4 py-3 sm:px-6">Pickup</th>
                    <th className="px-4 py-3 sm:px-6">Drop</th>
                    <th className="px-4 py-3 text-right sm:px-6">Distance</th>
                    <th className="px-4 py-3 sm:px-6">Notes</th>
                    <th className="px-4 py-3 text-right sm:px-6"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trips.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">
                        {formatTripDate(row.tripDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 sm:px-6">{row.pickupLocation}</td>
                      <td className="px-4 py-3 text-slate-700 sm:px-6">{row.dropLocation}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 sm:px-6">
                        {Number(row.distance || 0).toFixed(2)}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 sm:px-6">
                        {row.notes || '—'}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <button type="button" className={btnGhost} onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${btnGhost} ml-1 text-red-700`}
                          onClick={() => handleDeleteTrip(row._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden">
              {trips.map((row) => (
                <li key={row._id} className="px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatTripDate(row.tripDate)}
                  </p>
                  <p className="mt-2 text-sm text-slate-800">
                    <span className="font-semibold">Pickup:</span> {row.pickupLocation}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    <span className="font-semibold">Drop:</span> {row.dropLocation}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    <span className="font-semibold">Distance:</span>{' '}
                    {Number(row.distance || 0).toFixed(2)}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">Notes:</span> {row.notes || '—'}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
                    <button
                      type="button"
                      className="min-h-[44px] w-full touch-manipulation rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] w-full touch-manipulation rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                      onClick={() => handleDeleteTrip(row._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="max-h-[min(90dvh,90vh)] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:max-h-[min(85vh,85dvh)] sm:max-w-md sm:rounded-2xl sm:p-6 sm:pb-6"
            role="dialog"
            aria-labelledby="trip-edit-title"
            aria-modal="true"
          >
            <h3 id="trip-edit-title" className="text-lg font-semibold text-slate-900">
              Edit trip
            </h3>
            <form onSubmit={saveEdit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="trip-edit-date" className="mb-1 block text-xs font-medium text-slate-600">
                  Trip date
                </label>
                <input
                  id="trip-edit-date"
                  type="date"
                  required
                  className={field}
                  value={editing._tripDateInput}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, _tripDateInput: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="trip-edit-pickup" className="mb-1 block text-xs font-medium text-slate-600">
                  Pickup location
                </label>
                <input
                  id="trip-edit-pickup"
                  type="text"
                  required
                  className={field}
                  value={editing._pickupInput}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, _pickupInput: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="trip-edit-drop" className="mb-1 block text-xs font-medium text-slate-600">
                  Drop location
                </label>
                <input
                  id="trip-edit-drop"
                  type="text"
                  required
                  className={field}
                  value={editing._dropInput}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, _dropInput: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="trip-edit-distance" className="mb-1 block text-xs font-medium text-slate-600">
                  Distance
                </label>
                <input
                  id="trip-edit-distance"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  inputMode="decimal"
                  className={field}
                  value={editing._distanceInput}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, _distanceInput: e.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="trip-edit-notes" className="mb-1 block text-xs font-medium text-slate-600">
                  Notes
                </label>
                <textarea
                  id="trip-edit-notes"
                  rows={3}
                  className={fieldTextarea}
                  value={editing._notesInput}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, _notesInput: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:min-h-0 sm:py-2"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={`${btnPrimary} w-full sm:w-auto`}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  )
}
