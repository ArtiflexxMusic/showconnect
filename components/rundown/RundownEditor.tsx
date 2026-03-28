'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext, DragEndEvent, KeyboardSensor, PointerSensor,
  closestCenter, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableCueRow } from './SortableCueRow'
import { CueFormModal } from './CueFormModal'
import { RundownSettings } from './RundownSettings'
import { ImportCuesModal } from './ImportCuesModal'
import { SaveTemplateModal } from './SaveTemplateModal'
import { LoadTemplateModal } from './LoadTemplateModal'
import { CueLogPanel } from './CueLogPanel'
import { ShortcutHelp } from './ShortcutHelp'
import { MicPatchPanel } from './MicPatchPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Users, Clock, ChevronLeft, Wifi, WifiOff, Radio,
  Settings, Bell, BellRing, Filter, Printer, Monitor, Smartphone,
  RotateCcw, AlertTriangle, ListMusic, FileSpreadsheet, BookTemplate, History, Keyboard,
  Share2, Copy, Check, ExternalLink, Lock, Unlock, Camera,
} from 'lucide-react'
import {
  formatDuration, totalDuration, formatDate, calculateCueStartTimes
} from '@/lib/utils'
import type { Cue, Rundown, CueType, CreateCueInput, UpdateCueInput, TemplateCue } from '@/lib/types/database'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Filter opties
type FilterType = 'all' | CueType
const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all',      label: 'Alles' },
  { value: 'video',    label: '📹 Video' },
  { value: 'audio',    label: '🎵 Audio' },
  { value: 'lighting', label: '💡 Licht' },
  { value: 'speech',   label: '🎤 Spreker' },
  { value: 'break',    label: '☕ Pauze' },
  { value: 'intro',    label: '🎬 Intro' },
  { value: 'outro',    label: '🏁 Outro' },
  { value: 'custom',   label: '⚙️ Overig' },
]

interface RundownEditorProps {
  rundown: Rundown
  show: { id: string; name: string; date: string | null; venue: string | null }
  initialCues: Cue[]
  userId: string
  allRundowns?: Array<{ id: string; name: string }>
}

export function RundownEditor({ rundown: initialRundown, show, initialCues, userId, allRundowns = [] }: RundownEditorProps) {
  const supabase = createClient()
  const router = useRouter()

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const [rundown, setRundown]           = useState<Rundown>(initialRundown)
  const [cues, setCues]                 = useState<Cue[]>(initialCues)
  const [isOnline, setIsOnline]         = useState(true)
  const [connectedUsers, setConnectedUsers] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCue, setEditingCue]     = useState<Cue | null>(null)
  const [isSaving, setIsSaving]         = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [nudgeActive, setNudgeActive]   = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const [showFilterMenu, setShowFilterMenu]     = useState(false)
  const [showViewMenu, setShowViewMenu]         = useState(false)
  const [showRundownMenu, setShowRundownMenu]   = useState(false)
  const [showResetConfirm, setShowResetConfirm]         = useState(false)
  const [showImportModal, setShowImportModal]           = useState(false)
  const [locking, setLocking]                           = useState(false)
  const [snapshotting, setSnapshotting]                 = useState(false)
  const [snapshotDone, setSnapshotDone]                 = useState(false)
  const [showSaveTemplate, setShowSaveTemplate]         = useState(false)
  const [showLoadTemplate, setShowLoadTemplate]         = useState(false)
  const [showCueLog, setShowCueLog]                     = useState(false)
  const [showMicPatch, setShowMicPatch]                 = useState(false)
  const [showShortcutHelp, setShowShortcutHelp]         = useState(false)
  const [showSharePanel, setShowSharePanel]             = useState(false)
  const [copiedShareKey, setCopiedShareKey]             = useState<string | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Supabase Realtime ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel(`rundown:${rundown.id}`)
    channelRef.current = channel
    channel
      .on('presence', { event: 'sync' }, () => {
        setConnectedUsers(Object.keys(channel.presenceState()).length)
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          const newCue = payload.new as Cue
          setCues((prev) => {
            if (prev.find((c) => c.id === newCue.id)) return prev
            return [...prev, newCue].sort((a, b) => a.position - b.position)
          })
        }
      )
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
        { event: 'DELETE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rundown.id}` },
        (payload) => {
          setCues((prev) => prev.filter((c) => c.id !== payload.old.id))
        }
      )
      // Broadcast: nudges van andere gebruikers ontvangen
      .on('broadcast', { event: 'nudge' }, (payload) => {
        setNudgeMessage(payload.payload?.message ?? '🔔 Nudge!')
        setTimeout(() => setNudgeMessage(null), 4000)
      })
      .subscribe(async (status) => {
        setIsOnline(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [rundown.id, userId, supabase])

  // ── CRUD ────────────────────────────────────────────────────────────────
  const addCue = useCallback(async (input: CreateCueInput) => {
    setIsSaving(true)
    const maxPos = cues.length > 0 ? Math.max(...cues.map((c) => c.position)) + 1 : 0
    const { error } = await supabase.from('cues').insert({
      rundown_id:       rundown.id,
      position:         maxPos,
      title:            input.title,
      type:             input.type,
      duration_seconds: input.duration_seconds,
      notes:            input.notes ?? null,
      tech_notes:       input.tech_notes ?? null,
      presenter:        input.presenter ?? null,
      location:         input.location ?? null,
      status:           'pending',
      // Media
      media_url:        input.media_url ?? null,
      media_path:       input.media_path ?? null,
      media_type:       input.media_type ?? null,
      media_filename:   input.media_filename ?? null,
      media_size:       input.media_size ?? null,
      media_volume:     input.media_volume ?? 1.0,
      media_loop:       input.media_loop ?? false,
      media_autoplay:   input.media_autoplay ?? true,
      color:            input.color ?? null,
      auto_advance:     input.auto_advance ?? false,
      slide_index:      input.slide_index ?? null,
    })
    if (error) console.error('Fout bij toevoegen cue:', error)
    setIsSaving(false)
    setShowAddModal(false)
  }, [cues, rundown.id, supabase])

  const importCues = useCallback(async (inputs: CreateCueInput[]) => {
    setIsSaving(true)
    const startPos = cues.length > 0 ? Math.max(...cues.map(c => c.position)) + 1 : 0
    const rows = inputs.map((input, i) => ({
      rundown_id:       rundown.id,
      position:         startPos + i,
      title:            input.title,
      type:             input.type,
      duration_seconds: input.duration_seconds,
      notes:            input.notes ?? null,
      tech_notes:       input.tech_notes ?? null,
      presenter:        input.presenter ?? null,
      location:         input.location ?? null,
      status:           'pending' as const,
    }))
    const { error } = await supabase.from('cues').insert(rows)
    if (error) { console.error('Import fout:', error); throw error }
    setIsSaving(false)
  }, [cues, rundown.id, supabase])

  const applyTemplate = useCallback(async (templateCues: TemplateCue[]) => {
    setIsSaving(true)
    // Verwijder alle bestaande cues
    if (cues.length > 0) {
      await Promise.all(cues.map((c) => supabase.from('cues').delete().eq('id', c.id)))
    }
    // Voeg template-cues in
    const rows = templateCues.map((tc, i) => ({
      rundown_id:       rundown.id,
      position:         i,
      title:            tc.title,
      type:             tc.type,
      duration_seconds: tc.duration_seconds,
      notes:            tc.notes ?? null,
      tech_notes:       tc.tech_notes ?? null,
      presenter:        tc.presenter ?? null,
      location:         tc.location ?? null,
      status:           'pending' as const,
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('cues').insert(rows)
      if (error) console.error('Template toepassen mislukt:', error)
    }
    setIsSaving(false)
  }, [cues, rundown.id, supabase])

  const updateCue = useCallback(async (id: string, updates: UpdateCueInput) => {
    setIsSaving(true)
    const { error } = await supabase.from('cues').update(updates).eq('id', id)
    if (error) console.error('Fout bij updaten cue:', error)
    setIsSaving(false)
    setEditingCue(null)
  }, [supabase])

  const deleteCue = useCallback(async (id: string) => {
    const { error } = await supabase.from('cues').delete().eq('id', id)
    if (error) console.error('Fout bij verwijderen cue:', error)
  }, [supabase])

  // ── Dupliceer cue ────────────────────────────────────────────────────────
  const duplicateCue = useCallback(async (cue: Cue) => {
    const maxPos = cue.position + 1
    // Schuif alle cues na de duplicaat naar voren
    const toShift = cues.filter((c) => c.position >= maxPos)
    await Promise.all(
      toShift.map((c) =>
        supabase.from('cues').update({ position: c.position + 1 }).eq('id', c.id)
      )
    )
    await supabase.from('cues').insert({
      rundown_id:       cue.rundown_id,
      position:         maxPos,
      title:            `${cue.title} (kopie)`,
      type:             cue.type,
      duration_seconds: cue.duration_seconds,
      notes:            cue.notes,
      tech_notes:       cue.tech_notes,
      presenter:        cue.presenter,
      location:         cue.location,
      status:           'pending',
    })
  }, [cues, supabase])

  // ── Reset alle cues ──────────────────────────────────────────────────────
  const resetAllCues = useCallback(async () => {
    setShowResetConfirm(false)
    await Promise.all(
      cues.map((c) =>
        supabase.from('cues').update({
          status: 'pending',
          started_at: null,
        }).eq('id', c.id)
      )
    )
  }, [cues, supabase])

  const startCue = useCallback(async (id: string) => {
    const runningCue = cues.find((c) => c.status === 'running')
    if (runningCue) {
      await supabase.from('cues').update({ status: 'done' } as Record<string, unknown>).eq('id', runningCue.id)
    }
    await supabase.from('cues').update({
      status: 'running',
      started_at: new Date().toISOString(),
    } as Record<string, unknown>).eq('id', id)

    // Companion webhook aanroepen
    const targetCue = cues.find((c) => c.id === id)
    if (rundown.companion_webhook_url && targetCue) {
      fetch(rundown.companion_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:    'cue_started',
          source:   'CueBoard',
          cue: {
            id:       targetCue.id,
            title:    targetCue.title,
            type:     targetCue.type,
            position: targetCue.position + 1,
            duration: targetCue.duration_seconds,
            presenter: targetCue.presenter,
            location:  targetCue.location,
          },
          rundown: { id: rundown.id, name: rundown.name },
          show:    { id: show.id, name: show.name },
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => { /* Webhook fouten negeren */ })
    }
  }, [cues, rundown, show, supabase])

  const skipCue   = useCallback(async (id: string) => updateCue(id, { status: 'skipped' }), [updateCue])
  const resetCue  = useCallback(async (id: string) => updateCue(id, { status: 'pending', started_at: null }), [updateCue])

  // ── Rundown instellingen opslaan ─────────────────────────────────────────
  const saveRundownSettings = useCallback(async (updates: {
    name: string
    show_start_time: string | null
    companion_webhook_url: string | null
    presenter_pin: string | null
    notes: string | null
  }) => {
    const { data, error } = await supabase
      .from('rundowns')
      .update(updates)
      .eq('id', rundown.id)
      .select()
      .single()
    if (!error && data) setRundown(data as Rundown)
  }, [rundown.id, supabase])

  // ── Rundown vergrendelen / ontgrendelen ─────────────────────────────────
  const toggleLock = useCallback(async () => {
    setLocking(true)
    const newLocked = !rundown.is_locked
    await supabase.from('rundowns').update({ is_locked: newLocked } as Record<string, unknown>).eq('id', rundown.id)
    setRundown(prev => ({ ...prev, is_locked: newLocked }))
    setLocking(false)
  }, [rundown.id, rundown.is_locked, supabase])

  // ── Snapshot aanmaken ────────────────────────────────────────────────────
  const createSnapshot = useCallback(async () => {
    setSnapshotting(true)
    const label = `Snapshot ${new Date().toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('rundown_snapshots').insert({
      rundown_id: rundown.id,
      label,
      cues_json: cues,
    })
    setSnapshotting(false)
    setSnapshotDone(true)
    setTimeout(() => setSnapshotDone(false), 2500)
  }, [rundown.id, cues, supabase])

  // ── Snapshot terugzetten ─────────────────────────────────────────────────
  const restoreSnapshot = useCallback(async (snapCues: Cue[]) => {
    // Delete all current cues
    await supabase.from('cues').delete().eq('rundown_id', rundown.id)
    // Re-insert snapshot cues with fresh positions
    const toInsert = snapCues.map((c, i) => ({
      rundown_id:      rundown.id,
      position:        i,
      title:           c.title,
      type:            c.type,
      duration_seconds: c.duration_seconds,
      notes:           c.notes ?? null,
      tech_notes:      c.tech_notes ?? null,
      presenter:       c.presenter ?? null,
      location:        c.location ?? null,
      status:          'pending' as const,
      color:           c.color ?? null,
      auto_advance:    c.auto_advance ?? null,
    }))
    if (toInsert.length > 0) {
      const { data } = await supabase.from('cues').insert(toInsert).select()
      if (data) setCues(data as Cue[])
    } else {
      setCues([])
    }
  }, [rundown.id, supabase])

  // ── Rundown dupliceren ───────────────────────────────────────────────────
  const duplicateRundown = useCallback(async () => {
    const { data: newRundown, error: rundownErr } = await supabase
      .from('rundowns')
      .insert({
        show_id:               show.id,
        name:                  `${rundown.name} (kopie)`,
        show_start_time:       rundown.show_start_time,
        companion_webhook_url: rundown.companion_webhook_url,
        presenter_pin:         rundown.presenter_pin,
        notes:                 rundown.notes,
      })
      .select()
      .single()
    if (rundownErr || !newRundown) return
    if (cues.length > 0) {
      await supabase.from('cues').insert(
        cues.map((c) => ({
          rundown_id:       (newRundown as { id: string }).id,
          position:         c.position,
          title:            c.title,
          type:             c.type,
          duration_seconds: c.duration_seconds,
          notes:            c.notes,
          tech_notes:       c.tech_notes,
          presenter:        c.presenter,
          location:         c.location,
          status:           'pending' as const,
        }))
      )
    }
    router.push(`/shows/${show.id}/rundown/${(newRundown as { id: string }).id}`)
  }, [cues, rundown, show.id, supabase, router])

  // ── Rundown verwijderen ───────────────────────────────────────────────────
  const deleteRundown = useCallback(async () => {
    const { error } = await supabase.from('rundowns').delete().eq('id', rundown.id)
    if (!error) {
      router.push('/dashboard')
    } else {
      console.error('Fout bij verwijderen rundown:', error)
    }
  }, [rundown.id, supabase, router])

  // ── Nudge sturen ─────────────────────────────────────────────────────────
  const sendNudge = useCallback(async () => {
    if (nudgeActive || !channelRef.current) return
    setNudgeActive(true)
    await channelRef.current.send({
      type: 'broadcast',
      event: 'nudge',
      payload: { from: userId, message: '🔔 Aandacht van de caller!' },
    })
    setTimeout(() => setNudgeActive(false), 2000)
  }, [nudgeActive, userId])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setShowAddModal(true) }
      if (e.key === '?') { e.preventDefault(); setShowShortcutHelp(v => !v) }
      if (e.key === 'Escape') { setShowAddModal(false); setEditingCue(null); setShowShortcutHelp(false); setShowSharePanel(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  async function handleDragEnd(event: DragEndEvent) {
    if (rundown.is_locked) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex  = cues.findIndex((c) => c.id === active.id)
    const newIndex  = cues.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(cues, oldIndex, newIndex).map((cue, i) => ({ ...cue, position: i }))
    setCues(reordered)
    await Promise.all(
      reordered.map((cue) =>
        supabase.from('cues').update({ position: cue.position } as Record<string, unknown>).eq('id', cue.id)
      )
    )
  }

  // ── Berekeningen ─────────────────────────────────────────────────────────
  const totalSecs    = totalDuration(cues.map((c) => c.duration_seconds))
  const doneSecs     = totalDuration(cues.filter((c) => c.status === 'done').map((c) => c.duration_seconds))
  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)

  const filteredCues = activeFilter === 'all'
    ? cues
    : cues.filter((c) => c.type === activeFilter)

  const currentFilterLabel = FILTER_OPTIONS.find((f) => f.value === activeFilter)?.label ?? 'Alles'

  const hasRunningOrDone = cues.some((c) => c.status !== 'pending')

  function copyShareLink(key: string, url: string) {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopiedShareKey(key)
    setTimeout(() => setCopiedShareKey(null), 2000)
  }

  const baseShareUrl   = typeof window !== 'undefined' ? window.location.origin : ''
  const basePath       = `/shows/${show.id}/rundown/${rundown.id}`
  const shareLinks = [
    { key: 'caller',    label: '🎙 Caller',    url: `${baseShareUrl}${basePath}/caller`,    color: 'text-green-400' },
    { key: 'presenter', label: '🖥 Presenter', url: `${baseShareUrl}${basePath}/presenter`, color: '' },
    { key: 'crew',      label: '📱 Crew',      url: `${baseShareUrl}${basePath}/crew`,      color: '' },
    { key: 'print',     label: '🖨 Afdrukken', url: `${baseShareUrl}${basePath}/print`,     color: 'text-muted-foreground' },
  ]

  return (
    <div className="flex flex-col h-full gap-0 relative">

      {/* ── Nudge melding ─────────────────────────────────────────────── */}
      {nudgeMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500 text-black font-bold px-6 py-3 rounded-full shadow-xl animate-bounce text-sm">
          {nudgeMessage}
        </div>
      )}

      {/* ── Reset bevestiging overlay ─────────────────────────────────── */}
      {showResetConfirm && (
        <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <h3 className="font-semibold">Alles resetten?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Alle cues worden terugezet naar "pending". De show-voortgang gaat verloren.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                Annuleren
              </Button>
              <Button variant="destructive" size="sm" onClick={resetAllCues}>
                Reset alles
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <span>/</span>
          <Link href={`/shows/${show.id}`} className="hover:text-foreground transition-colors">
            {show.name}
          </Link>
          <span>/</span>
          <span>{rundown.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {/* Rundown naam — klikbaar dropdown als er meerdere rundowns zijn */}
            {allRundowns.length > 1 ? (
              <div className="relative">
                <button
                  onClick={() => setShowRundownMenu(!showRundownMenu)}
                  className="flex items-center gap-1.5 text-2xl font-bold hover:text-primary transition-colors group"
                >
                  {rundown.name}
                  <ChevronLeft className="h-5 w-5 -rotate-90 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                {showRundownMenu && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[200px]">
                    {allRundowns.map((r) => (
                      <Link
                        key={r.id}
                        href={`/shows/${show.id}/rundown/${r.id}`}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                          r.id === rundown.id && 'text-primary font-medium'
                        )}
                        onClick={() => setShowRundownMenu(false)}
                      >
                        <ListMusic className="h-3.5 w-3.5 shrink-0" />
                        {r.name}
                        {r.id === rundown.id && <span className="ml-auto text-xs text-muted-foreground">Huidig</span>}
                      </Link>
                    ))}
                    <hr className="border-border/50 my-1" />
                    <Link
                      href={`/shows/${show.id}/rundown/new`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
                      onClick={() => setShowRundownMenu(false)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nieuwe rundown
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{rundown.name}</h1>
            )}
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {show.date && <span>{formatDate(show.date)}</span>}
              {show.venue && <span>· {show.venue}</span>}
              {rundown.show_start_time && (
                <span className="flex items-center gap-1 text-primary/70">
                  <Clock className="h-3 w-3" />
                  Aanvang {rundown.show_start_time.slice(0, 5)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badges */}
            <Badge variant="outline" className={cn('gap-1 text-xs', isOnline ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30')}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Live' : 'Offline'}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Users className="h-3 w-3" /> {connectedUsers}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" /> {formatDuration(totalSecs)}
            </Badge>

            {/* Filter dropdown */}
            <div className="relative">
              <Button
                size="sm" variant="outline"
                className={cn('gap-2', activeFilter !== 'all' && 'border-primary/50 text-primary')}
                onClick={() => { setShowFilterMenu(!showFilterMenu); setShowViewMenu(false) }}
              >
                <Filter className="h-3.5 w-3.5" />
                {currentFilterLabel}
              </Button>
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[140px]">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors',
                        activeFilter === opt.value && 'text-primary font-medium'
                      )}
                      onClick={() => { setActiveFilter(opt.value); setShowFilterMenu(false) }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Views dropdown */}
            <div className="relative">
              <Button
                size="sm" variant="outline"
                className="gap-2 text-muted-foreground"
                onClick={() => { setShowViewMenu(!showViewMenu); setShowFilterMenu(false) }}
                title="Views openen"
              >
                <Monitor className="h-3.5 w-3.5" />
                Views
              </Button>
              {showViewMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[180px]">
                  <a
                    href={`/shows/${show.id}/rundown/${rundown.id}/caller`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-green-400"
                  >
                    <Radio className="h-3.5 w-3.5" /> Caller Mode
                  </a>
                  <a
                    href={`/shows/${show.id}/rundown/${rundown.id}/presenter`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <Monitor className="h-3.5 w-3.5" /> Presenter View
                  </a>
                  <a
                    href={`/shows/${show.id}/rundown/${rundown.id}/crew`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Crew View
                  </a>
                  <hr className="border-border/50 my-1" />
                  <a
                    href={`/shows/${show.id}/rundown/${rundown.id}/print`}
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <Printer className="h-3.5 w-3.5" /> Afdrukken / PDF
                  </a>
                  <hr className="border-border/50 my-1" />
                  <button
                    onClick={() => { setShowViewMenu(false); setShowSaveTemplate(true) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors text-muted-foreground text-left"
                    disabled={cues.length === 0}
                  >
                    <BookTemplate className="h-3.5 w-3.5" /> Opslaan als template
                  </button>
                </div>
              )}
            </div>

            {/* Delen */}
            <div className="relative">
              <Button
                size="sm" variant="outline"
                onClick={() => { setShowSharePanel(!showSharePanel); setShowViewMenu(false); setShowFilterMenu(false) }}
                className={cn('gap-2', showSharePanel && 'border-primary/50 text-primary')}
                title="Links delen"
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              {showSharePanel && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSharePanel(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl p-3 min-w-[300px]">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Deel links
                    </p>
                    <div className="space-y-1.5">
                      {shareLinks.map(({ key, label, url, color }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className={cn('text-xs flex-1 truncate font-medium', color)}>{label}</span>
                          <span className="text-xs text-muted-foreground font-mono truncate max-w-[130px]">{url.replace(/^https?:\/\/[^/]+/, '')}</span>
                          <button
                            onClick={() => copyShareLink(key, url)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            title="Kopieer link"
                          >
                            {copiedShareKey === key
                              ? <Check className="h-3.5 w-3.5 text-green-400" />
                              : <Copy className="h-3.5 w-3.5" />
                            }
                          </button>
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            title="Openen"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                      Presenter & Crew view vereisen geen inlog.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Mic patch */}
            <Button
              size="sm" variant="outline"
              onClick={() => setShowMicPatch(true)}
              className="gap-2 text-muted-foreground"
              title="Mic patch bekijken"
            >
              <Radio className="h-3.5 w-3.5" />
            </Button>

            {/* Cue log */}
            <Button
              size="sm" variant="outline"
              onClick={() => setShowCueLog(true)}
              className="gap-2 text-muted-foreground"
              title="Cue log bekijken"
            >
              <History className="h-3.5 w-3.5" />
            </Button>

            {/* Lock/Unlock rundown */}
            <Button
              size="sm" variant="outline"
              onClick={toggleLock}
              disabled={locking}
              className={cn(
                'gap-2',
                rundown.is_locked
                  ? 'text-orange-400 border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20'
                  : 'text-muted-foreground'
              )}
              title={rundown.is_locked ? 'Rundown ontgrendelen' : 'Rundown vergrendelen (voorkomt bewerken)'}
            >
              {rundown.is_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>

            {/* Snapshot / versie opslaan */}
            <Button
              size="sm" variant="outline"
              onClick={createSnapshot}
              disabled={snapshotting || cues.length === 0}
              className={cn(
                'gap-2',
                snapshotDone
                  ? 'text-green-400 border-green-500/40 bg-green-500/10'
                  : 'text-muted-foreground'
              )}
              title="Versie opslaan (snapshot)"
            >
              {snapshotDone
                ? <Check className="h-3.5 w-3.5" />
                : <Camera className="h-3.5 w-3.5" />
              }
            </Button>

            {/* Nudge knop */}
            <Button
              size="sm" variant="outline"
              onClick={sendNudge}
              disabled={nudgeActive}
              className={cn(
                'gap-2',
                nudgeActive ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10' : 'text-muted-foreground'
              )}
              title="Ping alle verbonden crew"
            >
              {nudgeActive ? <BellRing className="h-3.5 w-3.5 animate-bounce" /> : <Bell className="h-3.5 w-3.5" />}
            </Button>

            {/* Reset alles */}
            {hasRunningOrDone && (
              <Button
                size="sm" variant="outline"
                onClick={() => setShowResetConfirm(true)}
                className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                title="Reset alle cues"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Instellingen */}
            <Button
              size="sm" variant="outline"
              onClick={() => setShowSettings(true)}
              className="gap-2 text-muted-foreground"
              title="Rundown instellingen"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            {/* Import */}
            <Button
              size="sm" variant="outline"
              onClick={() => setShowImportModal(true)}
              className="gap-2 text-muted-foreground"
              title="Cues importeren vanuit CSV of Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </Button>

            {/* Templates */}
            <div className="relative">
              <Button
                size="sm" variant="outline"
                className="gap-2 text-muted-foreground"
                title="Rundown templates"
                onClick={() => setShowLoadTemplate(true)}
              >
                <BookTemplate className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Cue toevoegen */}
            <Button size="sm" onClick={() => setShowAddModal(true)} disabled={rundown.is_locked}>
              <Plus className="h-4 w-4" /> Cue
            </Button>
          </div>
        </div>

        {/* Voortgangsbalk */}
        {totalSecs > 0 && (
          <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (doneSecs / totalSecs) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Vergrendeld banner ────────────────────────────────────────── */}
      {rundown.is_locked && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-sm text-orange-300">
          <Lock className="h-4 w-4 shrink-0" />
          <span className="font-medium">Rundown is vergrendeld</span>
          <span className="text-orange-400/70">— bewerken is uitgeschakeld. Klik op het slotje in de toolbar om te ontgrendelen.</span>
        </div>
      )}

      {/* ── Kolom headers ─────────────────────────────────────────────── */}
      <div className="rundown-grid px-4 py-2 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1">
        <span />
        <span className="pl-1">#</span>
        <span>Titel</span>
        <span>Type</span>
        <span className="text-right">Duur</span>
        <span>Status</span>
        <span />
      </div>

      {/* ── Cue lijst ─────────────────────────────────────────────────── */}
      {filteredCues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            {activeFilter !== 'all' ? (
              <Filter className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Plus className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <p className="font-medium">
            {activeFilter !== 'all' ? `Geen ${currentFilterLabel} cues` : 'Nog geen cues'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {activeFilter !== 'all'
              ? 'Pas het filter aan om andere cues te zien.'
              : 'Voeg je eerste cue toe om de rundown te starten.'}
          </p>
          {activeFilter === 'all' && (
            <Button className="mt-4" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" /> Eerste cue toevoegen
            </Button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={cues.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-px">
              {filteredCues.map((cue) => {
                const globalIndex = cues.findIndex((c) => c.id === cue.id)
                return (
                  <SortableCueRow
                    key={cue.id}
                    cue={cue}
                    index={globalIndex}
                    expectedTime={expectedTimes[globalIndex]}
                    onEdit={rundown.is_locked ? undefined : () => setEditingCue(cue)}
                    onDelete={rundown.is_locked ? undefined : () => deleteCue(cue.id)}
                    onDuplicate={rundown.is_locked ? undefined : () => duplicateCue(cue)}
                    onStart={() => startCue(cue.id)}
                    onSkip={() => skipCue(cue.id)}
                    onReset={() => resetCue(cue.id)}
                    locked={rundown.is_locked}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <CueFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addCue}
        loading={isSaving}
        supabase={supabase}
        rundownId={rundown.id}
      />

      {editingCue && (
        <CueFormModal
          open={!!editingCue}
          onClose={() => setEditingCue(null)}
          onSave={(input) => updateCue(editingCue.id, input)}
          initialValues={editingCue}
          loading={isSaving}
          mode="edit"
          supabase={supabase}
          rundownId={rundown.id}
        />
      )}

      <RundownSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        rundown={rundown}
        show={show}
        supabase={supabase}
        onSave={saveRundownSettings}
        onDelete={deleteRundown}
        onDuplicate={duplicateRundown}
        onRestore={restoreSnapshot}
        onRundownUpdated={(updated) => setRundown(updated)}
      />

      {showImportModal && (
        <ImportCuesModal
          onClose={() => setShowImportModal(false)}
          onImport={importCues}
        />
      )}

      <SaveTemplateModal
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        rundownName={rundown.name}
        cues={cues}
      />

      <LoadTemplateModal
        open={showLoadTemplate}
        onClose={() => setShowLoadTemplate(false)}
        onApply={applyTemplate}
        hasCues={cues.length > 0}
      />

      {showCueLog && (
        <CueLogPanel
          rundownId={rundown.id}
          rundownName={rundown.name}
          onClose={() => setShowCueLog(false)}
        />
      )}

      <MicPatchPanel
        showId={show.id}
        rundownId={rundown.id}
        cues={cues}
        open={showMicPatch}
        onClose={() => setShowMicPatch(false)}
      />

      {/* Sluit menu's bij klik buiten */}
      {(showFilterMenu || showViewMenu || showRundownMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowFilterMenu(false); setShowViewMenu(false); setShowRundownMenu(false) }}
        />
      )}

      {/* Sneltoetsen hint */}
      <div className="mt-4 text-center text-xs text-muted-foreground/30">
        <kbd className="px-1.5 rounded border border-border/30 font-mono">A</kbd> Toevoegen &nbsp;·&nbsp;
        <kbd className="px-1.5 rounded border border-border/30 font-mono">Esc</kbd> Sluiten &nbsp;·&nbsp;
        <button
          className="hover:text-muted-foreground/60 transition-colors"
          onClick={() => setShowShortcutHelp(true)}
        >
          <kbd className="px-1.5 rounded border border-border/30 font-mono">?</kbd> Alle sneltoetsen
        </button>
      </div>

      {showShortcutHelp && (
        <ShortcutHelp onClose={() => setShowShortcutHelp(false)} />
      )}
    </div>
  )
}
