'use client'

import { useState } from 'react'
import { Bell, Users, Monitor, Radio, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AlertTarget = 'crew' | 'presenter' | 'all'

interface AlertModalProps {
  onClose: () => void
  onSend: (message: string, target: AlertTarget) => void
  isSending: boolean
}

const QUICK_MESSAGES = [
  '⚠️ Stand by!',
  '🎬 We gaan live!',
  '🔇 Stilte graag!',
  '⏱️ Tempo omlaag!',
  '📸 Let op camera!',
  '✅ Goed zo, ga door!',
]

export function AlertModal({ onClose, onSend, isSending }: AlertModalProps) {
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<AlertTarget>('all')

  function handleSend() {
    const msg = message.trim()
    if (!msg) return
    onSend(msg, target)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 p-5 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-yellow-400" />
            <h2 className="font-semibold text-sm">Alert versturen</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ontvanger */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Naar wie?</p>
          <div className="flex gap-2">
            {([
              { value: 'crew'      as AlertTarget, label: 'Crew',       icon: Users,    sub: 'Caller & crew' },
              { value: 'presenter' as AlertTarget, label: 'Presenter',  icon: Monitor,  sub: 'Presenterscherm' },
              { value: 'all'       as AlertTarget, label: 'Iedereen',   icon: Radio,    sub: 'Alle schermen' },
            ] as const).map(({ value, label, icon: Icon, sub }) => (
              <button
                key={value}
                onClick={() => setTarget(value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all',
                  target === value
                    ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                    : 'border-border text-muted-foreground hover:border-border/60 hover:bg-accent'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                <span className={cn('text-[10px] font-normal', target === value ? 'text-yellow-400/70' : 'text-muted-foreground/60')}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Snelle berichten */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Snelle berichten</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => setMessage(msg)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs border transition-all',
                  message === msg
                    ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Eigen bericht */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Of typ een eigen bericht</p>
          <textarea
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-colors"
            placeholder="Typ hier je bericht..."
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            autoFocus
          />
        </div>

        {/* Acties */}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuleren</Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {isSending ? 'Versturen...' : 'Stuur alert'}
          </Button>
        </div>
      </div>
    </div>
  )
}
