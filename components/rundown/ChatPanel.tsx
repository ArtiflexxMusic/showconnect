'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Send, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: string
  rundown_id: string
  user_id: string | null
  sender_name: string
  sender_role: string
  message: string
  created_at: string
}

interface ChatPanelProps {
  rundownId: string
  senderName: string
  senderRole: 'caller' | 'crew' | 'editor' | 'admin'
  onClose?: () => void
  className?: string
}

const ROLE_COLORS: Record<string, string> = {
  caller:  'text-violet-400',
  editor:  'text-blue-400',
  crew:    'text-emerald-400',
  admin:   'text-amber-400',
}

const ROLE_LABELS: Record<string, string> = {
  caller:  'Caller',
  editor:  'Editor',
  crew:    'Crew',
  admin:   'Admin',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export function ChatPanel({ rundownId, senderName, senderRole, onClose, className }: ChatPanelProps) {
  const supabase = createClient()
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [userId, setUserId]       = useState<string | null>(null)
  const [unread, setUnread]       = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Huidige gebruiker ophalen
  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => setUserId(user?.id ?? null))
      .catch(() => { /* auth niet beschikbaar */ })
  }, [supabase])

  // Bestaande berichten laden
  useEffect(() => {
    supabase
      .from('rundown_chat')
      .select('*')
      .eq('rundown_id', rundownId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[])
      })
  }, [rundownId, supabase])

  // Realtime subscribe
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${rundownId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rundown_chat',
        filter: `rundown_id=eq.${rundownId}`,
      }, (payload) => {
        const msg = payload.new as ChatMessage
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        // Unread teller als panel verborgen is
        if (!isVisible) setUnread((n) => n + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rundownId, supabase, isVisible])

  // Auto-scroll naar onderen bij nieuw bericht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset unread bij zichtbaar worden
  useEffect(() => {
    if (isVisible) setUnread(0)
  }, [isVisible])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !userId) return
    setSending(true)
    setInput('')

    const { error } = await supabase.from('rundown_chat').insert({
      rundown_id:  rundownId,
      user_id:     userId,
      sender_name: senderName,
      sender_role: senderRole,
      message:     text,
    })

    if (error) {
      console.error('[ChatPanel] Sturen mislukt:', error.message)
      setInput(text) // Herstel input bij fout
    }
    setSending(false)
    inputRef.current?.focus()
  }, [input, sending, userId, supabase, rundownId, senderName, senderRole])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={cn('flex flex-col bg-background border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Chat</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground">({messages.length})</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Berichten */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0 max-h-64 scrollbar-none">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nog geen berichten. Stuur het eerste bericht!
          </p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === userId
            return (
              <div key={msg.id} className={cn('flex flex-col gap-0.5', isOwn && 'items-end')}>
                <div className={cn('flex items-center gap-1.5', isOwn && 'flex-row-reverse')}>
                  <span className={cn('text-[10px] font-semibold', ROLE_COLORS[msg.sender_role] ?? 'text-muted-foreground')}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {ROLE_LABELS[msg.sender_role] ?? msg.sender_role}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs max-w-[85%] break-words',
                  isOwn
                    ? 'bg-primary/20 text-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                )}>
                  {msg.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Typ een bericht..."
          maxLength={500}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={sendMessage}
          disabled={!input.trim() || sending || !userId}
          className="h-6 w-6 shrink-0"
        >
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ── ChatToggleButton ─────────────────────────────────────────────────────────
// Kleine knop om de chat te tonen/verbergen, met unread badge
interface ChatToggleProps {
  onClick: () => void
  unread?: number
  isOpen: boolean
}

export function ChatToggleButton({ onClick, unread = 0, isOpen }: ChatToggleProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
        isOpen
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      <span>Chat</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )
}
