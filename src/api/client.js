import axios from 'axios'

export const TOKEN_KEY = 'crm_user_token'

const raw = import.meta.env.VITE_API_URL
const baseURL =
  typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\/$/, '') : ''

export const api = axios.create({
  baseURL: baseURL || undefined,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
