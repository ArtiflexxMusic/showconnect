'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { CHANGELOG, LATEST_VERSION } from '@/lib/changelog'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'cueboard_seen_version'

export function ChangelogBell() {
  const [open, setOpen]     = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    setHasNew(seen !== LATEST_VERSION)
  }, [])

  useEffect(() => {
    if (open) {
      localStorage.setItem(STORAGE_KEY, LATEST_VERSION)
      setHasNew(false)
    }
  }, [open])

  // Sluit bij klik buiten het panel
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Wat is nieuw?"
      >
        <Bell className="h-4 w-4" />
        {hasNew && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary border border-background" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
            <p className="text-sm font-bold">Wat is nieuw in CueBoard?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recente updates &amp; verbeteringen</p>
          </div>

          {/* Entries */}
          <div className="max-h-[420px] overflow-y-auto">
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} className={cn('px-4 py-3', i > 0 && 'border-t border-border/40')}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-primary">v{entry.version}</span>
                  {entry.highlight && i === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 rounded-full px-1.5 py-0.5">
                      Nieuw
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(entry.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <p className="text-xs font-semibold mb-1">{entry.title}</p>
                <ul className="space-y-0.5">
                  {entry.items.map((item) => (
                    <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary/50 mt-0.5 shrink-0">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
