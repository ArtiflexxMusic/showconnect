'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration, cueTypeLabel, cueTypeColor, calculateCueStartTimes } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Mic, MapPin, Wrench, Clock, Wifi, WifiOff, ChevronDown } from 'lucide-react'
import type { Cue, Rundown, Show, CueType } from '@/lib/types/database'

interface CrewViewProps {
  rundown: Rundown
  show: Show
  initialCues: Cue[]
}

type FilterType = 'all' | CueType

const FILTER_TABS: { value: FilterType; label: string; emoji: string }[] = [
  { value: 'all',      label: 'Alles',   emoji: '📋' },
  { value: 'video',    label: 'Video',   emoji: '📹' },
  { value: 'audio',    label: 'Audio',   emoji: '🎵' },
  { value: 'lighting', label: 'Licht',   emoji: '💡' },
  { value: 'speech',   label: 'Spreker', emoji: '🎤' },
  { value: 'break',    label: 'Pauze',   emoji: '☕' },
  { value: 'intro',    label: 'Intro',   emoji: '🎬' },
  { value: 'outro',    label: 'Outro',   emoji: '🏁' },
  { value: 'custom',   label: 'Overig',  emoji: '⚙️' },
]

function useWallClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now ?? new Date()
}

export function CrewView({ rundown, show, initialCues }: CrewViewProps) {
  const supabase = createClient()
  const now      = useWallClock()

  const [cues, setCues]           = useState<Cue[]>(initialCues)
  const [isOnline, setIsOnline]   = useState(true)
  const [filter, setFilter]       = useState<FilterType>('all')
  const [showFilterBar, setShowFilterBar] = useState(false)

  const activeCue   = cues.find((c) => c.status === 'running')
  const pendingCues = cues.filter((c) => c.status === 'pending')
  const nextCue     = activeCue
    ? cues.find((c) => c.position > activeCue.position && c.status === 'pending')
    : pendingCues[0] ?? null

  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  // Realtime sync
  useEffect(() => {
    const channel = supabase
      .channel(`crew:${rundown.id}`)
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
      .subscribe((status) => {
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  const filteredCues = filter === 'all' ? cues : cues.filter((c) => c.type === filter)

  function countdownStr(cue: Cue): string {
    if (cue.status !== 'running' || !cue.started_at) return formatDuration(cue.duration_seconds)
    const elapsed = Math.floor((now.getTime() - new Date(cue.started_at).getTime()) / 1000)
    const remaining = Math.max(0, cue.duration_seconds - elapsed)
    return formatDuration(remaining)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate">{show.name}</h1>
            <p className="text-xs text-muted-foreground truncate">{rundown.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {rundown.show_start_time && (
              <span className="text-xs text-primary/70 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {rundown.show_start_time.slice(0, 5)}
              </span>
            )}
            <span className={cn('text-xs flex items-center gap-1', isOnline ? 'text-green-400' : 'text-red-400')}>
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Actieve cue banner */}
        {activeCue && (
          <div className="bg-green-500/10 border-t border-green-500/20 px-4 py-2.5 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-green-400 font-semibold uppercase tracking-wider">Nu live</p>
              <p className="text-sm font-bold text-foreground truncate">{activeCue.title}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-green-400 text-sm">{countdownStr(activeCue)}</p>
              <p className="text-xs text-muted-foreground">{formatDuration(activeCue.duration_seconds)} totaal</p>
            </div>
          </div>
        )}

        {/* Filter tabs toggle */}
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showFilterBar && 'rotate-180')} />
            Filter: {FILTER_TABS.find((f) => f.value === filter)?.label ?? 'Alles'}
          </button>
          <span className="text-xs text-muted-foreground">
            {filteredCues.length} cues
          </span>
        </div>

        {/* Filter tabs */}
        {showFilterBar && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => { setFilter(tab.value); setShowFilterBar(false) }}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  filter === tab.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cue lijst */}
      <div className="flex-1 px-3 py-3 space-y-2">
        {filteredCues.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">Geen cues gevonden</p>
            <p className="text-sm mt-1">Pas het filter aan</p>
          </div>
        ) : (
          filteredCues.map((cue) => {
            const globalIdx = cues.findIndex((c) => c.id === cue.id)
            const isRunning = cue.status === 'running'
            const isDone    = cue.status === 'done'
            const isSkipped = cue.status === 'skipped'

            return (
              <div
                key={cue.id}
                className={cn(
                  'rounded-xl border p-3.5 transition-all',
                  isRunning
                    ? 'border-green-500/50 bg-green-500/5 shadow-sm shadow-green-500/10'
                    : isDone
                    ? 'border-transparent bg-muted/20 opacity-40'
                    : isSkipped
                    ? 'border-transparent bg-red-500/5 opacity-30'
                    : 'border-border/30 bg-card hover:border-border/60'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Nummer */}
                  <div className="shrink-0 text-right">
                    <p className={cn('text-xs font-mono font-semibold', isRunning ? 'text-green-400' : 'text-muted-foreground/50')}>
                      {(globalIdx + 1).toString().padStart(2, '0')}
                    </p>
                    {expectedTimes[globalIdx] && expectedTimes[globalIdx] !== '--:--' && (
                      <p className="text-[10px] font-mono text-muted-foreground/30 leading-tight">
                        {expectedTimes[globalIdx]}
                      </p>
                    )}
                  </div>

                  {/* Inhoud */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-sm font-semibold truncate',
                        isDone && 'line-through',
                        isSkipped && 'line-through'
                      )}>
                        {cue.title}
                      </span>
                      {isRunning && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs text-green-400 font-bold">
                          ● LIVE
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0 text-[11px] font-medium',
                        cueTypeColor(cue.type)
                      )}>
                        {cueTypeLabel(cue.type)}
                      </span>

                      {cue.presenter && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Mic className="h-2.5 w-2.5" />{cue.presenter}
                        </span>
                      )}
                      {cue.location && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />{cue.location}
                        </span>
                      )}
                    </div>

                    {/* Notities */}
                    {cue.notes && (
                      <p className="text-xs text-muted-foreground mt-1.5 border-l-2 border-border pl-2">
                        {cue.notes}
                      </p>
                    )}
                    {cue.tech_notes && (
                      <div className="flex items-start gap-1 text-xs text-yellow-400/80 mt-1">
                        <Wrench className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                        <span>{cue.tech_notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Duur */}
                  <div className="shrink-0 text-right">
                    <p className={cn(
                      'font-mono text-sm font-semibold',
                      isRunning ? 'text-green-400' : 'text-muted-foreground'
                    )}>
                      {isRunning ? countdownStr(cue) : formatDuration(cue.duration_seconds)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Volgende cue sticky onderaan */}
      {nextCue && (
        <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border/50 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Volgende cue</p>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-xs border shrink-0', cueTypeColor(nextCue.type))}>
              {cueTypeLabel(nextCue.type)}
            </Badge>
            <span className="text-sm font-medium truncate">{nextCue.title}</span>
            <span className="font-mono text-sm text-muted-foreground shrink-0 ml-auto">
              {formatDuration(nextCue.duration_seconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
