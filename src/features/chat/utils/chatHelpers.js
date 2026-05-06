import axios from 'axios'

export function formatChatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

/** Short time for bubbles (e.g. 3:45 PM). */
export function formatMessageTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** List row timestamp like WhatsApp (time today, otherwise short date). */
export function formatChatListTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  if (isYesterday) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function actorKeyFromContext(mode, user) {
  if (mode === 'admin') return 'admin'
  if (!user?._id) return ''
  return `user:${String(user._id)}`
}

export function toErrorMessage(err, fallback) {
  const msg = axios.isAxiosError(err) ? err.response?.data?.error : null
  return typeof msg === 'string' ? msg : fallback
}
