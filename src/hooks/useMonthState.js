import { useState } from 'react'

/** Snapshot of today's calendar month (for pages that do not expose month navigation). */
export function getCurrentYearMonth() {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function useMonthState() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const go = (dy, dm) => {
    let y = year + dy
    let m = month + dm
    if (m > 12) {
      m = 1
      y += 1
    }
    if (m < 1) {
      m = 12
      y -= 1
    }
    setYear(y)
    setMonth(m)
  }
  return { year, month, goPrev: () => go(0, -1), goNext: () => go(0, 1) }
}
