'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration, calculateCueStartTimes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Clock, ChevronRight, Mic, MapPin, Lock, Music, Video,
  Monitor, Maximize2, Minimize2, LayoutPanelLeft, AlignJustify, Bell,
} from 'lucide-react'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import { SlideViewer } from './SlideViewer'

interface PresenterViewProps {
  rundown: Rundown
  show: Show
  initialCues: Cue[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function countdownColor(rem: number, total: number): string {
  if (rem === 0 || rem <= 15) return 'text-red-400'
  if (rem <= 30 || rem / total < 0.2) return 'text-yellow-400'
  return 'text-white'
}

function progressColor(rem: number): string {
  if (rem <= 15) return 'bg-red-500'
  if (rem <= 30) return 'bg-yellow-400'
  return 'bg-green-500'
}

function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const enter = useCallback(() => document.documentElement.requestFullscreen().catch(() => {}), [])
  const exit  = useCallback(() => document.exitFullscreen().catch(() => {}), [])
  return { isFullscreen, enter, exit }
}

// ── PIN-scherm ────────────────────────────────────────────────────────────────
function PinScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  function handleDigit(d: string) {
    const next = (input + d).slice(0, 4)
    setInput(next)
    if (next.length === 4) {
      if (next === pin) { onUnlock() }
      else {
        setShake(true)
        setTimeout(() => { setInput(''); setShake(false) }, 600)
      }
    }
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 gap-8 select-none">
      <div className="flex items-center gap-2 text-white/40">
        <Lock className="h-5 w-5" />
        <span className="text-lg font-medium">Presenter toegang</span>
      </div>
      <div className={cn('flex gap-4', shake && 'animate-shake')}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(
            'w-5 h-5 rounded-full border-2 transition-all',
            i < input.length ? 'bg-primary border-primary' : 'border-white/20'
          )} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? setInput(p => p.slice(0,-1)) : d ? handleDigit(d) : undefined}
            disabled={!d && d !== '0'}
            className={cn(
              'h-16 w-16 rounded-2xl text-2xl font-semibold transition-all text-white',
              d ? 'bg-white/10 hover:bg-white/20 active:scale-95' : 'invisible'
            )}
          >{d}</button>
        ))}
      </div>
    </div>
  )
}

// ── Hoofd PresenterView ───────────────────────────────────────────────────────
export function PresenterView({ rundown, show, initialCues }: PresenterViewProps) {
  const supabase = createClient()
  const now = useWallClock()
  const { isFullscreen, enter, exit } = useFullscreen()

  const [cues, setCues]               = useState<Cue[]>(initialCues)
  const [unlocked, setUnlocked]       = useState(!rundown.presenter_pin)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [totalSlidesInCue, setTotalSlidesInCue]   = useState(0)
  // 'single' = 1 scherm alles gestapeld | 'dual' = links huidige slide, rechts info+volgende
  const [viewMode, setViewMode]       = useState<'single' | 'dual'>('single')
  // Nudge/flash van editor
  const [nudgeFlash, setNudgeFlash]   = useState(false)
  const [nudgeMsg, setNudgeMsg]       = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideChannelRef = useRef<any>(null)

  const activeCue   = cues.find((c) => c.status === 'running') ?? null
  const pendingCues = cues.filter((c) => c.status === 'pending')
  const doneCues    = cues.filter((c) => c.status === 'done' || c.status === 'skipped')
  const nextCue     = activeCue
    ? cues.find((c) => c.position > activeCue.position && c.status === 'pending')
    : pendingCues[0] ?? null
  const showComplete = pendingCues.length === 0 && !activeCue
  const showProgress = cues.length > 0 ? Math.round((doneCues.length / cues.length) * 100) : 0
  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  const countdown = activeCue ? calcCountdown(activeCue, now) : 0
  const progress  = activeCue ? calcProgress(activeCue, now) : 0

  const hasNextSlide = activeCue?.presentation_url
    ? currentSlideIndex < totalSlidesInCue - 1
    : false

  // ── Realtime sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`presenter:${rundown.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const updated = payload.new as Cue
          setCues(prev => prev.map(c => c.id === updated.id ? updated : c).sort((a,b) => a.position - b.position))
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const c = payload.new as Cue
          setCues(prev => {
            if (prev.find(x => x.id === c.id)) return prev
            return [...prev, c].sort((a,b) => a.position - b.position)
          })
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => setCues(prev => prev.filter(c => c.id !== payload.old.id)))
      // Alert van editor of caller
      .on('broadcast', { event: 'nudge' }, (payload) => {
        const target = payload.payload?.target as string | undefined
        // Presenter toont alerts voor presenter of iedereen (niet puur crew)
        if (target === 'crew') return
        const msg = payload.payload?.message ?? '🔔 Alert!'
        setNudgeMsg(msg)
        setNudgeFlash(true)
        setTimeout(() => setNudgeFlash(false), 1000)
        setTimeout(() => setNudgeMsg(null), 6000)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  // ── Slide sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(`slide:${rundown.id}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        if (payload.payload?.source === 'caller') setCurrentSlideIndex(payload.payload.index ?? 0)
      })
      .subscribe()
    slideChannelRef.current = ch
    return () => { supabase.removeChannel(ch); slideChannelRef.current = null }
  }, [rundown.id, supabase])

  useEffect(() => {
    setCurrentSlideIndex(activeCue?.current_slide_index ?? 0)
    setTotalSlidesInCue(0)
  }, [activeCue?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCue?.presentation_url) return
    if (activeCue.slide_control_mode === 'caller') return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'ArrowDown') {
        e.preventDefault()
        setCurrentSlideIndex(prev => {
          const next = Math.min(prev + 1, totalSlidesInCue > 0 ? totalSlidesInCue - 1 : prev + 1)
          if (next !== prev) slideChannelRef.current?.send({ type: 'broadcast', event: 'slide_change', payload: { index: next, source: 'presenter' } })
          return next
        })
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
        e.preventDefault()
        setCurrentSlideIndex(prev => {
          const next = Math.max(0, prev - 1)
          if (next !== prev) slideChannelRef.current?.send({ type: 'broadcast', event: 'slide_change', payload: { index: next, source: 'presenter' } })
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeCue, totalSlidesInCue])

  const handleSlideChange = useCallback(async (index: number) => {
    setCurrentSlideIndex(index)
    slideChannelRef.current?.send({ type: 'broadcast', event: 'slide_change', payload: { index, source: 'presenter' } })
    if (activeCue) {
      await supabase.from('cues').update({ current_slide_index: index } as Record<string,unknown>).eq('id', activeCue.id)
    }
  }, [activeCue, supabase])

  if (!unlocked && rundown.presenter_pin) {
    return <PinScreen pin={rundown.presenter_pin} onUnlock={() => setUnlocked(true)} />
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
      <div>
        <p className="text-xs text-white/40 font-medium uppercase tracking-widest leading-none">{show.name}</p>
        <p className="text-[10px] text-white/20 mt-0.5">{rundown.name}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Cue voortgang */}
        <span className="text-xs text-white/25 font-mono hidden sm:block">
          {doneCues.length}/{cues.length}
        </span>
        {/* Modus wissel */}
        {activeCue?.presentation_url && (
          <button
            onClick={() => setViewMode(v => v === 'single' ? 'dual' : 'single')}
            className="text-white/30 hover:text-white/60 transition-colors"
            title={viewMode === 'single' ? '2-scherm modus' : '1-scherm modus'}
          >
            {viewMode === 'dual'
              ? <AlignJustify className="h-4 w-4" />
              : <LayoutPanelLeft className="h-4 w-4" />
            }
          </button>
        )}
        {/* Fullscreen */}
        <button
          onClick={isFullscreen ? exit : enter}
          className="text-white/30 hover:text-white/60 transition-colors"
          title={isFullscreen ? 'Volledig scherm verlaten' : 'Volledig scherm'}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        {/* Klok */}
        <div className="font-mono text-lg font-light tabular-nums text-white/50 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-white/20" />
          {now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  )

  // ── Show voortgangsbalk ───────────────────────────────────────────────────
  const progressBar = cues.length > 0 && (
    <div className="h-0.5 bg-white/5 shrink-0">
      <div className="h-full bg-green-500/40 transition-all duration-1000" style={{ width: `${showProgress}%` }} />
    </div>
  )

  // ── Countdown blok ────────────────────────────────────────────────────────
  const countdownBlock = activeCue && (
    <div className="space-y-2">
      <div className="text-center">
        <span className={cn(
          'font-mono font-black tabular-nums leading-none',
          viewMode === 'dual' ? 'text-6xl' : 'text-7xl md:text-8xl',
          countdownColor(countdown, activeCue.duration_seconds),
          countdown <= 15 && countdown > 0 && 'animate-pulse',
        )}>
          {formatDuration(countdown)}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-1000', progressColor(countdown))}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )

  // ── Notities blok ─────────────────────────────────────────────────────────
  const notesBlock = activeCue?.notes && (
    <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">Notities</p>
      <p className="text-white/80 text-lg leading-relaxed whitespace-pre-wrap">{activeCue.notes}</p>
    </div>
  )

  // ── Volgende cue balk ─────────────────────────────────────────────────────
  const nextCueBalk = nextCue && !showComplete && (
    <div className="shrink-0 border-t border-white/10 px-5 py-3">
      <div className="flex items-center gap-3 max-w-full">
        <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
        <span className="text-xs text-white/30 uppercase tracking-wider shrink-0">Volgende</span>
        <span className="text-white/55 font-medium truncate">{nextCue.title}</span>
        {nextCue.presenter && (
          <span className="text-white/25 text-xs flex items-center gap-1 shrink-0">
            <Mic className="h-3 w-3" />{nextCue.presenter}
          </span>
        )}
        <span className="text-white/25 font-mono text-xs shrink-0 ml-auto">
          {formatDuration(nextCue.duration_seconds)}
          {expectedTimes[nextCue.position] && expectedTimes[nextCue.position] !== '--:--' && (
            <span className="text-white/15 ml-2">@{expectedTimes[nextCue.position]}</span>
          )}
        </span>
      </div>
    </div>
  )

  // ── Cue mini-lijst ────────────────────────────────────────────────────────
  const cueMiniList = (
    <div className="shrink-0 border-t border-white/5 px-5 py-2 bg-black/20">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {cues.map((cue) => (
          <div key={cue.id} className={cn(
            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            cue.status === 'running'   ? 'bg-green-500/20 border border-green-500/40 text-green-300' :
            cue.status === 'done'      ? 'text-white/15 line-through' :
            cue.status === 'skipped'   ? 'text-red-400/20 line-through' :
                                         'border border-white/10 text-white/30'
          )}>
            #{cue.position + 1} {cue.title}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Wachtscherm ───────────────────────────────────────────────────────────
  if (showComplete) {
    return (
      <div className="h-screen flex flex-col bg-zinc-950 text-white select-none">
        {toolbar}{progressBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-8xl mb-4">✓</div>
          <h1 className="text-4xl font-bold text-green-400">Show afgerond</h1>
          <p className="text-white/40">Bedankt voor uw presentatie!</p>
        </div>
        {cueMiniList}
      </div>
    )
  }

  if (!activeCue) {
    return (
      <div className="h-screen flex flex-col bg-zinc-950 text-white select-none">
        {toolbar}{progressBar}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="text-7xl">🎬</div>
          <h1 className="text-4xl font-bold text-white/60">Wachten op start</h1>
          {nextCue && <p className="text-white/30 text-lg">Eerste cue: <strong className="text-white/50">{nextCue.title}</strong></p>}
          {rundown.show_start_time && <p className="text-white/25 text-sm">Geplande aanvang: {rundown.show_start_time.slice(0,5)}</p>}
        </div>
        {cueMiniList}
      </div>
    )
  }

  // ── DUAL-SCHERM modus ─────────────────────────────────────────────────────
  if (viewMode === 'dual' && activeCue.presentation_url && activeCue.presentation_type) {
    return (
      <div className="h-screen flex flex-col bg-zinc-950 text-white select-none overflow-hidden">
        {toolbar}{progressBar}

        <div className="flex-1 flex min-h-0 gap-0">
          {/* Links: huidige slide groot */}
          <div className="flex-1 min-w-0 bg-black flex flex-col">
            <SlideViewer
              url={activeCue.presentation_url}
              type={activeCue.presentation_type}
              slideIndex={currentSlideIndex}
              showControls
              canControl={activeCue.slide_control_mode !== 'caller'}
              onSlideChange={handleSlideChange}
              onPageCount={setTotalSlidesInCue}
              className="flex-1 h-full rounded-none border-0"
              allowFullscreen={false}
            />
          </div>

          {/* Rechts: info panel */}
          <div className="w-[340px] shrink-0 border-l border-white/10 flex flex-col overflow-y-auto bg-zinc-950">
            <div className="p-5 space-y-5 flex-1">
              {/* Titel */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Nu actief</p>
                <h1
                  className="text-2xl font-extrabold leading-tight"
                  style={activeCue.color ? { borderLeft: `3px solid ${activeCue.color}`, paddingLeft: '10px' } : {}}
                >
                  {activeCue.title}
                </h1>
                {(activeCue.presenter || activeCue.location) && (
                  <div className="flex flex-wrap gap-3 mt-2 text-white/40 text-sm">
                    {activeCue.presenter && <span className="flex items-center gap-1"><Mic className="h-3.5 w-3.5" />{activeCue.presenter}</span>}
                    {activeCue.location  && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{activeCue.location}</span>}
                  </div>
                )}
              </div>

              {/* Countdown */}
              {countdownBlock}

              {/* Notities */}
              {notesBlock}

              {/* Volgende slide preview */}
              {hasNextSlide && (
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Monitor className="h-3 w-3" /> Volgende slide
                    <span className="font-normal normal-case text-white/20 ml-1">
                      ({currentSlideIndex + 2} / {totalSlidesInCue})
                    </span>
                  </p>
                  <SlideViewer
                    url={activeCue.presentation_url}
                    type={activeCue.presentation_type}
                    slideIndex={currentSlideIndex + 1}
                    showControls={false}
                    canControl={false}
                    className="h-[160px] opacity-70 rounded-lg overflow-hidden"
                  />
                </div>
              )}

              {/* Volgende cue preview */}
              {nextCue && (
                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/25 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3" /> Volgende cue
                  </p>
                  <p className="text-white/60 font-semibold">{nextCue.title}</p>
                  {nextCue.presenter && <p className="text-white/30 text-sm flex items-center gap-1 mt-0.5"><Mic className="h-3 w-3" />{nextCue.presenter}</p>}
                  {nextCue.notes && <p className="text-white/30 text-sm mt-2 line-clamp-2">{nextCue.notes}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {nextCueBalk}
        {cueMiniList}
      </div>
    )
  }

  // ── SINGLE-SCHERM modus ───────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white select-none overflow-hidden relative">
      {/* ── Nudge flash overlay ──────────────────────────────────────────── */}
      {nudgeFlash && (
        <div className="pointer-events-none absolute inset-0 z-[70] bg-yellow-400/40 animate-pulse" />
      )}
      {/* ── Alert melding ───────────────────────────────────────────────── */}
      {nudgeMsg && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 bg-yellow-500 text-black font-bold px-6 py-4 rounded-xl shadow-2xl text-lg max-w-[85vw] cursor-pointer"
          onClick={() => setNudgeMsg(null)}
        >
          <Bell className="h-6 w-6 shrink-0 animate-bounce" />
          <span className="break-words">{nudgeMsg}</span>
        </div>
      )}
      {toolbar}{progressBar}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

          {/* Titel */}
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nu actief</p>
            <h1
              className="text-5xl md:text-6xl font-extrabold leading-tight"
              style={activeCue.color ? { borderBottom: `4px solid ${activeCue.color}`, paddingBottom: '0.25rem' } : {}}
            >
              {activeCue.title}
            </h1>
            {(activeCue.presenter || activeCue.location) && (
              <div className="flex items-center justify-center gap-4 text-white/40 mt-3">
                {activeCue.presenter && <span className="flex items-center gap-1.5"><Mic className="h-4 w-4" />{activeCue.presenter}</span>}
                {activeCue.location  && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{activeCue.location}</span>}
              </div>
            )}
          </div>

          {/* Countdown */}
          {countdownBlock}

          {/* Notities */}
          {notesBlock}

          {/* Media indicator */}
          {activeCue.media_url && (
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
              {activeCue.media_type?.startsWith('video/') ? <Video className="h-4 w-4 animate-pulse" /> : <Music className="h-4 w-4 animate-pulse" />}
              <span>{activeCue.media_filename ?? 'Media speelt'}</span>
            </div>
          )}

          {/* Slides: huidig + volgend naast elkaar */}
          {activeCue.presentation_url && activeCue.presentation_type && (
            <div className={cn(
              'grid gap-4',
              hasNextSlide ? 'grid-cols-2' : 'grid-cols-1'
            )}>
              {/* Huidige slide */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Monitor className="h-3 w-3" /> Huidige slide
                  {activeCue.slide_control_mode === 'caller' && (
                    <span className="normal-case font-normal text-white/20 ml-1">— caller bedient</span>
                  )}
                </p>
                <SlideViewer
                  url={activeCue.presentation_url}
                  type={activeCue.presentation_type}
                  slideIndex={currentSlideIndex}
                  showControls
                  canControl={activeCue.slide_control_mode !== 'caller'}
                  onSlideChange={handleSlideChange}
                  onPageCount={setTotalSlidesInCue}
                  className="h-[260px]"
                  allowFullscreen
                />
              </div>

              {/* Volgende slide preview */}
              {hasNextSlide && (
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <ChevronRight className="h-3 w-3" /> Volgende slide
                    <span className="font-normal normal-case text-white/20 ml-1">
                      ({currentSlideIndex + 2}/{totalSlidesInCue})
                    </span>
                  </p>
                  <SlideViewer
                    url={activeCue.presentation_url}
                    type={activeCue.presentation_type}
                    slideIndex={currentSlideIndex + 1}
                    showControls={false}
                    canControl={false}
                    className="h-[260px] opacity-60"
                  />
                </div>
              )}
            </div>
          )}

          {/* Volgende cue info */}
          {nextCue && (
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3" /> Volgende cue
              </p>
              <p className="text-white/60 font-semibold text-lg">{nextCue.title}</p>
              <div className="flex items-center gap-4 mt-1 text-white/30 text-sm">
                {nextCue.presenter && <span className="flex items-center gap-1"><Mic className="h-3 w-3" />{nextCue.presenter}</span>}
                <span className="font-mono">{formatDuration(nextCue.duration_seconds)}</span>
                {expectedTimes[nextCue.position] && expectedTimes[nextCue.position] !== '--:--' && (
                  <span className="font-mono">@{expectedTimes[nextCue.position]}</span>
                )}
              </div>
              {nextCue.notes && (
                <p className="text-white/25 text-sm mt-2 line-clamp-2">{nextCue.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {nextCueBalk}
      {cueMiniList}
    </div>
  )
}
