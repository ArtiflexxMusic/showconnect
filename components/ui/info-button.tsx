'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { useRef, useState } from 'react'

interface InfoButtonProps {
  /** ID van de help-sectie, bijv. "cast" → /help#cast */
  section: string
  /** Korte tekst die in de popover verschijnt */
  text: string
}

export function InfoButton({ section, text }: InfoButtonProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => { cancelClose(); setOpen(true) }}
        onMouseLeave={scheduleClose}
        onFocus={() => { cancelClose(); setOpen(true) }}
        onBlur={scheduleClose}
        className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors focus:outline-none"
        aria-label={`Meer informatie over ${section}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="bg-popover border border-border rounded-xl shadow-xl px-3 py-2 w-56 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
            <Link
              href={`/help#${section}`}
              className="text-[11px] text-emerald-400 hover:underline mt-1 inline-block"
              onClick={() => setOpen(false)}
            >
              Meer uitleg →
            </Link>
          </div>
          {/* Pijltje */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  )
}
