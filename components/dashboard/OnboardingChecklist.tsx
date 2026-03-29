'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ChevronDown, Sparkles, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingChecklistProps {
  hasShows: boolean
  hasRundowns: boolean
  hasGoneLive: boolean
  hasTeamMembers: boolean
}

const steps = [
  {
    id: 'show',
    label: 'Maak je eerste show aan',
    desc: 'Geef je event een naam, datum en locatie.',
    href: '/shows/new',
    cta: 'Show aanmaken',
  },
  {
    id: 'rundown',
    label: 'Voeg een rundown toe',
    desc: 'Bouw je programma op met cues: video, spraak, pauze…',
    href: null,
    cta: null,
  },
  {
    id: 'live',
    label: 'Ga live met Caller mode',
    desc: 'Open de Caller mode en bestuur je show realtime.',
    href: null,
    cta: null,
  },
  {
    id: 'team',
    label: 'Nodig een teamlid uit',
    desc: 'Geef je crew, presentator of caller toegang tot de show.',
    href: null,
    cta: null,
  },
]

export function OnboardingChecklist({ hasShows, hasRundowns, hasGoneLive, hasTeamMembers }: OnboardingChecklistProps) {
  const [collapsed, setCollapsed] = useState(false)

  const done = [hasShows, hasRundowns, hasGoneLive, hasTeamMembers]
  const completedCount = done.filter(Boolean).length
  const allDone = completedCount === steps.length

  // Verberg als alles klaar is
  if (allDone) return null

  return (
    <div className="max-w-4xl mb-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-primary/8 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold">
              Aan de slag — {completedCount}/{steps.length} voltooid
            </p>
            {/* Progress bar */}
            <div className="mt-1.5 h-1 bg-primary/15 rounded-full overflow-hidden w-48">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', collapsed && 'rotate-180')} />
        </button>

        {/* Steps */}
        {!collapsed && (
          <div className="px-5 pb-4 grid sm:grid-cols-2 gap-2">
            {steps.map((step, i) => {
              const isDone = done[i]
              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 border transition-colors',
                    isDone
                      ? 'bg-primary/5 border-primary/20 opacity-60'
                      : 'bg-card border-border/50'
                  )}
                >
                  {isDone
                    ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', isDone && 'line-through text-muted-foreground')}>
                      {step.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    {!isDone && step.href && step.cta && (
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:underline"
                      >
                        {step.cta} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
