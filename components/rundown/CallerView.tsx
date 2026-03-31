'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  cn, formatDuration, cueTypeLabel, cueTypeColor, calculateCueStartTimes, totalDuration
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, SkipForward, Wifi, WifiOff,
  Users, Radio, Clock, Play, Pause, Square, Mic, MapPin, Bell,
  Music, Video, Volume2, VolumeX, StopCircle, Monitor, Zap, ZapOff, MessageSquare,
} from 'lucide-react'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import Link from 'next/link'
import { SlideViewer } from './SlideViewer'
import { MicPatchPanel } from './MicPatchPanel'
import { MicStatusBar } from './MicStatusBar'
import { ChatPanel, ChatToggleButton } from './ChatPanel'
import { AlertModal, type AlertTarget } from './AlertModal'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'

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
    // 250ms voor vloeiende countdown en directe reactie bij cue-start
    const id = setInterval(() => setNow(new Date()), 250)
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

// Gebruik altijd Date.now() voor berekeningen — 'now' triggert alleen re-renders.
// Dit voorkomt de off-by-one die ontstaat als de 1s-ticker iets achteroploopt.
function calcCountdown(cue: Cue, _now: Date): number {
  if (cue.status !== 'running' || !cue.started_at) return cue.duration_seconds
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(cue.started_at).getTime()) / 1000))
  return Math.max(0, cue.duration_seconds - elapsed)
}

function calcProgress(cue: Cue, _now: Date): number {
  if (cue.status !== 'running' || !cue.started_at) return 0
  const elapsed = Math.max(0, (Date.now() - new Date(cue.started_at).getTime()) / 1000)
  return Math.min(100, (elapsed / cue.duration_seconds) * 100)
}

function countdownColor(remaining: number, total: number): string {
  if (remaining === 0) return 'text-red-500'
  if (remaining <= 15) return 'text-red-400'
  if (remaining <= 30 || remaining / total < 0.15) return 'text-orange-400'
  if (remaining <= 60 || remaining / total < 0.25) return 'text-yellow-400'
  return 'text-green-400'
}

function progressColor(remaining: number): string {
  if (remaining <= 15) return 'bg-red-500'
  if (remaining <= 30) return 'bg-orange-500'
  if (remaining <= 60) return 'bg-yellow-500'
  return 'bg-green-500'
}

function countdownPulse(remaining: number): string {
  if (remaining <= 15) return 'countdown-critical'
  if (remaining <= 30) return 'countdown-warning'
  return ''
}

function countdownBorder(remaining: number): string {
  if (remaining === 0 || remaining <= 15) return 'border-red-500/70'
  if (remaining <= 30) return 'border-orange-500/60'
  return 'border-green-500/50'
}


// ── Hoofd component ─────────────────────────────────────────────────────────

export function CallerView({ rundown, show, initialCues, userId }: CallerViewProps) {
  const supabase = createClient()
  const now      = useWallClock()

  const [cues, setCues]                 = useState<Cue[]>(initialCues)
  const [isOnline, setIsOnline]         = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const [chatAlert, setChatAlert]       = useState<string | null>(null)
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertSending, setAlertSending]     = useState(false)
  const [customTimerInput, setCustomTimerInput] = useState('')
  const [mediaPlaying, setMediaPlaying]         = useState(false)
  const [mediaMuted, setMediaMuted]             = useState(false)
  const [mediaPaused, setMediaPaused]           = useState(false)
  const [mediaCurrentTime, setMediaCurrentTime] = useState(0)
  const [mediaDuration, setMediaDuration]       = useState(0)

  const [showMicPatch, setShowMicPatch] = useState(false)
  const [showChat, setShowChat]         = useState(false)
  const [chatUnread, setChatUnread]     = useState(0)
  const [callerName, setCallerName]     = useState('Caller')

  // Schermflits bij countdown drempels (opgeslagen in localStorage)
  const [flashEnabled, setFlashEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('caller_flash_enabled') !== 'false' } catch { return true }
  })
  const [flashActive, setFlashActive] = useState(false)

  // Slide state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [totalSlidesInCue, setTotalSlidesInCue] = useState(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slideChannelRef = useRef<any>(null)

  // Media player ref — één element voor audio én video
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

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

  // ── Profielnaam ophalen voor chat ────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .single()
        if (data?.full_name) setCallerName(data.full_name)
        else if (data?.email) setCallerName(data.email.split('@')[0])
      } catch { /* profielnaam niet beschikbaar, standaard gebruiken */ }
    }
    loadProfile()
  }, [userId, supabase])

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
            prev.map((c) => {
              if (c.id !== updated.id) return c
              // Als we recentelijk zelf een duration geschreven hebben, negeer dan
              // stale Realtime-events die een oudere duration_seconds meebrengen.
              const lastWritten = lastWrittenDurationRef.current[c.id]
              if (lastWritten !== undefined && updated.duration_seconds !== lastWritten) {
                return { ...updated, duration_seconds: lastWritten }
              }
              return updated
            }).sort((a, b) => a.position - b.position)
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
      // Alerts ontvangen
      .on('broadcast', { event: 'nudge' }, (payload) => {
        const target = payload.payload?.target as string | undefined
        // Caller is crew — toon alleen als target crew of iedereen is
        if (target === 'presenter') return
        setNudgeMessage(payload.payload?.message ?? '🔔 Alert!')
        setTimeout(() => setNudgeMessage(null), 6000)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Direct online tonen + eventuele offline-timer annuleren
          if (offlineTimerRef.current) { clearTimeout(offlineTimerRef.current); offlineTimerRef.current = null }
          setIsOnline(true)
          await channel.track({ user_id: userId, role: 'caller', online_at: new Date().toISOString() })
          setSessionExpired(false)
        } else {
          // Wacht 4 seconden voor we offline tonen — korte dipjes zijn geen probleem
          if (!offlineTimerRef.current) {
            offlineTimerRef.current = setTimeout(() => {
              setIsOnline(false)
              offlineTimerRef.current = null
            }, 4000)
          }
          if (status === 'CHANNEL_ERROR') {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) setSessionExpired(true)
          }
        }
      })

    // Extra nudge-listener op de gedeelde rundown-channel
    // (RundownEditor stuurt ook nudges op rundown:{id})
    const nudgeChannel = supabase
      .channel(`rundown:${rundown.id}`)
      .on('broadcast', { event: 'nudge' }, (payload) => {
        const target = payload.payload?.target as string | undefined
        if (target === 'presenter') return
        setNudgeMessage(payload.payload?.message ?? '🔔 Alert!')
        setTimeout(() => setNudgeMessage(null), 6000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(nudgeChannel)
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current)
    }
  }, [rundown.id, userId, supabase])

  // ── Slide broadcast channel ──────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`slide:${rundown.id}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        // Accept slide changes coming from the presenter
        if (payload.payload?.source === 'presenter') {
          setCurrentSlideIndex(payload.payload.index ?? 0)
        }
      })
      .subscribe()
    slideChannelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      slideChannelRef.current = null
    }
  }, [rundown.id, supabase])

  // ── GO ───────────────────────────────────────────────────────────────────
  // forceCueAdvance = true slaat slide-navigatie over (gebruikt door auto-advance)
  const handleGo = useCallback(async (forceCueAdvance = false) => {
    if (isProcessing || showComplete) return
    setIsProcessing(true)
    try {
      // ── Slide-first: als de actieve cue een presentatie heeft en er nog
      //    slides over zijn, gaan we naar de volgende slide i.p.v. de volgende cue.
      //    Uitzondering: slide_control_mode === 'presenter' (dan mag de caller niet bedienen)
      //    en forceCueAdvance (auto-advance timer).
      if (
        !forceCueAdvance &&
        activeCue?.presentation_url &&
        activeCue.slide_control_mode !== 'presenter' &&
        totalSlidesInCue > 1 &&
        currentSlideIndex < totalSlidesInCue - 1
      ) {
        const newIndex = currentSlideIndex + 1
        setCurrentSlideIndex(newIndex)
        if (slideChannelRef.current) {
          slideChannelRef.current.send({
            type: 'broadcast',
            event: 'slide_change',
            payload: { index: newIndex, source: 'caller' },
          })
        }
        await supabase.from('cues')
          .update({ current_slide_index: newIndex } as Record<string, unknown>)
          .eq('id', activeCue.id)
        return // Cue blijft actief, alleen slide gevorderd
      }

      // ── Cue advance ──────────────────────────────────────────────────────
      if (activeCue) {
        // Race condition bescherming: alleen updaten als de cue nog steeds 'running' is
        await supabase.from('cues')
          .update({ status: 'done' } as Record<string, unknown>)
          .eq('id', activeCue.id)
          .eq('status', 'running')
      }
      if (nextCue) {
        // Race condition bescherming: alleen starten als de cue nog 'pending' is
        const { error } = await supabase.from('cues').update({
          status: 'running', started_at: new Date().toISOString(),
        } as Record<string, unknown>).eq('id', nextCue.id).eq('status', 'pending')
        if (error) {
          // Cue al gestart door andere caller — sync state opnieuw
          const { data: fresh } = await supabase.from('cues').select('*').eq('rundown_id', rundown.id).order('position')
          if (fresh) setCues(fresh as Cue[])
          return
        }

        // Auto-advance slide als de cue een slide_index heeft
        if (nextCue.slide_index != null && slideChannelRef.current) {
          setCurrentSlideIndex(nextCue.slide_index)
          slideChannelRef.current.send({
            type: 'broadcast',
            event: 'slide_change',
            payload: { index: nextCue.slide_index, source: 'caller' },
          })
        }

        // Companion koppeling — via server-side proxy (omzeilt mixed-content HTTPS→HTTP)
        if (rundown.companion_webhook_url) {
          const url = rundown.companion_webhook_url
          const isCompanionVar = url.includes('/api/custom-variable/')
          const payload = isCompanionVar
            ? { value: nextCue.title }
            : {
                event: 'cue_started', source: 'CueBoard',
                cue: { title: nextCue.title, type: nextCue.type, position: nextCue.position + 1 },
                timestamp: new Date().toISOString(),
              }
          fetch('/api/companion/relay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, payload }),
          }).catch(() => {})
        }
      }
    } finally {
      setTimeout(() => setIsProcessing(false), 300)
    }
  }, [isProcessing, showComplete, activeCue, nextCue, rundown, supabase, totalSlidesInCue, currentSlideIndex])

  // ── PREV ─────────────────────────────────────────────────────────────────
  const handlePrev = useCallback(async () => {
    if (isProcessing) return

    // Slide-first: als de actieve cue een presentatie heeft en er nog slides vóór zijn,
    // ga dan naar de vorige slide i.p.v. de vorige cue.
    if (
      activeCue?.presentation_url &&
      activeCue.slide_control_mode !== 'presenter' &&
      currentSlideIndex > 0
    ) {
      const newIndex = currentSlideIndex - 1
      setCurrentSlideIndex(newIndex)
      if (slideChannelRef.current) {
        slideChannelRef.current.send({
          type: 'broadcast',
          event: 'slide_change',
          payload: { index: newIndex, source: 'caller' },
        })
      }
      await supabase.from('cues')
        .update({ current_slide_index: newIndex } as Record<string, unknown>)
        .eq('id', activeCue.id)
      return
    }

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
  }, [isProcessing, activeCue, cues, supabase, currentSlideIndex, slideChannelRef])

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

  // ── Slide navigatie ───────────────────────────────────────────────────────
  const handleSlideChange = useCallback(async (index: number) => {
    setCurrentSlideIndex(index)
    // Broadcast naar presenter
    if (slideChannelRef.current) {
      slideChannelRef.current.send({
        type: 'broadcast',
        event: 'slide_change',
        payload: { index, source: 'caller' },
      })
    }
    // Persisteer in DB (zodat late joiners de juiste slide zien)
    if (activeCue) {
      await supabase.from('cues')
        .update({ current_slide_index: index } as Record<string, unknown>)
        .eq('id', activeCue.id)
    }
  }, [activeCue, supabase])

  // Reset slide index en totaal als de actieve cue wisselt
  useEffect(() => {
    setCurrentSlideIndex(activeCue?.current_slide_index ?? 0)
    setTotalSlidesInCue(0) // Wordt opnieuw ingesteld zodra SlideViewer de PDF heeft geladen
  }, [activeCue?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bijhouden wat we zelf geschreven hebben (race condition fix) ──────────
  // Voorkomt dat trage Realtime-events de optimistische update overschrijven.
  const lastWrittenDurationRef = useRef<Record<string, number>>({})
  const offlineTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeCueRowRef        = useRef<HTMLDivElement | null>(null)

  // ── Cue duration aanpassen (live timer ± knoppen) ────────────────────────
  const handleCueUpdate = useCallback(async (id: string, updates: Partial<{ duration_seconds: number }>) => {
    if (updates.duration_seconds !== undefined) {
      lastWrittenDurationRef.current[id] = updates.duration_seconds
    }
    setCues(prev => prev.map(c => c.id === id ? { ...c, ...updates } as typeof c : c))
    await supabase.from('cues').update(updates as Record<string, unknown>).eq('id', id)
    // Na de DB-write is de Realtime event onderweg — ref mag nu gecleared worden
    delete lastWrittenDurationRef.current[id]
  }, [supabase])

  // ── Alert sturen ─────────────────────────────────────────────────────────
  const sendAlert = useCallback(async (message: string, target: AlertTarget) => {
    setAlertSending(true)
    // Stuur op de gedeelde rundown-channel
    const channel = supabase.channel(`rundown:${rundown.id}`)
    await channel.send({
      type: 'broadcast',
      event: 'nudge',
      payload: { from: userId, message, target },
    })
    // Presenter apart aanspreken als nodig
    if (target === 'presenter' || target === 'all') {
      const presenterCh = supabase.channel(`presenter:${rundown.id}`)
      await presenterCh.send({
        type: 'broadcast',
        event: 'nudge',
        payload: { from: userId, message, target },
      })
    }
    // Push notificatie (best-effort)
    fetch('/api/push/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rundownId: rundown.id, message }),
    }).catch(() => {})
    setAlertSending(false)
    setShowAlertModal(false)
  }, [rundown.id, userId, supabase])

  const autoAdvanceRef   = useRef(false)
  const flashedAt30Ref   = useRef(false)
  const flashedAt15Ref   = useRef(false)

  // ── Berekeningen actieve cue (vroeg gedeclareerd — gebruikt in useEffects) ─
  const countdown = activeCue ? calcCountdown(activeCue, now) : 0
  const progress  = activeCue ? calcProgress(activeCue, now) : 0

  // Totale resterende tijd (actieve cue countdown + pending cues)
  const totalRemaining = (activeCue ? countdown : 0) +
    pendingCues.reduce((sum, c) => sum + c.duration_seconds, 0)

  // ── Schermflits waarschuwingen bij countdown drempels ────────────────────
  useEffect(() => {
    if (!activeCue || countdown <= 0) return
    // Reset refs bij nieuwe cue (countdown > 30)
    if (countdown > 30) { flashedAt30Ref.current = false; flashedAt15Ref.current = false }
    if (countdown <= 30 && countdown > 15 && !flashedAt30Ref.current) {
      flashedAt30Ref.current = true
      if (flashEnabled) { setFlashActive(true); setTimeout(() => setFlashActive(false), 400) }
    }
    if (countdown <= 15 && !flashedAt15Ref.current) {
      flashedAt15Ref.current = true
      if (flashEnabled) {
        // Dubbele flits: urgenter signaal
        setFlashActive(true)
        setTimeout(() => setFlashActive(false), 200)
        setTimeout(() => { setFlashActive(true); setTimeout(() => setFlashActive(false), 200) }, 350)
      }
    }
  }, [countdown, activeCue, flashEnabled])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space')                        { e.preventDefault(); handleGo() }
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') { e.preventDefault(); handleGo() }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp')    { e.preventDefault(); handlePrev() }
      if (e.code === 'KeyS')                         { e.preventDefault(); handleSkip() }
      if (e.code === 'KeyN')                         { e.preventDefault(); setShowAlertModal(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleGo, handlePrev, handleSkip, setShowAlertModal])

  // ── Media afspelen bij actieve cue ───────────────────────────────────────
  useEffect(() => {
    // Stop huidig media als de cue verandert
    if (mediaRef.current) {
      mediaRef.current.pause()
      mediaRef.current.src = ''
      setMediaPlaying(false)
      setMediaPaused(false)
      setMediaCurrentTime(0)
      setMediaDuration(0)
    }

    if (!activeCue?.media_url || activeCue.media_autoplay === false) return

    const isVideo = activeCue.media_type?.startsWith('video/')
    const el = isVideo
      ? document.createElement('video')
      : document.createElement('audio')

    el.src = activeCue.media_url
    el.volume = activeCue.media_volume ?? 1.0
    el.loop = activeCue.media_loop ?? false
    el.muted = mediaMuted

    el.onplay  = () => { setMediaPlaying(true);  setMediaPaused(false) }
    el.onpause = () => { setMediaPlaying(false);  setMediaPaused(true) }
    el.onended = () => { setMediaPlaying(false);  setMediaPaused(false); setMediaCurrentTime(0) }
    el.onloadedmetadata = () => setMediaDuration(isFinite(el.duration) ? el.duration : 0)
    el.ontimeupdate = () => setMediaCurrentTime(el.currentTime)

    mediaRef.current = el as HTMLAudioElement
    el.play().catch(() => {
      // Autoplay geblokkeerd door browser — gebruiker moet interactie doen
      setMediaPlaying(false)
      setMediaPaused(false)
    })

    return () => {
      el.pause()
      el.src = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCue?.id, activeCue?.status])

  function toggleMute() {
    setMediaMuted((prev) => {
      const next = !prev
      if (mediaRef.current) mediaRef.current.muted = next
      return next
    })
  }

  function toggleMediaPlayPause() {
    if (!mediaRef.current) return
    if (mediaRef.current.paused) {
      mediaRef.current.play().catch(() => {})
    } else {
      mediaRef.current.pause()
    }
  }

  function stopMedia() {
    if (!mediaRef.current) return
    mediaRef.current.pause()
    mediaRef.current.currentTime = 0
    setMediaCurrentTime(0)
    setMediaPaused(false)
    setMediaPlaying(false)
  }

  // ── Auto-advance: automatisch GO als countdown 0 bereikt ─────────────────
  useEffect(() => {
    if (!activeCue?.auto_advance) {
      autoAdvanceRef.current = false
      return
    }
    if (countdown <= 0 && !autoAdvanceRef.current && !isProcessing && !showComplete) {
      autoAdvanceRef.current = true
      handleGo(true) // forceCueAdvance: timer moet altijd de cue doorsturen, niet de slide
    }
    if (countdown > 0) {
      autoAdvanceRef.current = false
    }
  }, [countdown, activeCue, isProcessing, showComplete, handleGo])

  // Auto-scroll naar actieve cue in de lijst
  useEffect(() => {
    activeCueRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeCue?.id])

  // Media player helpers
  const hasMediaDisplay = !!(activeCue?.media_url && (mediaPlaying || mediaPaused))
  const mediaProgressPct = mediaDuration > 0 ? Math.min(100, (mediaCurrentTime / mediaDuration) * 100) : 0

  function fmtMediaTime(secs: number) {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-background select-none overflow-hidden">

      {/* ── Sessie verlopen banner ───────────────────────────────────── */}
      {sessionExpired && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm font-semibold text-center px-4 py-2 flex items-center justify-center gap-3">
          ⚠️ Sessie verlopen — je bent niet meer verbonden.
          <button
            onClick={() => window.location.reload()}
            className="underline hover:no-underline text-white"
          >
            Vernieuwen
          </button>
        </div>
      )}

      {/* ── Countdown schermflits — felle witte flits voor de presenter ─ */}
      <div
        className="pointer-events-none absolute inset-0 z-[60] transition-opacity duration-100"
        style={{ backgroundColor: 'rgba(255,255,255,0.55)', opacity: flashActive ? 1 : 0 }}
      />

      {/* ── Alert melding ────────────────────────────────────────────── */}
      {nudgeMessage && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-yellow-500 text-black font-bold px-5 py-3 rounded-xl shadow-2xl text-sm max-w-[85vw] cursor-pointer"
          onClick={() => setNudgeMessage(null)}
        >
          <Bell className="h-4 w-4 shrink-0 animate-bounce" />
          <span className="break-words">{nudgeMessage}</span>
        </div>
      )}

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-border/50 shrink-0 gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 shrink-0">
          <Link
            href={`/shows/${show.id}/rundown/${rundown.id}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Editor</span>
          </Link>
          <div className="min-w-0">
            <span className="font-bold truncate block sm:inline max-w-[120px] sm:max-w-none">{show.name}</span>
            <span className="text-muted-foreground mx-1 sm:mx-2 hidden sm:inline">·</span>
            <span className="text-muted-foreground text-xs sm:text-sm hidden sm:inline">{rundown.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto scrollbar-none flex-shrink-0">
          {/* Schermflits toggle */}
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              const next = !flashEnabled
              setFlashEnabled(next)
              try { localStorage.setItem('caller_flash_enabled', String(next)) } catch {}
            }}
            className={cn(
              'h-8 gap-1.5 hidden sm:flex',
              flashEnabled ? 'text-primary' : 'text-muted-foreground/40 hover:text-muted-foreground'
            )}
            title={flashEnabled ? 'Schermflits aan — klik om uit te zetten' : 'Schermflits uit — klik om aan te zetten'}
          >
            {flashEnabled ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            <span className="text-xs hidden sm:inline">Flits</span>
          </Button>

          {/* Mic patch — verborgen op klein scherm */}
          <Button
            variant="ghost" size="sm"
            onClick={() => setShowMicPatch(true)}
            className="h-8 gap-1.5 text-muted-foreground hidden sm:flex"
            title="Mic patch"
          >
            <Radio className="h-4 w-4" />
          </Button>

          {/* Push notificaties toggle — verborgen op klein scherm */}
          <span className="hidden sm:inline-flex"><PushNotificationToggle iconOnly /></span>

          {/* Chat toggle — altijd zichtbaar */}
          <ChatToggleButton
            onClick={() => { setShowChat(!showChat); setChatUnread(0) }}
            unread={chatUnread}
            isOpen={showChat}
          />

          {/* Alert knop — altijd zichtbaar */}
          <Button
            variant="ghost" size="sm"
            onClick={() => setShowAlertModal(true)}
            className="gap-1.5 h-8 hover:text-yellow-400"
            title="Alert sturen (N)"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* Media-indicator */}
          {activeCue?.media_url && (
            <Button
              variant="ghost" size="sm"
              onClick={toggleMute}
              className={cn('gap-1.5 h-8 text-xs', mediaPlaying ? 'text-blue-400' : 'text-muted-foreground')}
              title={mediaMuted ? 'Geluid aan' : 'Geluid uit'}
            >
              {mediaMuted
                ? <VolumeX className="h-4 w-4" />
                : mediaPlaying
                  ? (activeCue.media_type?.startsWith('video/') ? <Video className="h-4 w-4 animate-pulse" /> : <Music className="h-4 w-4 animate-pulse" />)
                  : <Volume2 className="h-4 w-4" />
              }
            </Button>
          )}

          <Badge variant="outline" className={cn('gap-1 text-xs', isOnline ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30')}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="hidden sm:inline">{isOnline ? 'Live' : 'Offline'}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs hidden sm:flex">
            <Users className="h-3 w-3" /> {connectedUsers}
          </Badge>

          {/* Resterende tijd — verborgen op klein scherm */}
          {!showComplete && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono tabular-nums text-muted-foreground border border-border/50 rounded px-2 py-0.5" title="Totale resterende tijd">
              <Clock className="h-3 w-3 text-muted-foreground" />
              -{formatDuration(totalRemaining)}
            </div>
          )}

          {/* Wall clock — altijd zichtbaar */}
          <div className="flex items-center gap-1 text-xs sm:text-sm font-mono font-semibold tabular-nums">
            <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-muted-foreground" />
            {formatWallClock(now)}
          </div>

          {/* Show clock — verborgen op klein scherm */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono tabular-nums text-muted-foreground border border-border/50 rounded px-2 py-0.5">
            <Radio className="h-3 w-3" />
            {formatShowClock(showStartedAt, now)}
          </div>
        </div>
      </div>

      {/* ── RUNDOWN NOTITIES ─────────────────────────────────────────── */}
      {rundown.notes && (
        <div className="shrink-0 px-6 py-2 bg-yellow-500/5 border-b border-yellow-500/20">
          <p className="text-xs text-yellow-400/80 text-center">
            📋 {rundown.notes}
          </p>
        </div>
      )}

      {/* ── MAIN AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-8 py-3 sm:py-4 gap-3 sm:gap-5 min-h-0">

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
              {activeCue.auto_advance && (
                <span className="ml-2 text-primary/60" title="Auto-advance aan">⏩</span>
              )}
            </p>

            <div
              className={cn(
                'rounded-xl border-2 p-3 sm:p-6 relative overflow-hidden transition-colors duration-500',
                countdown <= 15 ? 'bg-red-500/5' : countdown <= 30 ? 'bg-orange-500/5' : 'bg-green-500/5',
                countdownBorder(countdown)
              )}
              style={activeCue.color ? { borderLeftColor: activeCue.color, borderLeftWidth: '4px' } : {}}
            >
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
              <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-5 leading-tight">{activeCue.title}</h2>

              {/* Countdown — het hart van de interface */}
              <div className="text-center mb-2">
                <span className={cn(
                  'text-6xl sm:text-9xl font-mono font-black tabular-nums leading-none block',
                  countdownColor(countdown, activeCue.duration_seconds),
                  countdownPulse(countdown)
                )}>
                  {formatDuration(countdown)}
                </span>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {formatDuration(activeCue.duration_seconds)} totaal
                </p>
              </div>

              {/* Tijd aanpassen */}
              <div className="flex flex-col items-center gap-2 mb-2">
                {/* Preset knoppen */}
                <div className="flex items-center gap-1.5">
                  {[
                    { label: '−5m', delta: -300 },
                    { label: '−1m', delta: -60 },
                    { label: '−30s', delta: -30 },
                    { label: '+30s', delta: +30 },
                    { label: '+1m', delta: +60 },
                    { label: '+5m', delta: +300 },
                  ].map(({ label, delta }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const newDur = Math.max(5, activeCue.duration_seconds + delta)
                        handleCueUpdate(activeCue.id, { duration_seconds: newDur })
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-all',
                        delta < 0
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Eigen tijd invullen */}
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const raw = customTimerInput.trim()
                    if (!raw) return
                    // Accepteer: "5" (minuten), "1:30" (min:sec), "2m", "45s"
                    // De ingevoerde waarde = nieuwe resterende tijd
                    let remainSeconds = 0
                    if (/^\d+:\d+$/.test(raw)) {
                      const [m, s] = raw.split(':').map(Number)
                      remainSeconds = m * 60 + s
                    } else if (/^\d+m$/i.test(raw)) {
                      remainSeconds = parseInt(raw) * 60
                    } else if (/^\d+s$/i.test(raw)) {
                      remainSeconds = parseInt(raw)
                    } else {
                      // Kaal getal = minuten (meest intuïtief voor een caller)
                      remainSeconds = (parseInt(raw) || 0) * 60
                    }
                    if (remainSeconds > 0) {
                      // Nieuwe totaalduur = verstreken tijd + gewenste resterende tijd
                      const elapsed = activeCue.duration_seconds - countdown
                      const newDur = Math.max(5, elapsed + remainSeconds)
                      handleCueUpdate(activeCue.id, { duration_seconds: newDur })
                    }
                    setCustomTimerInput('')
                  }}
                >
                  <input
                    type="text"
                    value={customTimerInput}
                    onChange={e => setCustomTimerInput(e.target.value)}
                    placeholder="bijv. 5 of 2:30"
                    className="w-28 bg-muted/40 border border-border/40 rounded-lg px-2 py-1 text-xs font-mono text-center placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="submit"
                    disabled={!customTimerInput.trim()}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all disabled:opacity-30"
                  >
                    Stel in
                  </button>
                </form>
              </div>

              {/* Voortgangsbalk */}
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000', progressColor(countdown))}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Notities */}
              {(activeCue.tech_notes || activeCue.notes) && (
                <div className="border-t border-border/30 pt-3 mt-2 space-y-2">
                  {activeCue.tech_notes && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <span className="text-base shrink-0 mt-0.5">🔧</span>
                      <p className="text-sm font-medium text-yellow-300 leading-snug">{activeCue.tech_notes}</p>
                    </div>
                  )}
                  {activeCue.notes && (
                    <p className="text-sm text-muted-foreground italic leading-snug px-1">
                      {activeCue.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Mic status */}
              <div className="mt-3 pt-3 border-t border-border/20">
                <MicStatusBar showId={show.id} cueId={activeCue.id} hideIfEmpty={false} />
              </div>
            </div>

            {/* ── Slide viewer ── */}
            {activeCue.presentation_url && activeCue.presentation_type && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Monitor className="h-3 w-3" /> Presentatie
                  {activeCue.slide_control_mode === 'presenter' && (
                    <span className="text-muted-foreground/50 normal-case font-normal ml-1">— presentator bedient slides</span>
                  )}
                </p>
                <SlideViewer
                  url={activeCue.presentation_url}
                  type={activeCue.presentation_type}
                  slideIndex={currentSlideIndex}
                  showControls
                  canControl={activeCue.slide_control_mode !== 'presenter'}
                  onSlideChange={handleSlideChange}
                  onPageCount={setTotalSlidesInCue}
                  className="h-[300px]"
                  allowFullscreen
                />
              </div>
            )}
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
      <div className="shrink-0 border-t border-border/50 px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4 max-w-3xl mx-auto">
          <Button
            variant="outline" size="lg"
            onClick={handlePrev}
            disabled={isProcessing || doneCues.length === 0}
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-none sm:min-w-[120px] max-w-[140px]"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="hidden xs:inline sm:inline">Vorige</span>
          </Button>

          <Button
            size="lg"
            onClick={() => handleGo()}
            disabled={isProcessing || showComplete}
            className={cn(
              'gap-2 flex-1 sm:flex-none sm:min-w-[220px] text-xl font-black h-12 sm:h-14 transition-all',
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
            className="gap-1.5 sm:gap-2 flex-1 sm:flex-none sm:min-w-[120px] max-w-[140px] text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
          >
            <span className="hidden xs:inline sm:inline">Skip</span>
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        <p className="hidden sm:block text-center text-xs text-muted-foreground/40 mt-2">
          <kbd className="px-1.5 rounded border border-border/50 font-mono">SPATIE</kbd> GO / volgende slide &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">←</kbd> Vorige &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">S</kbd> Skip cue &nbsp;·&nbsp;
          <kbd className="px-1.5 rounded border border-border/50 font-mono">N</kbd> Nudge crew
        </p>
      </div>

      {/* ── MEDIA PLAYER BAR ─────────────────────────────────────────── */}
      {hasMediaDisplay && (
        <div className="shrink-0 border-t border-blue-500/20 bg-blue-500/5 px-6 py-2">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            {activeCue!.media_type?.startsWith('video/')
              ? <Video className="h-4 w-4 text-blue-400 shrink-0" />
              : <Music className={cn('h-4 w-4 text-blue-400 shrink-0', mediaPlaying && 'animate-pulse')} />
            }
            <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {activeCue!.media_filename ?? activeCue!.title}
            </span>
            {/* Voortgangsbalk */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono tabular-nums text-muted-foreground w-10 text-right">
                {fmtMediaTime(mediaCurrentTime)}
              </span>
              <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${mediaProgressPct}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground/50 w-10">
                {mediaDuration > 0 ? fmtMediaTime(mediaDuration) : '--:--'}
              </span>
            </div>
            {/* Controls */}
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 shrink-0"
              onClick={toggleMediaPlayPause}
              title={mediaPaused ? 'Afspelen' : 'Pauzeren'}
            >
              {mediaPaused
                ? <Play className="h-3.5 w-3.5" />
                : <Pause className="h-3.5 w-3.5" />
              }
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={stopMedia}
              title="Stoppen"
            >
              <StopCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground"
              onClick={toggleMute}
              title={mediaMuted ? 'Geluid aan' : 'Geluid uit'}
            >
              {mediaMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── CUE LIJST — verticaal scrollbaar, live aanpassen ────────── */}
      <div className="shrink-0 h-[38vh] border-t border-border/40 overflow-y-auto bg-muted/5">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b border-border/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="w-7 shrink-0">#</span>
          <span className="w-16 shrink-0">Type</span>
          <span className="flex-1">Titel</span>
          <span className="hidden sm:block w-24 text-center">Aanpassen</span>
          <span className="w-14 text-right">Duur</span>
          <span className="hidden sm:block w-12 text-right">Tijd</span>
        </div>

        {cues.map((cue) => {
          const isActive  = cue.status === 'running'
          const isDone    = cue.status === 'done'
          const isSkipped = cue.status === 'skipped'
          const isPending = cue.status === 'pending'

          return (
            <div
              key={cue.id}
              ref={isActive ? activeCueRowRef : null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b border-border/15 text-sm transition-colors',
                isActive   ? 'bg-green-500/10'
                : isDone   ? 'opacity-25'
                : isSkipped ? 'opacity-20'
                : 'hover:bg-muted/20'
              )}
              style={
                isActive
                  ? { borderLeft: '3px solid rgb(34 197 94)' }
                  : cue.color
                    ? { borderLeft: `3px solid ${cue.color}` }
                    : { borderLeft: '3px solid transparent' }
              }
            >
              {/* Positie */}
              <span className={cn('font-mono text-xs w-7 shrink-0', isActive ? 'text-green-400 font-bold' : 'text-muted-foreground/50')}>
                {isDone ? '✓' : isSkipped ? '↷' : isActive ? '▶' : `#${cue.position + 1}`}
              </span>

              {/* Type */}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium w-16 shrink-0 truncate', cueTypeColor(cue.type))}>
                {cueTypeLabel(cue.type)}
              </span>


              {/* Titel */}
              <span className={cn(
                'flex-1 truncate',
                isActive   ? 'font-semibold text-green-300'
                : isDone || isSkipped ? 'line-through' : ''
              )}>
                {cue.title}
                {cue.presenter && (
                  <span className="text-muted-foreground/40 text-xs ml-1.5">· {cue.presenter}</span>
                )}
              </span>

              {/* Duur aanpassen (alleen pending) */}
              <div className="hidden sm:flex items-center gap-0.5 w-24 justify-center shrink-0">
                {(isPending || isActive) && !rundown.is_locked && (
                  <>
                    <button
                      onClick={() => handleCueUpdate(cue.id, { duration_seconds: Math.max(5, cue.duration_seconds - 60) })}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="−1 minuut"
                    >−1m</button>
                    <button
                      onClick={() => handleCueUpdate(cue.id, { duration_seconds: Math.max(5, cue.duration_seconds - 30) })}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="−30 seconden"
                    >−30</button>
                    <button
                      onClick={() => handleCueUpdate(cue.id, { duration_seconds: cue.duration_seconds + 30 })}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-green-400/50 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      title="+30 seconden"
                    >+30</button>
                    <button
                      onClick={() => handleCueUpdate(cue.id, { duration_seconds: cue.duration_seconds + 60 })}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-green-400/70 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                      title="+1 minuut"
                    >+1m</button>
                  </>
                )}
              </div>

              {/* Duur */}
              <span className={cn(
                'font-mono text-xs w-14 text-right shrink-0',
                isActive ? 'text-green-400 font-bold' : isDone || isSkipped ? 'text-muted-foreground/30' : 'text-muted-foreground'
              )}>
                {isActive ? formatDuration(countdown) : formatDuration(cue.duration_seconds)}
              </span>

              {/* Verwachte tijd */}
              <span className="hidden sm:block font-mono text-[10px] w-12 text-right text-muted-foreground/30 shrink-0">
                {expectedTimes[cue.position] && expectedTimes[cue.position] !== '--:--'
                  ? `@${expectedTimes[cue.position]}` : ''}
              </span>
            </div>
          )
        })}
      </div>

      <MicPatchPanel
        showId={show.id}
        rundownId={rundown.id}
        cues={cues}
        open={showMicPatch}
        onClose={() => setShowMicPatch(false)}
      />

      {/* Chat bericht melding */}
      {chatAlert && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-sky-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-2xl text-sm max-w-[85vw] cursor-pointer"
          style={{ top: nudgeMessage ? '5rem' : '1rem' }}
          onClick={() => setChatAlert(null)}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="break-words">{chatAlert}</span>
          <span className="text-white/50 text-xs ml-1 shrink-0">× sluiten</span>
        </div>
      )}

      {/* ── Chat overlay — altijd gemount zodat Realtime actief blijft ── */}
      <div className={cn('absolute bottom-20 right-6 z-40 w-80 shadow-2xl', !showChat && 'hidden')}>
        <ChatPanel
          rundownId={rundown.id}
          senderName={callerName}
          senderRole="caller"
          onClose={() => setShowChat(false)}
          onNewMessage={(name, role, msg) => {
            const label = { caller: 'Caller', editor: 'Editor', crew: 'Crew', admin: 'Admin' }[role] ?? role
            setChatAlert(`💬 ${name} (${label}): ${msg.slice(0, 60)}${msg.length > 60 ? '…' : ''}`)
            setTimeout(() => setChatAlert(null), 6000)
            if (!showChat) setChatUnread(prev => prev + 1)
          }}
        />
      </div>

      {/* ── Alert Modal ──────────────────────────────────────────────── */}
      {showAlertModal && (
        <AlertModal
          onClose={() => setShowAlertModal(false)}
          onSend={sendAlert}
          isSending={alertSending}
        />
      )}
    </div>
  )
}
