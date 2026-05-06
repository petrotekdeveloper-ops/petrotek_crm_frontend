import { io } from 'socket.io-client'
import { ADMIN_TOKEN_KEY, TOKEN_KEY } from '../api'

function resolveSocketUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/$/, '')
  return window.location.origin
}

export function createChatSocket(mode) {
  const tokenKey = mode === 'admin' ? ADMIN_TOKEN_KEY : TOKEN_KEY
  const token = localStorage.getItem(tokenKey)
  if (!token) return null

  return io(resolveSocketUrl(), {
    transports: ['websocket'],
    auth: { token },
  })
}
