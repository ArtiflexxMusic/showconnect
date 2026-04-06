'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'

interface ChatWidgetProps {
  /** Zet de bubbel hoger zodat 'ie boven de "Aan de slag"-knop op /dashboard zit. */
  liftAboveGuide?: boolean
}

export function ChatWidget({ liftAboveGuide = false }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  // Auto-scroll naar onder bij nieuw bericht
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, status])

  // Focus input bij openen
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const busy = status === 'submitted' || status === 'streaming'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    sendMessage({ text })
    setInput('')
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className={
            'fixed right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-lg shadow-black/40 transition hover:scale-105 hover:bg-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:ring-offset-2 focus:ring-offset-black ' +
            (liftAboveGuide ? 'bottom-24' : 'bottom-5')
          }
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={
            'fixed right-5 z-50 flex h-[min(600px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/60 ' +
            (liftAboveGuide ? 'bottom-24' : 'bottom-5')
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#141414] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span className="text-sm font-semibold text-white">
                Cue<span className="text-[#22c55e]">Board</span> assistent
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sluit chat"
              className="text-white/60 transition hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm text-white/70">
                Hoi! Ik help je graag met vragen over CueBoard — features, prijzen of hoe iets werkt. Wat wil je weten?
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#22c55e] px-3 py-2 text-sm text-white'
                    : 'mr-auto max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-sm text-white/90'
                }
              >
                {m.parts.map((part, i) =>
                  part.type === 'text' ? (
                    <span key={i} className="whitespace-pre-wrap">
                      {part.text}
                    </span>
                  ) : null,
                )}
              </div>
            ))}
            {status === 'submitted' && (
              <div className="mr-auto flex items-center gap-1 rounded-2xl bg-white/[0.06] px-3 py-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60 [animation-delay:300ms]" />
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                Er ging iets mis. Probeer het opnieuw of mail naar info@cueboard.nl.
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-white/10 bg-[#141414] p-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Stel een vraag…"
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#22c55e] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#22c55e] text-white transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Verstuur"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-white/30">
              AI-assistent · kan fouten maken · vragen? info@cueboard.nl
            </p>
          </form>
        </div>
      )}
    </>
  )
}
