'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Zap, X, Clock } from 'lucide-react'

interface TrialBannerProps {
  trialEndsAt: string
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const msLeft   = new Date(trialEndsAt).getTime() - Date.now()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return null

  const isUrgent = daysLeft <= 1

  return (
    <div className={`relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${
      isUrgent
        ? 'bg-amber-500/15 border-b border-amber-500/30 text-amber-200'
        : 'bg-primary/10 border-b border-primary/20 text-foreground'
    }`}>

      {/* Inhoud */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-amber-400' : 'text-primary'}`} />
        <p className="text-sm truncate">
          {isUrgent
            ? <><strong>Laatste dag!</strong> Je gratis trial verloopt vandaag.</>
            : <><strong>Nog {daysLeft} {daysLeft === 1 ? 'dag' : 'dagen'}</strong> gratis toegang — daarna Individual plan.</>
          }
        </p>
      </div>

      {/* Upgrade knop */}
      <Link
        href="/upgrade"
        className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
          isUrgent
            ? 'bg-amber-500 hover:bg-amber-400 text-black'
            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
      >
        <Zap className="h-3 w-3" />
        Upgraden
      </Link>

      {/* Sluiten */}
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Banner sluiten"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
