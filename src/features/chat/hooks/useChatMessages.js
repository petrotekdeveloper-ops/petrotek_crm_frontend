import { useCallback, useEffect, useState } from 'react'
import {
  listMessages,
  markConversationRead,
  sendConversationMessage,
} from '../../../api/chatApi.js'
import { toErrorMessage } from '../utils/chatHelpers.js'

export function useChatMessages({ client, selectedConversationId, onAfterSend }) {
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)

  const loadInitialMessages = useCallback(async () => {
    if (!selectedConversationId) {
      setMessages([])
      setHasMore(false)
      setNextCursor(null)
      return
    }
    setLoadingMessages(true)
    setError('')
    try {
      const data = await listMessages(client, selectedConversationId, { limit: 40 })
      setMessages(data.messages)
      setHasMore(Boolean(data?.page?.hasMore))
      setNextCursor(data?.page?.nextCursor || null)
      await markConversationRead(client, selectedConversationId)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load conversation messages.'))
    } finally {
      setLoadingMessages(false)
    }
  }, [client, selectedConversationId])

  useEffect(() => {
    loadInitialMessages()
  }, [loadInitialMessages])

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversationId || !hasMore || !nextCursor || loadingOlder) return
    setLoadingOlder(true)
    try {
      const data = await listMessages(client, selectedConversationId, {
        limit: 30,
        before: nextCursor,
      })
      setMessages((prev) => [...data.messages, ...prev])
      setHasMore(Boolean(data?.page?.hasMore))
      setNextCursor(data?.page?.nextCursor || null)
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load older messages.'))
    } finally {
      setLoadingOlder(false)
    }
  }, [client, hasMore, loadingOlder, nextCursor, selectedConversationId])

  const sendMessage = useCallback(
    async (text) => {
      const cleanText = String(text || '').trim()
      if (!selectedConversationId || !cleanText) return
      setSending(true)
      setError('')
      try {
        const message = await sendConversationMessage(
          client,
          selectedConversationId,
          cleanText
        )
        setMessages((prev) => [...prev, message].filter(Boolean))
        await markConversationRead(client, selectedConversationId)
        if (typeof onAfterSend === 'function') onAfterSend()
      } catch (err) {
        setError(toErrorMessage(err, 'Failed to send message.'))
        throw err
      } finally {
        setSending(false)
      }
    },
    [client, onAfterSend, selectedConversationId]
  )

  const appendIncomingMessage = useCallback((incomingMessage) => {
    if (!incomingMessage?._id) return
    setMessages((prev) => {
      if (prev.some((m) => String(m._id) === String(incomingMessage._id))) return prev
      return [...prev, incomingMessage]
    })
  }, [])

  return {
    messages,
    loadingMessages,
    loadingOlder,
    sending,
    error,
    hasMore,
    setError,
    loadInitialMessages,
    loadOlderMessages,
    sendMessage,
    appendIncomingMessage,
  }
}
