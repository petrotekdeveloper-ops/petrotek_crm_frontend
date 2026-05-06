import { adminApi } from './adminClient.js'
import { api } from './client.js'

export async function listConversations(client) {
  const { data } = await client.get('/api/chat/conversations')
  return Array.isArray(data?.conversations) ? data.conversations : []
}

export async function createDirectConversation(client, body) {
  const { data } = await client.post('/api/chat/conversations/direct', body)
  return data?.conversation ?? null
}

export async function listMessages(client, conversationId, options = {}) {
  const params = new URLSearchParams()
  const limit = Number(options.limit)
  if (Number.isFinite(limit) && limit > 0) params.set('limit', String(limit))
  if (options.before) params.set('before', String(options.before))
  const qs = params.toString()
  const url = `/api/chat/conversations/${conversationId}/messages${
    qs ? `?${qs}` : ''
  }`
  const { data } = await client.get(url)
  return {
    messages: Array.isArray(data?.messages) ? data.messages : [],
    page: data?.page ?? { hasMore: false, nextCursor: null },
  }
}

export async function sendConversationMessage(client, conversationId, text) {
  const { data } = await client.post(
    `/api/chat/conversations/${conversationId}/messages`,
    { text }
  )
  return data?.message ?? null
}

export async function markConversationRead(client, conversationId) {
  const { data } = await client.post(`/api/chat/conversations/${conversationId}/read`)
  return Number(data?.markedRead || 0)
}

export async function listAdminChatTargets() {
  const { data } = await adminApi.get('/api/admin/users')
  const users = Array.isArray(data?.users) ? data.users : []
  return users.filter(
    (u) =>
      (u.designation === 'manager' || u.designation === 'sales') &&
      (u.approvalStatus ?? 'approved') === 'approved'
  )
}

export async function listManagerTeamChatTargets() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const { data } = await api.get(`/api/manager/team-summary?year=${year}&month=${month}`)
  return Array.isArray(data?.members) ? data.members : []
}
