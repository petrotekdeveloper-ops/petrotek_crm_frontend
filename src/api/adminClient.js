import axios from 'axios'

export const ADMIN_TOKEN_KEY = 'crm_admin_token'

const raw = import.meta.env.VITE_API_URL
const baseURL =
  typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\/$/, '') : ''

export const adminApi = axios.create({
  baseURL: baseURL || undefined,
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
