'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration, cueTypeLabel, cueTypeColor, calculateCueStartTimes } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Mic, MapPin, Wrench, Clock, Wifi, WifiOff, ChevronDown, Music, Video, MessageSquare, Send, Trash2, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Cue, Rundown, Show, CueType } from '@/lib/types/database'

interface CrewAnnotation {
  id: string
  rundown_id: string
  cue_id: string | null
  user_id: string | null
  content: string
  created_at: string
}

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
  const [nudgeMessage, setNudgeMessage]   = useState<string | null>(null)

  // Annotaties
  const [annotations, setAnnotations]   = useState<CrewAnnotation[]>([])
  const [annotationText, setAnnotationText] = useState('')
  const [annotating, setAnnotating]     = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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

    // Aparte channel voor nudge-broadcasts (gedeeld met CallerView en RundownEditor)
    const nudgeChannel = supabase
      .channel(`rundown:${rundown.id}`)
      .on('broadcast', { event: 'nudge' }, (payload) => {
        setNudgeMessage(payload.payload?.message ?? '🔔 Aandacht gevraagd!')
        setTimeout(() => setNudgeMessage(null), 5000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(nudgeChannel)
    }
  }, [rundown.id, supabase])

  // Annotaties laden + user ophalen
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })

    supabase
      .from('crew_annotations')
      .select('*')
      .eq('rundown_id', rundown.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setAnnotations(data as CrewAnnotation[])
      })

    // Realtime annotaties
    const annChannel = supabase
      .channel(`crew_ann:${rundown.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'crew_annotations',
        filter: `rundown_id=eq.${rundown.id}`,
      }, (payload) => {
        setAnnotations(prev => [...prev, payload.new as CrewAnnotation])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'crew_annotations',
        filter: `rundown_id=eq.${rundown.id}`,
      }, (payload) => {
        setAnnotations(prev => prev.filter(a => a.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(annChannel) }
  }, [rundown.id, supabase])

  async function addAnnotation() {
    if (!annotationText.trim()) return
    setAnnotating(true)
    const activeCueId = cues.find(c => c.status === 'running')?.id ?? null
    await supabase.from('crew_annotations').insert({
      rundown_id: rundown.id,
      cue_id: activeCueId,
      content: annotationText.trim(),
    })
    setAnnotationText('')
    setAnnotating(false)
  }

  async function deleteAnnotation(id: string) {
    await supabase.from('crew_annotations').delete().eq('id', id)
  }

  const filteredCues = filter === 'all' ? cues : cues.filter((c) => c.type === filter)

  function countdownStr(cue: Cue): string {
    if (cue.status !== 'running' || !cue.started_at) return formatDuration(cue.duration_seconds)
    const elapsed = Math.floor((now.getTime() - new Date(cue.started_at).getTime()) / 1000)
    const remaining = Math.max(0, cue.duration_seconds - elapsed)
    return formatDuration(remaining)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* Nudge melding */}
      {nudgeMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black font-bold px-6 py-3 rounded-full shadow-xl text-sm animate-bounce">
          {nudgeMessage}
        </div>
      )}

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
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-foreground truncate">{activeCue.title}</p>
                {activeCue.media_url && (
                  activeCue.media_type?.startsWith('video/')
                    ? <Video className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-pulse" />
                    : <Music className="h-3.5 w-3.5 text-blue-400 shrink-0 animate-pulse" />
                )}
              </div>
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

      {/* ── Annotaties panel ──────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-background border-t border-border/50">

        {/* Annotaties toggle */}
        <button
          onClick={() => setShowAnnotations(!showAnnotations)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Crew notities
            {annotations.length > 0 && (
              <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                {annotations.length}
              </span>
            )}
          </span>
          {showAnnotations
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronUp className="h-3.5 w-3.5" />
          }
        </button>

        {showAnnotations && (
          <div className="border-t border-border/30 bg-background/95">
            {/* Notities lijst */}
            <div className="max-h-48 overflow-y-auto px-4 py-2 space-y-2">
              {annotations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nog geen notities</p>
              ) : (
                annotations.map(ann => (
                  <div key={ann.id} className="flex items-start gap-2 group">
                    <div className="flex-1 min-w-0">
                      {ann.cue_id && (
                        <p className="text-[10px] text-primary/60 mb-0.5">
                          @ {cues.find(c => c.id === ann.cue_id)?.title ?? 'cue'}
                        </p>
                      )}
                      <p className="text-xs text-foreground">{ann.content}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        {new Date(ann.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {ann.user_id === currentUserId && (
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Invoer */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30">
              <input
                type="text"
                placeholder="Notitie toevoegen..."
                value={annotationText}
                onChange={e => setAnnotationText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addAnnotation() } }}
                className="flex-1 text-xs bg-muted/30 border border-border/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={annotating}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={addAnnotation}
                disabled={annotating || !annotationText.trim()}
                className="h-8 w-8 p-0 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Volgende cue sticky onderaan */}
        {nextCue && (
          <div className="bg-background/90 backdrop-blur border-t border-border/50 px-4 py-3">
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
    </div>
  )
}
