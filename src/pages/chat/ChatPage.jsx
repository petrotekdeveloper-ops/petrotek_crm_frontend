import { useCallback, useMemo, useState } from 'react'
import DashboardShell from '../../components/DashboardShell.jsx'
import AdminSectionHeaderNav from '../../components/AdminSectionHeaderNav.jsx'
import SalesWorkspaceHeader from '../../components/SalesWorkspaceHeader.jsx'
import ManagerHeader, {
  managerShellLogoProps,
} from '../../components/ManagerHeader.jsx'
import { adminApi, api } from '../../api'
import { useMonthState } from '../../hooks/useMonthState.js'
import { monthLabel } from '../../lib/format.js'
import seltecLogo from '../../assets/seltecLogo.png'
import { useChatConversations } from '../../features/chat/hooks/useChatConversations.js'
import { useChatMessages } from '../../features/chat/hooks/useChatMessages.js'
import { useChatRealtime } from '../../features/chat/hooks/useChatRealtime.js'
import {
  actorKeyFromContext,
  formatChatListTime,
  formatMessageTime,
} from '../../features/chat/utils/chatHelpers.js'

function initials(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
}

function matchesQuery(text, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return String(text || '').toLowerCase().includes(q)
}

export default function ChatPage({ mode, user, onLogout }) {
  const client = mode === 'admin' ? adminApi : api
  const selfActorKey = actorKeyFromContext(mode, user)
  const [messageText, setMessageText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { year, month, goPrev, goNext } = useMonthState()

  const isAdmin = mode === 'admin'
  const isSales = mode === 'user' && user?.designation === 'sales'
  const isManager = mode === 'user' && user?.designation === 'manager'
  const isSeltecUser =
    isSales && String(user?.company || '').toLowerCase() === 'seltec'

  const monthPicker = (
    <div className="inline-flex w-full max-w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto">
      <button
        type="button"
        onClick={goPrev}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="min-w-0 flex-1 text-center text-sm font-medium text-slate-800 sm:min-w-[8rem] sm:flex-none">
        {monthLabel(year, month)}
      </span>
      <button
        type="button"
        onClick={goNext}
        className="min-h-[44px] min-w-[44px] rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-white sm:min-h-0 sm:min-w-0 sm:py-1.5"
        aria-label="Next month"
      >
        →
      </button>
    </div>
  )

  const {
    loading,
    error: conversationError,
    notice,
    conversations,
    selectedConversationId,
    selectedConversation,
    adminTargets,
    teamTargets,
    setError: setConversationError,
    setSelectedConversationId,
    refreshConversations,
    startDirectChat,
  } = useChatConversations({ client, mode, user })

  const {
    messages,
    loadingMessages,
    loadingOlder,
    sending,
    error: messageError,
    hasMore,
    loadOlderMessages,
    sendMessage,
    appendIncomingMessage,
  } = useChatMessages({
    client,
    selectedConversationId,
    onAfterSend: refreshConversations,
  })

  const activeError = conversationError || messageError

  const handleRealtimeIncoming = useCallback(
    ({ conversationId, message }) => {
      if (String(conversationId) === String(selectedConversationId) && message) {
        appendIncomingMessage(message)
      }
      refreshConversations()
    },
    [appendIncomingMessage, refreshConversations, selectedConversationId]
  )

  const handleConversationUpdated = useCallback(() => {
    refreshConversations()
  }, [refreshConversations])

  useChatRealtime({
    mode,
    selectedConversationId,
    onIncomingMessage: handleRealtimeIncoming,
    onConversationUpdated: handleConversationUpdated,
    onReadUpdated: handleConversationUpdated,
  })

  const hasSelectedConversation = useMemo(
    () => Boolean(selectedConversationId),
    [selectedConversationId]
  )

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const name = c.counterpart?.displayName || ''
      const preview = c.lastMessageText || ''
      return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q)
    })
  }, [conversations, searchQuery])

  const filteredAdminTargets = useMemo(() => {
    if (mode !== 'admin') return []
    return adminTargets.filter((u) => {
      const line = `${u.name} ${u.phone || ''} ${u.designation || ''}`
      return matchesQuery(line, searchQuery)
    })
  }, [adminTargets, mode, searchQuery])

  const filteredTeamTargets = useMemo(() => {
    if (mode === 'admin' || user?.designation !== 'manager') return []
    return teamTargets.filter((m) =>
      matchesQuery(`${m.name} ${m.phone || ''}`, searchQuery)
    )
  }, [mode, teamTargets, user?.designation, searchQuery])

  const showContactsBlock =
    Boolean(searchQuery.trim()) &&
    (mode === 'admin' || user?.designation === 'manager')

  async function submitMessage(e) {
    e.preventDefault()
    if (!messageText.trim()) return
    try {
      await sendMessage(messageText)
      setMessageText('')
    } catch {
      // handled by hooks
    }
  }

  async function handleStartDirect(body) {
    await startDirectChat(body)
    setSearchQuery('')
  }

  const displayName =
    selectedConversation?.counterpart?.displayName || 'Select a chat'
  const wpLeftBg = 'bg-[#f0f2f5]'
  const wpBorder = 'border-[#e9edef]'
  const wpHeaderGreen = 'bg-[#008069]'
  const wpChatBg = 'bg-[#efeae2]'

  let shellProps
  if (isAdmin) {
    shellProps = {
      badge: 'Administration',
      title: 'Control center',
      subtitle: 'Messages · managers and sales',
      secondaryLogoSrc: seltecLogo,
      secondaryLogoAlt: 'Seltec',
      logoutConfirm: {
        enabled: true,
        title: 'Log out from admin panel?',
        message:
          'You will be signed out from the admin panel and returned to the main login page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
      },
      actionsPlacement: 'belowHeading',
      actions: (
        <div className="w-full min-w-0 flex-1">
          <AdminSectionHeaderNav />
        </div>
      ),
    }
  } else if (isSales) {
    shellProps = {
      badge: 'Sales workspace',
      title: 'Messages',
      subtitle: `Monthly overview · ${monthLabel(year, month)}`,
      primaryLogoSrc: isSeltecUser ? seltecLogo : undefined,
      primaryLogoAlt: isSeltecUser ? 'Seltec' : 'Petrotek',
      logoutConfirm: {
        enabled: true,
        title: 'Log out from sales workspace?',
        message: 'You will be signed out and returned to the login page.',
        confirmLabel: 'Yes, log out',
        cancelLabel: 'Stay signed in',
        confirmTone: isSeltecUser ? 'blue' : 'red',
      },
      actionsPlacement: 'belowHeading',
      actions: (
        <div className="flex w-full min-w-0 flex-col gap-2">
          <SalesWorkspaceHeader endSlot={monthPicker} />
        </div>
      ),
    }
  } else if (isManager) {
    shellProps = {
      ...managerShellLogoProps(user),
      badge: 'Manager workspace',
      title: 'Messages',
      subtitle: 'Team and admin chat',
      logoutConfirm: undefined,
      actionsPlacement: 'belowHeading',
      actions: (
        <div className="flex w-full min-w-0 flex-col gap-2">
          <ManagerHeader
            year={year}
            month={month}
            goPrev={goPrev}
            goNext={goNext}
          />
        </div>
      ),
    }
  } else {
    shellProps = {
      badge: 'Chat',
      title: 'Messages',
      subtitle: 'Chats with admin, managers, and sales',
      actionsPlacement: 'belowHeading',
      actions: undefined,
    }
  }

  return (
    <DashboardShell {...shellProps} user={user} onLogout={onLogout}>
      {activeError ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900">
          {activeError}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      {/* WhatsApp Web–style split: left = list, right = conversation */}
      <div
        className={`flex min-h-[calc(100vh-12rem)] max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-lg border ${wpBorder} shadow-md md:flex-row md:max-h-[calc(100vh-10rem)]`}
      >
        {/* —— Left: chat list + search —— */}
        <aside
          className={`flex w-full shrink-0 flex-col border-b md:w-[min(100%,380px)] md:border-b-0 md:border-r ${wpBorder} ${wpLeftBg}`}
        >
          {/* Single search: filters chats + (admin/manager) finds contacts to start */}
          <div className="shrink-0 border-b border-black/5 px-2 py-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  mode === 'admin'
                    ? 'Search chats, name, phone, or role'
                    : user?.designation === 'manager'
                      ? 'Search chats or team members'
                      : 'Search chats'
                }
                className="w-full rounded-lg border-0 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008069]/30"
                autoComplete="off"
              />
            </div>
            {mode !== 'admin' ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStartDirect({ targetType: 'admin' })}
                  className="rounded-full bg-[#008069] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#006b5a]"
                >
                  Message admin
                </button>
                {user?.designation === 'sales' && user?.managerId ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleStartDirect({ targetUserId: String(user.managerId) })
                    }
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Message manager
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Conversation list (+ inline contact hits when typing, admin/manager) */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-sm text-slate-500">Loading chats…</p>
            ) : (
              <>
                {showContactsBlock ? (
                  <div className="border-b border-black/[0.06] bg-white/60">
                    <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                      Contacts
                    </p>
                    <ul>
                      {mode === 'admin'
                        ? filteredAdminTargets.slice(0, 15).map((u) => (
                            <li key={`c-${String(u._id)}`}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartDirect({ targetUserId: String(u._id) })
                                }
                                className="flex w-full items-center gap-3 border-t border-black/[0.06] px-3 py-2.5 text-left hover:bg-black/[0.03]"
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                                  {initials(u.name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[15px] font-medium text-[#111b21]">
                                    {u.name}
                                  </span>
                                  <span className="block truncate text-xs text-[#667781]">
                                    {u.phone} · {u.designation}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))
                        : filteredTeamTargets.slice(0, 15).map((m) => (
                            <li key={`c-${String(m.userId)}`}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartDirect({
                                    targetUserId: String(m.userId),
                                  })
                                }
                                className="flex w-full items-center gap-3 border-t border-black/[0.06] px-3 py-2.5 text-left hover:bg-black/[0.03]"
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                                  {initials(m.name)}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#111b21]">
                                  {m.name}
                                </span>
                              </button>
                            </li>
                          ))}
                      {mode === 'admin' && filteredAdminTargets.length === 0 ? (
                        <li className="border-t border-black/[0.06] px-4 py-3 text-center text-xs text-[#667781]">
                          No users match your search.
                        </li>
                      ) : null}
                      {mode !== 'admin' &&
                      user?.designation === 'manager' &&
                      filteredTeamTargets.length === 0 ? (
                        <li className="border-t border-black/[0.06] px-4 py-3 text-center text-xs text-[#667781]">
                          No team members match your search.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {showContactsBlock ? (
                  <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                    Chats
                  </p>
                ) : null}

                {filteredConversations.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-[#667781]">
                    {conversations.length === 0 && !showContactsBlock
                      ? 'No chats yet — search above to find someone and start chatting.'
                      : conversations.length === 0 && showContactsBlock
                        ? 'No existing chats.'
                        : 'No chats match your search.'}
                  </p>
                ) : (
                  <ul>
                    {filteredConversations.map((item) => {
                  const selected =
                    String(item._id) === String(selectedConversationId)
                  const name = item.counterpart?.displayName || 'Chat'
                  return (
                    <li key={item._id}>
                      <button
                        type="button"
                        onClick={() => {
                          setConversationError('')
                          setSelectedConversationId(String(item._id))
                        }}
                        className={`flex w-full gap-3 border-b border-black/[0.06] px-3 py-2.5 text-left transition hover:bg-black/[0.04] ${
                          selected ? 'bg-[#e9edef]' : ''
                        }`}
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                          {initials(name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[17px] font-medium text-[#111b21]">
                              {name}
                            </span>
                            <span className="shrink-0 text-xs text-[#667781]">
                              {formatChatListTime(item.lastMessageAt)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-sm text-[#667781]">
                              {item.lastMessageText || 'Tap to open chat'}
                            </p>
                            {Number(item.unreadCount || 0) > 0 ? (
                              <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-xs font-semibold text-white">
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>

        {/* —— Right: active conversation —— */}
        <section className={`flex min-h-[50vh] min-w-0 flex-1 flex-col ${wpChatBg}`}>
          {/* Top bar */}
          <header
            className={`flex items-center gap-3 border-b px-3 py-2 ${wpBorder} ${wpHeaderGreen} text-white`}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/25 text-sm font-semibold">
                {hasSelectedConversation
                  ? initials(selectedConversation?.counterpart?.displayName)
                  : '…'}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-[16px] font-medium">
                  {hasSelectedConversation ? displayName : 'CRM Chat'}
                </h2>
                {hasSelectedConversation &&
                selectedConversation?.counterpart?.designation ? (
                  <p className="truncate text-xs text-white/85 capitalize">
                    {selectedConversation.counterpart.designation}
                  </p>
                ) : (
                  <p className="truncate text-xs text-white/80">
                    Pick a conversation from the left
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Messages (subtle diagonal stripe like WA Lite) */}
          <div
            className={`min-h-0 flex-1 overflow-y-auto px-4 py-2 ${wpChatBg}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill-opacity='0.035' fill='%23111'%3E%3Cpath d='M0 16L16 0H0z'/%3E%3C/svg%3E")`,
            }}
          >
            {!hasSelectedConversation ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center text-[#667781]">
                <svg
                  className="h-16 w-16 text-[#c4c9cc]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="max-w-xs text-[15px] font-light leading-snug">
                  Select a chat to continue messaging or search to start a new one.
                </p>
              </div>
            ) : loadingMessages ? (
              <p className="py-8 text-center text-sm text-[#667781]">
                Loading messages…
              </p>
            ) : (
              <div className="mx-auto max-w-[900px] space-y-2">
                {hasMore ? (
                  <div className="flex justify-center py-2">
                    <button
                      type="button"
                      onClick={loadOlderMessages}
                      disabled={loadingOlder}
                      className="rounded-full border border-black/10 bg-white/90 px-4 py-1.5 text-xs font-medium text-[#008069] shadow-sm hover:bg-white disabled:opacity-50"
                    >
                      {loadingOlder ? 'Loading…' : 'Load older messages'}
                    </button>
                  </div>
                ) : null}
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#667781]">
                    No messages yet — say hello.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.senderKey === selfActorKey
                    return (
                      <div
                        key={msg._id || `${msg.createdAt}-${msg.senderKey || 'msg'}`}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`relative max-w-[min(72%,560px)] rounded-lg px-2.5 py-1.5 pb-5 shadow-sm ${
                            mine
                              ? 'rounded-br-none bg-[#d9fdd3]'
                              : 'rounded-bl-none bg-white'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words pr-14 text-[14px] leading-snug text-[#111b21]">
                            {msg.text}
                          </p>
                          <span className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] text-[#667781]">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <footer className={`border-t ${wpBorder} bg-[#f0f2f5] px-3 py-2`}>
            <form
              onSubmit={submitMessage}
              className="mx-auto flex max-w-[900px] items-end gap-2"
            >
              <div className="min-h-[42px] flex-1 rounded-lg bg-white px-3 py-2 shadow-sm">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={1}
                  maxLength={1000}
                  disabled={!hasSelectedConversation || sending}
                  placeholder={
                    hasSelectedConversation ? 'Type a message' : 'Select a chat first'
                  }
                  className="max-h-32 min-h-[24px] w-full resize-none border-0 bg-transparent text-[15px] text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-0 disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      hasSelectedConversation &&
                      messageText.trim()
                    ) {
                      e.preventDefault()
                      submitMessage(e)
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!hasSelectedConversation || !messageText.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#008069] text-white shadow-sm transition hover:bg-[#006b5a] disabled:cursor-not-allowed disabled:bg-[#aec7c4]"
                aria-label="Send message"
              >
                {sending ? (
                  <span className="text-xs">…</span>
                ) : (
                  <svg className="h-5 w-5 -translate-x-px translate-y-px" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </form>
          </footer>
        </section>
      </div>
    </DashboardShell>
  )
}
