'use client'

import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface ShortcutHelpProps {
  onClose: () => void
}

const shortcuts = [
  { group: 'Cues beheren',
    items: [
      { key: 'A',   desc: 'Nieuwe cue toevoegen' },
      { key: 'Esc', desc: 'Modals sluiten' },
    ],
  },
  { group: 'Show bedienen (Caller mode)',
    items: [
      { key: 'Space / →', desc: 'GO — volgende cue starten' },
      { key: '← Backspace', desc: 'Vorige cue resetten' },
      { key: 'S',          desc: 'Huidige cue overslaan' },
    ],
  },
  { group: 'Toolbar snelkoppelingen',
    items: [
      { key: '?',   desc: 'Dit helpvenster openen/sluiten' },
      { key: 'F',   desc: 'Filter-menu openen' },
    ],
  },
]

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Sneltoetsen
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {shortcuts.map(({ group, items }) => (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group}
              </p>
              <div className="space-y-1.5">
                {items.map(({ key, desc }) => (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{desc}</span>
                    <kbd className="px-2 py-1 rounded-md bg-muted border border-border text-xs font-mono whitespace-nowrap shrink-0">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            Druk op <kbd className="px-1.5 rounded border border-border font-mono">?</kbd> of <kbd className="px-1.5 rounded border border-border font-mono">Esc</kbd> om te sluiten
          </p>
        </div>
      </div>
    </div>
  )
}
