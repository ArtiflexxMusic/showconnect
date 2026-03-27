'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  cn, formatDuration, cueTypeLabel, cueTypeColor, calculateCueStartTimes
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, SkipForward, Wifi, WifiOff,
  Users, Radio, Clock, Play, Square, Mic, MapPin, Bell, BellRing
} from 'lucide-react'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import Link from 'next/link'

interface CallerViewProps {
  rundown: Rundown
  show: Show
  initialCues: Cue[]
  userId: string
}

// ── Hulpfuncties ────────────────────────────────────────────────────────────

function useWallClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now ?? new Date()
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

function countdownColor(remaining: number, total: number): string {
  if (remaining === 0) return 'text-red-500'
  if (remaining <= 15) return 'text-red-400'
  if (remaining <= 60 || remaining / total < 0.2) return 'text-yellow-400'
  return 'text-green-400'
}

function progressColor(remaining: number): string {
  if (remaining <= 15) return 'bg-red-500'
  if (remaining <= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

function countdownPulse(remaining: number): string {
  if (remaining <= 15) return 'countdown-critical'
  if (remaining <= 60) return 'countdown-warning'
  return ''
}

// ── Hoofd component ─────────────────────────────────────────────────────────

export function CallerView({ rundown, show, initialCues, userId }: CallerViewProps) {
  const supabase = createClient()
  const now      = useWallClock()

  const [cues, setCues]                 = useState<Cue[]>(initialCues)
  const [isOnline, setIsOnline]         = useState(true)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nudgeActive, setNudgeActive]   = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)

  // Show starttijd → show clock basis
  const showStartedAt = cues
    .filter((c) => c.started_at)
    .map((c) => new Date(c.started_at!))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null

  const activeCue   = cues.find((c) => c.status === 'running') ?? null
  const pendingCues = cues.filter((c) => c.status === 'pending')
  const nextCue     = activeCue
    ? cues.find((c) => c.position > activeCue.position && c.status === 'pending')
    : pendingCues[0] ?? null
  const doneCues    = cues.filter((c) => c.status === 'done' || c.status === 'skipped')
  const showComplete = pendingCues.length === 0 && !activeCue

  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  // ── Supabase Realtime ────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`caller:${rundown.id}`)
      .on('presence', { event: 'sync' }, () => {
        setConnectedUsers(Object.keys(channel.presenceState()).length)
      })
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
        { event: 'UPDATE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const updated = payload.new as Cue
          setCues((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.position - b.position)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          setCues((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      // Nudges ontvangen
      .on('broadcast', { event: 'nudge' }, (payload) => {
        setNudgeMessage(payload.payload?.message ?? '🔔 Nudge!')
        setTimeout(() => setNudgeMessage(null), 4000)
      })
      .subscribe(async (status) => {
        setIsOnline(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, role: 'caller', online_at: new Date().toISOString() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, userId, supabase])

  // ── GO ───────────────────────────────────────────────────────────────────
  const handleGo = useCallback(async () => {
    if (isProcessing || showComplete) return
    setIsProcessing(true)
    try {
      if (activeCue) {
        await supabase.from('cues').update({ status: 'done' } as Record<string, unknown>).eq('id', activeCue.id)
      }
      if (nextCue) {
        await supabase.from('cues').update({
          status: 'running', started_at: new Date().toISOString(),
        } as Record<string, unknown>).eq('id', nextCue.id)

        // Companion webhook
        if (rundown.companion_webhook_url) {
          fetch(rundown.companion_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'cue_started', source: 'ShowConnect',
              cue: { title: nextCue.title, type: nextCue.type, position: nextCue.position + 1 },
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {})
        }
      }
    } finally {
      setTimeout(() => setIsProcessing(false), 300)
    }
  }, [isProcessing, showComplete, activeCue, nextCue, rundown, supabase])

  // ── PREV ─────────────────────────────────────────────────────────────────
  const handlePrev = useCallback(async () => {
    if (isProcessing) return
    setIsProcessing(true)
    try {
      if (activeCue) {
        await supabase.from('cues').update({ status: 'pending', started_at: null } as Record<string, unknown>).eq('id', activeCue.id)
      }
      const prevDone = [...cues]
        .filter((c) => c.status === 'done')
        .sort((a, b) => b.position - a.position)[0]
      if (prevDone) {
        await supabase.from('cues').update({
          status: 'running', started_at: new Date().toISOString(),
        } as Record<string, unknown>).eq('id', prevDone.id)
      }
    } finally {
      setTimeout(() => setIsProcessing(false), 300)
    }
  }, [isProcessing, activeCue, cues, supabase])

  // ── SKIP ─────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(async () => {
    if (isProcessing || !activeCue) return
    setIsProcessing(true)
    try {
      await supabase.from('cues').update({ status: 'skipped' } as Record<string, unknown>).eq('id', activeCue.id)
      if (nextCue) {
        await supabase.from('cues').update({
          status: 'running', started_at: new Date().toISOString(),
        } as Record<string, unknown>).eq('id', nextCue.id)
      }
    } finally {
      setTimeout(() => setIsProcessing(false), 300)
    }
  }, [isProcessing, activeCue, nextCue, supabase])

  // ── Nudge sturen ─────────────────────────────────────────────────────────
  const sendNudge = useCallback(async () => {
    if (nudgeActive) return
    setNudgeActive(true)
    const channel = supabase.channel(`caller:${rundown.id}`)
    await channel.send({
      type: 'broadcast',
      event: 'nudge',
      payload: { from: userId, message: '🔔 Aandacht van de caller!' },
    })
    setTimeout(() => setNudgeActive(false), 2000)
  }, [nudgeActive, rundown.id, userId, supabase])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space')                        { e.preventDefault(); handleGo() }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { e.preventDefault(); handleGo() }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp')    { e.preventDefault(); handlePrev() }
      if (e.code === 'KeyS')                         { e.preventDefault(); handleSkip() }
      if (e.code === 'KeyN')                         { e.preventDefault(); sendNudge() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleGo, handlePrev, handleSkip, sendNudge])

  // ── Berekeningen actieve cue ─────────────────────────────────────────────
  const countdown = activeCue ? calcCountdown(activeCue, now) : 0
  const progress  = activeCue ? calcProgress(activeCue, now) : 0

  return (
    <div className="h-screen flex flex-col bg-background select-none overflow-hidden">

      {/* ── Nudge melding ────────────────────────────────────────────── */}
      {nudgeMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black font-bold px-6 py-3 rounded-full shadow-xl text-sm animate-bounce">
          {nudgeMessage}
        </div>
      )}

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/shows/${show.id}/rundown/${rundown.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Editor
          </Link>
          <div>
            <span className="font-bold">{show.name}</span>
            <span className="text-muted-foreground mx-2">·</span>
            <span className="text-muted-foreground text-sm">{rundown.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Nudge knop */}
          <Button
            variant="ghost" size="sm"
            onClick={sendNudge}
            disabled={nudgeActive}
            className={cn('gap-1.5 h-8', nudgeActive && 'text-yellow-400')}
            title="Ping crew (N)"
          >
            {nudgeActive
              ? <BellRing className="h-4 w-4 animate-bounce" />
              : <Bell className="h-4 w-4" />
            }
          </Button>

          <Badge variant="outline" className={cn('gap-1 text-xs', isOnline ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30')}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Live' : 'Offline'}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="h-3 w-3" /> {connectedUsers}
          </Badge>

          {/* Wall clock */}
          <div className="flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {formatWallClock(now)}
          </div>

          {/* Show clock */}
          <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-muted-foreground border border-border/50 rounded px-2 py-0.5">
            <Radio className="h-3 w-3" />
            {formatShowClock(showStartedAt, now)}
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4 gap-5 min-h-0">

        {showComplete ? (
          <div className="text-center">
            <div className="text-7xl mb-4">✓</div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Show afgerond!</h2>
            <p className="text-muted-foreground">Alle cues zijn uitgevoerd.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Totale duur: <span className="font-mono">{formatShowClock(showStartedAt, now)}</span>
            </p>
          </div>

        ) : activeCue ? (
          <div className="w-full max-w-3xl">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 text-center">
              Nu live — cue #{activeCue.position + 1}
              {expectedTimes[activeCue.position] && expectedTimes[activeCue.position] !== '--:--' && (
                <span className="ml-2 text-muted-foreground/50">
                  (gepland {expectedTimes[activeCue.position]})
                </span>
              )}
            </p>

            <div className="rounded-xl border-2 border-green-500/50 bg-green-500/5 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <Badge className={cn('text-xs border', cueTypeColor(activeCue.type))}>
                  {cueTypeLabel(activeCue.type)}
                </Badge>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {activeCue.presenter && (
                    <span className="flex items-center gap-1">
                      <Mic className="h-3 w-3" />{activeCue.presenter}
                    </span>
                  )}
                  {activeCue.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{activeCue.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Titel */}
              <h2 className="text-3xl font-bold mb-5 leading-tight">{activeCue.title}</h2>

              {/* Countdown — het hart van de interface */}
              <div className="text-center mb-3">
                <span className={cn(
                  'text-9xl font-mono font-black tabular-nums leading-none block',
                  countdownColor(countdown, activeCue.duration_seconds),
                  countdownPulse(countdown)
                )}>
                  {formatDuration(countdown)}
                </span>
                <p className="text-sm text-muted-foreground mt-2 font-mono">
                  {formatDuration(activeCue.duration_seconds)} totaal
                </p>
              </div>

              {/* Voortgangsbalk */}
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000', progressColor(countdown))}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Notities */}
              {activeCue.notes && (
                <p className="text-sm text-muted-foreground italic border-t border-border/30 pt-3 mt-2">
                  {activeCue.notes}
                </p>
              )}
              {activeCue.tech_notes && (
                <p className="text-xs text-yellow-400/80 mt-1">
                  🔧 {activeCue.tech_notes}
                </p>
              )}
            </div>
          </div>

        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">▶</div>
            <h2 className="text-2xl font-bold mb-2">Klaar om te starten</h2>
            <p className="text-muted-foreground">Druk op GO of SPATIE om de show te starten.</p>
            {nextCue && (
              <p className="text-sm text-muted-foreground mt-3">
                Eerste cue: <strong className="text-foreground">{nextCue.title}</strong>
                {' — '}<span className="font-mono">{formatDuration(nextCue.duration_seconds)}</span>
              </p>
            )}
            {rundown.show_start_time && (
              <p className="text-xs text-primary/70 mt-2">
                <Clock className="h-3 w-3 inline mr-1" />
                Geplande aanvang: {rundown.show_start_time.slice(0, 5)}
              </p>
            )}
          </div>
        )}

        {/* ── VOLGENDE CUE ── */}
        {nextCue && !showComplete && (
          <div className="w-full max-w-3xl">
            <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Volgende</span>
              <Badge className={cn('text-xs border shrink-0', cueTypeColor(nextCue.type))}>
                {cueTypeLabel(nextCue.type)}
              </Badge>
              <span className="text-sm font-medium truncate">{nextCue.title}</span>
              {nextCue.presenter && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Mic className="h-3 w-3" />{nextCue.presenter}
                </span>
              )}
              <span className="text-sm text-muted-foreground font-mono shrink-0 ml-auto">
                {formatDuration(nextCue.duration_seconds)}
                {expectedTimes[nextCue.position] && expectedTimes[nextCue.position] !== '--:--' && (
                  <span className="text-muted-foreground/50 ml-2">@{expectedTimes[nextCue.position]}</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTROL BAR ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 px-6 py-4">
        <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
          <Button
            variant="outline" size="lg"
            onClick={handlePrev}
            disabled={isProcessing || doneCues.length === 0}
            className="gap-2 min-w-[120px]"
          >
            <ChevronLeft className="h-5 w-5" /> Vorige
          </Button>

          <Button
            size="lg"
            onClick={handleGo}
            disabled={isProcessing || showComplete}
            className={cn(
              'gap-2 min-w-[220px] text-xl font-black h-14 transition-all',
              !showComplete && !isProcessing
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/40 hover:shadow-green-900/60'
                : ''
            )}
          >
            {isProcessing
              ? <Square className="h-6 w-6 animate-pulse" />
              : showComplete
              ? <>✓ Klaar</>
              : <><Play className="h-6 w-6 fill-current" /> GO</>
            }
          </Button>

          <Button
            variant="outline" size="lg"
            onClick={handleSkip}
            disabled={isProcessing || !activeCue}
            className="gap-2 min-w-[120px] text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
          >
            Skip <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/40 mt-2">
          <kbd className="px-1.5 rounded border border-border/50 font-mono">SPATIE</kbd> GO &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">←</kbd> Vorige &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">S</kbd> Skip &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">N</kbd> Nudge crew
        </p>
      </div>

      {/* ── CUE MINILIJST ────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 px-6 py-3 bg-muted/10">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cues.map((cue, i) => (
            <div
              key={cue.id}
              className={cn(
                'shrink-0 rounded px-2.5 py-1.5 text-xs border transition-all',
                cue.status === 'running'
                  ? 'bg-green-500/20 border-green-500/50 text-green-300 font-semibold'
                  : cue.status === 'done'
                  ? 'border-transparent text-muted-foreground/30 line-through'
                  : cue.status === 'skipped'
                  ? 'border-transparent text-red-400/30 line-through'
                  : 'border-border/30 text-muted-foreground hover:border-border/60'
              )}
            >
              <span className="opacity-50 font-mono">#{cue.position + 1}</span>
              {' '}
              <span className="max-w-[100px] truncate inline-block align-bottom">{cue.title}</span>
              {' '}
              <span className="opacity-40 font-mono">{formatDuration(cue.duration_seconds)}</span>
              {expectedTimes[i] && expectedTimes[i] !== '--:--' && (
                <span className="opacity-30 ml-1">@{expectedTimes[i]}</span>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
