import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createDirectConversation,
  listAdminChatTargets,
  listConversations,
  listManagerTeamChatTargets,
} from '../../../api/chatApi.js'
import { toErrorMessage } from '../utils/chatHelpers.js'

export function useChatConversations({ client, mode, user }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conversations, setConversations] = useState([])
  const [selectedConversationId, setSelectedConversationId] = useState('')
  const [adminTargets, setAdminTargets] = useState([])
  const [teamTargets, setTeamTargets] = useState([])

  const selectedConversation = useMemo(
    () =>
      conversations.find((c) => String(c._id) === String(selectedConversationId)) ||
      null,
    [conversations, selectedConversationId]
  )

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations(client)
    setConversations(rows)
    if (!selectedConversationId && rows.length > 0) {
      setSelectedConversationId(String(rows[0]._id))
    }
    if (
      selectedConversationId &&
      rows.length > 0 &&
      !rows.some((r) => String(r._id) === String(selectedConversationId))
    ) {
      setSelectedConversationId(String(rows[0]._id))
    }
  }, [client, selectedConversationId])

  const loadTargets = useCallback(async () => {
    if (mode === 'admin') {
      const targets = await listAdminChatTargets()
      setAdminTargets(targets)
      return
    }
    if (user?.designation === 'manager') {
      const targets = await listManagerTeamChatTargets()
      setTeamTargets(targets)
    }
  }, [mode, user?.designation])

  const boot = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await Promise.all([refreshConversations(), loadTargets()])
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load chat workspace.'))
    } finally {
      setLoading(false)
    }
  }, [loadTargets, refreshConversations])

  useEffect(() => {
    boot()
  }, [boot])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(id)
  }, [notice])

  const startDirectChat = useCallback(
    async (body) => {
      setError('')
      try {
        const conversation = await createDirectConversation(client, body)
        await refreshConversations()
        if (conversation?._id) setSelectedConversationId(String(conversation._id))
        setNotice('Conversation ready.')
      } catch (err) {
        setError(toErrorMessage(err, 'Could not start conversation.'))
      }
    },
    [client, refreshConversations]
  )

  return {
    loading,
    error,
    notice,
    conversations,
    selectedConversationId,
    selectedConversation,
    adminTargets,
    teamTargets,
    setError,
    setNotice,
    setSelectedConversationId,
    refreshConversations,
    startDirectChat,
  }
}
