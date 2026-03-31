'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration, calculateCueStartTimes } from '@/lib/utils'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface ClockViewProps {
  rundown: Rundown
  show: Show
  initialCues: Cue[]
}

function useWallClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 250)
    return () => clearInterval(id)
  }, [])
  return now ?? new Date()
}

function calcCountdown(cue: Cue, now: Date): number {
  if (cue.status !== 'running' || !cue.started_at) return cue.duration_seconds
  const elapsed = Math.floor((now.getTime() - new Date(cue.started_at).getTime()) / 1000)
  return Math.max(0, cue.duration_seconds - elapsed)
}

function countdownColor(rem: number, total: number): string {
  if (rem === 0) return 'text-red-500'
  if (rem <= 15) return 'text-red-400'
  if (rem <= 30 || rem / total < 0.15) return 'text-orange-400'
  if (rem <= 60 || rem / total < 0.25) return 'text-yellow-400'
  return 'text-green-400'
}

function formatWallClock(date: Date) {
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatShowClock(startedAt: Date | null, now: Date) {
  if (!startedAt) return '--:--:--'
  const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ClockView({ rundown, show, initialCues }: ClockViewProps) {
  const supabase = createClient()
  const now = useWallClock()
  const [cues, setCues] = useState<Cue[]>(initialCues)
  const [isOnline, setIsOnline] = useState(true)

  const activeCue   = cues.find((c) => c.status === 'running') ?? null
  const pendingCues = cues.filter((c) => c.status === 'pending')
  const doneCues    = cues.filter((c) => c.status === 'done' || c.status === 'skipped')
  const nextCue     = activeCue
    ? cues.find((c) => c.position > activeCue.position && c.status === 'pending') ?? null
    : pendingCues[0] ?? null
  const showComplete = pendingCues.length === 0 && !activeCue

  const countdown = activeCue ? calcCountdown(activeCue, now) : 0
  const showProgress = cues.length > 0 ? Math.round((doneCues.length / cues.length) * 100) : 0

  const showStartedAt = (() => {
    const first = cues.find((c) => c.status === 'running' || c.status === 'done')
    if (!first) return null
    const firstDone = [...cues].reverse().find((c) => c.status === 'done')
    const ref = cues.find((c) => c.status === 'running')
    if (!ref?.started_at) return null
    // Bereken wanneer de show startte: started_at - (sum van eerdere cue-duraties)
    const idx = cues.indexOf(ref)
    const prevSecs = cues.slice(0, idx).reduce((s, c) => s + c.duration_seconds, 0)
    return new Date(new Date(ref.started_at).getTime() - prevSecs * 1000)
  })()

  // Realtime sync
  useEffect(() => {
    const offlineTimer = { current: null as ReturnType<typeof setTimeout> | null }
    const channel = supabase
      .channel(`clock:${rundown.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => setCues(prev => prev.map(c => c.id === payload.new.id ? payload.new as Cue : c).sort((a,b) => a.position - b.position))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => setCues(prev => {
          const c = payload.new as Cue
          if (prev.find(x => x.id === c.id)) return prev
          return [...prev, c].sort((a,b) => a.position - b.position)
        })
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => setCues(prev => prev.filter(c => c.id !== payload.old.id))
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (offlineTimer.current) { clearTimeout(offlineTimer.current); offlineTimer.current = null }
          setIsOnline(true)
        } else {
          if (!offlineTimer.current) {
            offlineTimer.current = setTimeout(() => { setIsOnline(false); offlineTimer.current = null }, 4000)
          }
        }
      })

    return () => { supabase.removeChannel(channel); if (offlineTimer.current) clearTimeout(offlineTimer.current) }
  }, [rundown.id, supabase])

  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  return (
    <div className="h-screen bg-zinc-950 text-white flex flex-col select-none overflow-hidden">

      {/* Top strip — show naam + status */}
      <div className="shrink-0 flex items-center justify-between px-8 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white/70 text-sm">{show.name}</span>
          {rundown.name && (
            <>
              <span className="text-white/30">·</span>
              <span className="text-white/50 text-sm">{rundown.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className={cn('text-xs', isOnline ? 'text-green-400' : 'text-red-400')}>
            {isOnline ? '● Live' : '○ Offline'}
          </span>
          <span className="font-mono text-white/40 text-xs">
            {showProgress}% ({doneCues.length}/{cues.length})
          </span>
        </div>
      </div>

      {/* Hoofd content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">

        {showComplete ? (
          <div className="text-center">
            <div className="text-8xl mb-6">✓</div>
            <p className="text-4xl font-bold text-green-400">Show afgerond</p>
            <p className="text-white/40 text-xl mt-3">{formatShowClock(showStartedAt, now)} totale duur</p>
          </div>

        ) : activeCue ? (
          <>
            {/* Huidige cue naam */}
            <p className="text-white/50 text-xl text-center uppercase tracking-widest font-semibold">
              NU LIVE — #{activeCue.position + 1}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-center leading-tight max-w-3xl">
              {activeCue.title}
            </h1>
            {activeCue.presenter && (
              <p className="text-white/50 text-2xl">🎤 {activeCue.presenter}</p>
            )}

            {/* Countdown — GIGANTISCH */}
            <div className={cn(
              'text-[20vw] sm:text-[15vw] font-mono font-black tabular-nums leading-none',
              countdownColor(countdown, activeCue.duration_seconds)
            )}>
              {formatDuration(countdown)}
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-2xl h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-1000',
                  countdown <= 15 ? 'bg-red-500' : countdown <= 30 ? 'bg-orange-400' : 'bg-green-500'
                )}
                style={{ width: `${Math.max(0, Math.min(100, 100 - (countdown / activeCue.duration_seconds) * 100))}%` }}
              />
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-white/30 text-2xl mb-4">Wachten op start…</p>
            {nextCue && (
              <p className="text-white/60 text-xl">Eerste cue: <strong className="text-white">{nextCue.title}</strong></p>
            )}
          </div>
        )}

        {/* Volgende cue */}
        {nextCue && activeCue && !showComplete && (
          <div className="flex items-center gap-3 text-white/40 text-xl mt-4">
            <span className="text-white/20">›</span>
            <span>VOLGENDE:</span>
            <span className="text-white/70 font-medium">{nextCue.title}</span>
            <span className="font-mono text-white/30">{formatDuration(nextCue.duration_seconds)}</span>
            {expectedTimes[nextCue.position] && expectedTimes[nextCue.position] !== '--:--' && (
              <span className="text-white/20">@{expectedTimes[nextCue.position]}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom clocks */}
      <div className="shrink-0 flex items-center justify-center gap-16 px-8 py-5 border-t border-white/10">
        {/* Wandklok */}
        <div className="text-center">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Tijd</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-white">
            {formatWallClock(now)}
          </p>
        </div>

        {/* Show klok */}
        <div className="text-center">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Show timer</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-white/60">
            {formatShowClock(showStartedAt, now)}
          </p>
        </div>

        {/* Totaal resterend */}
        {activeCue && !showComplete && (
          <div className="text-center">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Resterend</p>
            <p className="font-mono text-5xl font-bold tabular-nums text-white/60">
              {formatDuration(countdown + pendingCues.reduce((s, c) => s + c.duration_seconds, 0))}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
