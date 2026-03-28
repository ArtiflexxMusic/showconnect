'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, cueTypeLabel, cueTypeColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Radio, Clock, MapPin, Mic } from 'lucide-react'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PublicStatusViewProps {
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

export function PublicStatusView({ rundown, show, initialCues }: PublicStatusViewProps) {
  const supabase = createClient()
  const now      = useWallClock()
  const [cues, setCues] = useState<Cue[]>(initialCues)

  const activeCue  = cues.find(c => c.status === 'running') ?? null
  const nextCue    = activeCue
    ? cues.find(c => c.position > activeCue.position && c.status === 'pending')
    : cues.find(c => c.status === 'pending') ?? null
  const showDone   = cues.every(c => c.status === 'done' || c.status === 'skipped')

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`status:${rundown.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'cues',
        filter: `rundown_id=eq.${rundown.id}`,
      }, (payload) => {
        const updated = payload.new as Cue
        setCues(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'cues',
        filter: `rundown_id=eq.${rundown.id}`,
      }, (payload) => {
        const c = payload.new as Cue
        setCues(prev => {
          if (prev.find(x => x.id === c.id)) return prev
          return [...prev, c].sort((a, b) => a.position - b.position)
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header */}
      <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">{show.name}</h1>
          <p className="text-xs text-muted-foreground">{rundown.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-xs text-green-400 border-green-500/30">
            <Radio className="h-3 w-3 animate-pulse" /> Live
          </Badge>
          <div className="text-sm font-mono font-semibold tabular-nums">
            {now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Actieve cue */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        {showDone ? (
          <div className="text-center">
            <div className="text-7xl mb-4">✓</div>
            <h2 className="text-3xl font-bold text-green-400 mb-2">Show afgerond</h2>
            <p className="text-muted-foreground">Alle cues zijn uitgevoerd.</p>
          </div>
        ) : activeCue ? (
          <div className="w-full max-w-2xl">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 text-center">
              Nu live
            </p>
            <div
              className="rounded-2xl border-2 border-green-500/40 bg-green-500/5 p-8 text-center"
              style={activeCue.color ? { borderLeftColor: activeCue.color, borderLeftWidth: '6px' } : {}}
            >
              <Badge className={cn('text-sm border mb-4', cueTypeColor(activeCue.type))}>
                {cueTypeLabel(activeCue.type)}
              </Badge>
              <h2 className="text-4xl font-bold mb-4 leading-tight">{activeCue.title}</h2>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                {activeCue.presenter && (
                  <span className="flex items-center gap-1.5">
                    <Mic className="h-4 w-4" /> {activeCue.presenter}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold mb-2">Wachten op start</h2>
            <p className="text-muted-foreground">De show is nog niet begonnen.</p>
            {rundown.show_start_time && (
              <p className="text-sm text-primary/70 mt-3 flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                Geplande aanvang: {rundown.show_start_time.slice(0, 5)}
              </p>
            )}
          </div>
        )}

        {/* Volgende cue */}
        {nextCue && !showDone && (
          <div className="w-full max-w-2xl mt-2">
            <div className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Volgende</p>
              <p className="font-semibold text-lg">{nextCue.title}</p>
              {nextCue.presenter && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Mic className="h-3.5 w-3.5" /> {nextCue.presenter}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 px-6 py-3 text-center">
        <p className="text-xs text-muted-foreground/40">
          CueBoard · Live show status · {show.name}
        </p>
      </div>
    </div>
  )
}
