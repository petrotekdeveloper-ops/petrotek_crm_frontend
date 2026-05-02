import axios from 'axios'

export const FINANCE_TOKEN_KEY = 'crm_finance_token'

const raw = import.meta.env.VITE_API_URL
const baseURL =
  typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\/$/, '') : ''

export const financeApi = axios.create({
  baseURL: baseURL || undefined,
  headers: { 'Content-Type': 'application/json' },
})

financeApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(FINANCE_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
