'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration, calculateCueStartTimes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Clock, ChevronRight, Mic, MapPin, Lock } from 'lucide-react'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PresenterViewProps {
  rundown: Rundown
  show: Show
  initialCues: Cue[]
}

function useWallClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now ?? new Date()
}

function calcCountdown(cue: Cue, now: Date): number {
  if (cue.status !== 'running' || !cue.started_at) return cue.duration_seconds
  const elapsed = Math.floor((now.getTime() - new Date(cue.started_at).getTime()) / 1000)
  return Math.max(0, cue.duration_seconds - elapsed)
}

function calcProgress(cue: Cue, now: Date): number {
  if (cue.status !== 'running' || !cue.started_at) return 0
  const elapsed = (now.getTime() - new Date(cue.started_at).getTime()) / 1000
  return Math.min(100, (elapsed / cue.duration_seconds) * 100)
}

// PIN-invoer scherm
function PinScreen({
  pin,
  onUnlock,
}: {
  pin: string
  onUnlock: () => void
}) {
  const [input, setInput] = useState('')
  const [shake,  setShake] = useState(false)

  function handleDigit(d: string) {
    const next = (input + d).slice(0, 4)
    setInput(next)
    if (next.length === 4) {
      if (next === pin) {
        onUnlock()
      } else {
        setShake(true)
        setTimeout(() => { setInput(''); setShake(false) }, 600)
      }
    }
  }

  function handleBackspace() {
    setInput((p) => p.slice(0, -1))
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background gap-8 select-none">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-5 w-5" />
        <span className="text-lg font-medium">Presenter toegang</span>
      </div>

      {/* PIN bollen */}
      <div className={cn('flex gap-4', shake && 'animate-shake')}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all',
              i < input.length
                ? 'bg-primary border-primary'
                : 'border-muted-foreground/30'
            )}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? handleBackspace() : d ? handleDigit(d) : undefined}
            disabled={!d && d !== '0'}
            className={cn(
              'h-16 w-16 rounded-2xl text-2xl font-semibold transition-all',
              d
                ? 'bg-muted hover:bg-muted/80 active:scale-95 active:bg-muted/60'
                : 'invisible'
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// Hoofd presenter view
export function PresenterView({ rundown, show, initialCues }: PresenterViewProps) {
  const supabase = createClient()
  const now = useWallClock()

  const [cues, setCues]       = useState<Cue[]>(initialCues)
  const [unlocked, setUnlocked] = useState(!rundown.presenter_pin)

  const activeCue   = cues.find((c) => c.status === 'running') ?? null
  const pendingCues = cues.filter((c) => c.status === 'pending')
  const nextCue     = activeCue
    ? cues.find((c) => c.position > activeCue.position && c.status === 'pending')
    : pendingCues[0] ?? null
  const showComplete = pendingCues.length === 0 && !activeCue

  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  const countdown = activeCue ? calcCountdown(activeCue, now) : 0
  const progress  = activeCue ? calcProgress(activeCue, now) : 0

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel(`presenter:${rundown.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const updated = payload.new as Cue
          setCues((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
              .sort((a, b) => a.position - b.position)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const c = payload.new as Cue
          setCues((prev) => {
            if (prev.find((x) => x.id === c.id)) return prev
            return [...prev, c].sort((a, b) => a.position - b.position)
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          setCues((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  // PIN-check
  if (!unlocked && rundown.presenter_pin) {
    return <PinScreen pin={rundown.presenter_pin} onUnlock={() => setUnlocked(true)} />
  }

  // Countdown kleur
  function countdownColor(rem: number, total: number) {
    if (rem === 0 || rem <= 15) return 'text-red-400'
    if (rem <= 60 || rem / total < 0.2) return 'text-yellow-400'
    return 'text-white'
  }

  function progressColor(rem: number) {
    if (rem <= 15) return 'bg-red-500'
    if (rem <= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white select-none overflow-hidden">

      {/* Top bar – show naam + klok */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <p className="text-sm text-white/40 font-medium uppercase tracking-widest">{show.name}</p>
          <p className="text-xs text-white/20">{rundown.name}</p>
        </div>
        <div className="font-mono text-2xl font-light tabular-nums text-white/60 flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/30" />
          {now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Hoofd content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 gap-6 min-h-0">

        {showComplete ? (
          <div className="text-center">
            <div className="text-8xl mb-6">✓</div>
            <h1 className="text-4xl font-bold text-green-400 mb-2">Show afgerond</h1>
            <p className="text-white/40">Bedankt voor uw presentatie!</p>
          </div>

        ) : activeCue ? (
          <div className="w-full max-w-2xl space-y-5">

            {/* NOW label */}
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 text-center">
              Nu actief
            </p>

            {/* Cue titel – GROOT */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-center leading-tight">
              {activeCue.title}
            </h1>

            {/* Presenter / Locatie */}
            {(activeCue.presenter || activeCue.location) && (
              <div className="flex items-center justify-center gap-4 text-white/50">
                {activeCue.presenter && (
                  <span className="flex items-center gap-1.5">
                    <Mic className="h-4 w-4" />
                    {activeCue.presenter}
                  </span>
                )}
                {activeCue.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {activeCue.location}
                  </span>
                )}
              </div>
            )}

            {/* Countdown */}
            <div className="text-center">
              <span className={cn(
                'text-8xl font-mono font-black tabular-nums leading-none',
                countdownColor(countdown, activeCue.duration_seconds),
                countdown <= 15 && countdown > 0 && 'animate-pulse'
              )}>
                {formatDuration(countdown)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-1000', progressColor(countdown))}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Notities voor presenter */}
            {activeCue.notes && (
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white/70 text-lg leading-relaxed text-center">
                {activeCue.notes}
              </div>
            )}
          </div>

        ) : (
          <div className="text-center space-y-4">
            <div className="text-7xl">🎬</div>
            <h1 className="text-4xl font-bold text-white/60">Wachten op start</h1>
            {nextCue && (
              <p className="text-white/30 text-lg">
                Eerste cue: <strong className="text-white/50">{nextCue.title}</strong>
              </p>
            )}
            {rundown.show_start_time && (
              <p className="text-white/25 text-sm">
                Geplande aanvang: {rundown.show_start_time.slice(0, 5)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Volgende cue */}
      {nextCue && !showComplete && (
        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <ChevronRight className="h-5 w-5 text-white/25 shrink-0" />
            <span className="text-sm text-white/30 uppercase tracking-wider shrink-0">Volgende</span>
            <span className="text-white/60 font-medium truncate">{nextCue.title}</span>
            {nextCue.presenter && (
              <span className="text-white/30 text-sm flex items-center gap-1 shrink-0">
                <Mic className="h-3 w-3" />{nextCue.presenter}
              </span>
            )}
            <span className="text-white/30 font-mono text-sm shrink-0 ml-auto">
              {formatDuration(nextCue.duration_seconds)}
              {expectedTimes[nextCue.position] && expectedTimes[nextCue.position] !== '--:--' && (
                <span className="text-white/20 ml-2">@{expectedTimes[nextCue.position]}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Cue mini-lijst onderin */}
      <div className="shrink-0 border-t border-white/5 px-6 py-3 bg-black/20">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {cues.map((cue) => (
            <div
              key={cue.id}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                cue.status === 'running'
                  ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                  : cue.status === 'done'
                  ? 'text-white/15 line-through'
                  : cue.status === 'skipped'
                  ? 'text-red-400/20 line-through'
                  : 'border border-white/10 text-white/30'
              )}
            >
              #{cue.position + 1} {cue.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
