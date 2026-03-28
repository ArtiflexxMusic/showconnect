'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X, CheckCircle2, Circle, LayoutList, Users, Radio,
  Clapperboard, BookOpen, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Stappen definitie ────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'show',
    icon: Clapperboard,
    title: 'Maak je eerste show aan',
    desc: 'Geef je event een naam, datum en locatie.',
    href: '/shows/new',
    cta: 'Nieuwe show',
  },
  {
    id: 'cues',
    icon: LayoutList,
    title: 'Bouw een rundown',
    desc: 'Open de rundown-editor en voeg cues toe met type, duur en notities.',
    href: '/shows',
    cta: 'Naar shows',
  },
  {
    id: 'invite',
    icon: Users,
    title: 'Nodig iemand uit',
    desc: 'Genereer een Magic Link voor je crew, of deel de Cast Portal met je presentatoren.',
    href: null,
    cta: null,
  },
  {
    id: 'golive',
    icon: Radio,
    title: 'Ga live — druk op GO',
    desc: 'Open de Caller View en start de show. Iedereen ziet de actieve cue realtime.',
    href: null,
    cta: null,
  },
]

const LS_DISMISSED = 'cb_guide_dismissed'
const LS_STEPS     = 'cb_guide_steps'

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardGuideProps {
  /** Komt van de server: heeft de gebruiker al minstens één show? */
  hasShows: boolean
}

// ── Hoofd component ──────────────────────────────────────────────────────────

export function DashboardGuide({ hasShows }: DashboardGuideProps) {
  const [mounted,   setMounted]   = useState(false)
  const [dismissed, setDismissed] = useState(true)   // start verborgen tegen flash
  const [completed, setCompleted] = useState<string[]>([])
  const [minimized, setMinimized] = useState(false)

  // Laad localStorage na hydration
  useEffect(() => {
    setMounted(true)
    const isDismissed = localStorage.getItem(LS_DISMISSED) === 'true'
    const saved       = JSON.parse(localStorage.getItem(LS_STEPS) ?? '[]') as string[]

    // Auto-detect: show-stap afronden als gebruiker al shows heeft
    const steps = [...saved]
    if (hasShows && !steps.includes('show')) steps.push('show')
    if (steps.length !== saved.length) {
      localStorage.setItem(LS_STEPS, JSON.stringify(steps))
    }

    setDismissed(isDismissed)
    setCompleted(steps)
  }, [hasShows])

  function markDone(id: string) {
    setCompleted(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      localStorage.setItem(LS_STEPS, JSON.stringify(next))
      return next
    })
  }

  function dismiss() {
    setDismissed(true)
    localStorage.setItem(LS_DISMISSED, 'true')
  }

  function reopen() {
    setDismissed(false)
    setMinimized(false)
    localStorage.removeItem(LS_DISMISSED)
  }

  if (!mounted) return null

  const progress = Math.round((completed.length / STEPS.length) * 100)
  const allDone  = completed.length >= STEPS.length

  // ── Gesloten: kleine "Aan de slag"-knop rechtsonder ──────────────────────
  if (dismissed) {
    return (
      <button
        onClick={reopen}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
        title="Open de beginner-guide"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Aan de slag
      </button>
    )
  }

  // ── Geopend: floating card ────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-bold">Aan de slag</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {completed.length}/{STEPS.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMinimized(m => !m)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title={minimized ? 'Uitklappen' : 'Inklappen'}
          >
            {minimized
              ? <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Sluiten (via de knop rechtsonder altijd te heropenen)"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div className="h-1 bg-muted/50">
        <div
          className={cn(
            'h-full transition-all duration-500',
            allDone ? 'bg-green-500' : 'bg-primary'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Body */}
      {!minimized && (
        <div className="p-3">
          {allDone ? (
            /* Afgerond-scherm */
            <div className="text-center py-5 px-2">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-sm text-foreground mb-1">Alles klaar!</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Je weet hoe CueBoard werkt. Succes met je eerste live show!
              </p>
              <button
                onClick={dismiss}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Guide sluiten
              </button>
            </div>
          ) : (
            /* Stappenlijst */
            <div className="space-y-1">
              {STEPS.map((step) => {
                const isDone = completed.includes(step.id)
                return (
                  <div
                    key={step.id}
                    className={cn(
                      'flex gap-3 p-2.5 rounded-xl transition-all',
                      isDone ? 'opacity-45' : 'hover:bg-muted/40'
                    )}
                  >
                    {/* Vinkje / cirkel */}
                    <div className="shrink-0 mt-0.5">
                      {isDone
                        ? <CheckCircle2 className="h-4 w-4 text-primary" />
                        : <Circle       className="h-4 w-4 text-muted-foreground/40" />
                      }
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs font-semibold leading-snug',
                        isDone && 'line-through text-muted-foreground'
                      )}>
                        {step.title}
                      </p>
                      {!isDone && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {step.desc}
                        </p>
                      )}
                      {!isDone && (
                        <div className="flex items-center gap-3 mt-2">
                          {/* Actie-knop */}
                          {step.href ? (
                            <Link
                              href={step.href}
                              onClick={() => markDone(step.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
                            >
                              {step.cta} <ArrowRight className="h-3 w-3" />
                            </Link>
                          ) : null}
                          {/* Handmatig afronden */}
                          <button
                            onClick={() => markDone(step.id)}
                            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors ml-auto"
                          >
                            Klaar ✓
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
