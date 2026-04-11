export function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(Number(n))
}

export function monthLabel(year, month) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}

export function formatSaleDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(d)
}
