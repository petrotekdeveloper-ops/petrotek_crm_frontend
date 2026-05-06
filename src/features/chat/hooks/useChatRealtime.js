import { useEffect, useRef, useState } from 'react'
import { createChatSocket } from '../../../realtime/chatSocket.js'

export function useChatRealtime({
  mode,
  selectedConversationId,
  onIncomingMessage,
  onConversationUpdated,
  onReadUpdated,
}) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = createChatSocket(mode)
    if (!socket) return undefined
    socketRef.current = socket

    const handleConnect = () => setConnected(true)
    const handleDisconnect = () => setConnected(false)
    const handleMessage = (payload) => {
      if (typeof onIncomingMessage === 'function') onIncomingMessage(payload)
    }
    const handleConversationUpdate = (payload) => {
      if (typeof onConversationUpdated === 'function') onConversationUpdated(payload)
    }
    const handleReadUpdate = (payload) => {
      if (typeof onReadUpdated === 'function') onReadUpdated(payload)
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:message:new', handleMessage)
    socket.on('chat:conversation:updated', handleConversationUpdate)
    socket.on('chat:read:updated', handleReadUpdate)

    return () => {
      socketRef.current = null
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:message:new', handleMessage)
      socket.off('chat:conversation:updated', handleConversationUpdate)
      socket.off('chat:read:updated', handleReadUpdate)
      socket.disconnect()
    }
  }, [mode, onConversationUpdated, onIncomingMessage, onReadUpdated])

  useEffect(() => {
    if (!selectedConversationId || !connected) return
    const socket = socketRef.current
    if (!socket) return
    socket.emit('chat:conversation:join', { conversationId: selectedConversationId })
  }, [connected, selectedConversationId])

  return { connected }
}
