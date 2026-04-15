'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration } from '@/lib/utils'
import { Clock, ChevronRight, Radio, Pencil, Check, X, MapPin, Loader2, Wrench } from 'lucide-react'
import type { CastMember, Show, Rundown, Cue } from '@/lib/types/database'

interface GreenRoomPermissions {
  view_all_cues:   boolean
  edit_cues:       boolean
  view_tech_notes: boolean
  view_countdown:  boolean
}

const DEFAULT_PERMISSIONS: GreenRoomPermissions = {
  view_all_cues:   true,
  edit_cues:       true,
  view_tech_notes: false,
  view_countdown:  true,
}

interface GreenRoomViewProps {
  castMember: CastMember | null
  show: Show
  rundowns: Rundown[]
  cues: Cue[]
  token: string
}

function useWallClock() {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
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

// ── Initials avatar ───────────────────────────────────────────────────────────
function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'sm' ? 'h-7 w-7 text-xs' : 'h-10 w-10 text-sm'
  return (
    <div className={`${sz} rounded-2xl flex items-center justify-center font-bold shrink-0`}
         style={{ backgroundColor: color + '30', color }}>
      {initials}
    </div>
  )
}

export function GreenRoomView({ castMember, show, rundowns, cues: initialCues, token }: GreenRoomViewProps) {
  const supabase = createClient()
  const now = useWallClock()
  const [cues, setCues] = useState<Cue[]>(initialCues)

  const memberName  = castMember?.name ?? null
  const memberColor = castMember?.color ?? '#10b981'

  // Permissies ophalen uit het cast member object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms: GreenRoomPermissions = { ...DEFAULT_PERMISSIONS, ...((castMember as any)?.permissions ?? {}) }

  // Realtime cue updates
  useEffect(() => {
    const rundownIds = rundowns.map(r => r.id)
    if (rundownIds.length === 0) return

    const channels = rundownIds.map(rid =>
      supabase
        .channel(`green-room-${token}-${rid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rid}` }, (payload) => {
          const updated = payload.new as Cue
          setCues(prev => prev.map(c => c.id === updated.id ? updated : c))
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cues', filter: `rundown_id=eq.${rid}` }, (payload) => {
          const c = payload.new as Cue
          setCues(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.position - b.position))
        })
        .subscribe()
    )
    return () => { channels.forEach(ch => supabase.removeChannel(ch)) }
  }, [rundowns, token, supabase])

  const activeCue  = cues.find(c => c.status === 'running') ?? null
  const isMyActive = activeCue && memberName && activeCue.presenter?.toLowerCase().includes(memberName.toLowerCase())
  const myCues     = memberName ? cues.filter(c => c.presenter?.toLowerCase().includes(memberName.toLowerCase())) : []
  const myNext     = myCues.find(c => c.status === 'pending')
  const countdown  = activeCue ? calcCountdown(activeCue, now) : 0
  const progress   = activeCue ? calcProgress(activeCue, now) : 0

  // Welke cues tonen in volledig programma
  // Als view_all_cues=false → alleen cues van deze member
  const visibleCues = (rundownId: string) => {
    const all = cues.filter(c => c.rundown_id === rundownId)
    if (perms.view_all_cues) return all
    if (!memberName) return []
    return all.filter(c => c.presenter?.toLowerCase().includes(memberName.toLowerCase()))
  }

  // ── Cue editing ──────────────────────────────────────────────────────────────
  const [editingCueId, setEditingCueId] = useState<string | null>(null)
  const [editTitle, setEditTitle]       = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState<string | null>(null)

  function startEdit(cue: Cue) {
    if (!perms.edit_cues) return
    setEditingCueId(cue.id)
    setEditTitle(cue.title)
    setEditLocation(cue.location ?? '')
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingCueId(null)
    setSaveError(null)
  }

  const saveEdit = useCallback(async (cueId: string) => {
    if (!perms.edit_cues) return
    setSaving(true)
    setSaveError(null)
    try {
      const resp = await fetch('/api/green-room/cue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          cueId,
          title:    editTitle,
          location: editLocation,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Opslaan mislukt')
      }
      // Optimistisch updaten in lokale state
      setCues(prev => prev.map(c =>
        c.id === cueId ? { ...c, title: editTitle, location: editLocation || null } : c
      ))
      setEditingCueId(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setSaving(false)
    }
  }, [token, editTitle, editLocation, perms.edit_cues])

  return (
    <div className="min-h-screen bg-[#050f09] text-white select-none">

      {/* Top bar */}
      <div className="border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.55)]" />
          <span className="font-extrabold text-sm tracking-tight text-white uppercase">Cue<span className="text-emerald-400">Board</span></span>
        </div>
        <div className="text-xs font-mono text-white/30">
          {now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-8 space-y-6">

        {/* Green Room member identity */}
        {castMember ? (
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <Avatar name={castMember.name} color={memberColor} size="lg" />
            <div>
              <p className="font-extrabold text-2xl text-white leading-tight">{castMember.name}</p>
              {castMember.role && <p className="text-white/45 text-sm mt-0.5">{castMember.role}</p>}
              <p className="text-xs text-white/25 mt-1">{show.name}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <p className="font-extrabold text-xl text-white">{show.name}</p>
            <p className="text-white/35 text-sm mt-1">Green Room</p>
          </div>
        )}

        {/* ── NU LIVE ── */}
        {activeCue && (
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Nu live
            </p>
            <div className={cn(
              'rounded-2xl border-2 p-5',
              isMyActive
                ? 'border-emerald-400/50 bg-emerald-500/[0.07] shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                : 'border-white/10 bg-white/[0.02]'
            )}>
              {isMyActive && (
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">
                  🎤 Jij bent nu!
                </p>
              )}
              <p className="text-lg font-bold text-white mb-1">{activeCue.title}</p>
              {activeCue.presenter && (
                <p className="text-sm text-white/40 mb-4">{activeCue.presenter}</p>
              )}

              {/* Countdown — alleen tonen als view_countdown=true */}
              {perms.view_countdown && (
                <>
                  <p className={cn(
                    'text-5xl font-extrabold font-mono tabular-nums text-center mb-3',
                    countdown <= 15 ? 'text-red-400' : countdown <= 60 ? 'text-yellow-400' : 'text-white'
                  )}>
                    {formatDuration(countdown)}
                  </p>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-1000',
                        countdown <= 15 ? 'bg-red-500' : countdown <= 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </>
              )}

              {activeCue.notes && (
                <p className="mt-3 text-sm text-white/50 italic">{activeCue.notes}</p>
              )}

              {/* Tech notes — alleen als view_tech_notes=true */}
              {perms.view_tech_notes && activeCue.tech_notes && (
                <div className="mt-3 flex items-start gap-2 bg-yellow-500/[0.06] border border-yellow-500/20 rounded-xl px-3 py-2">
                  <Wrench className="h-3.5 w-3.5 text-yellow-400/70 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-400/80">{activeCue.tech_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── JOUW VOLGENDE CUE ── */}
        {myNext && myNext.id !== activeCue?.id && (
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">
              Jouw volgende cue
            </p>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-emerald-500/10 shrink-0">
                <ChevronRight className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{myNext.title}</p>
                <p className="text-xs text-white/35 mt-0.5">
                  Cue #{myNext.position + 1} · {formatDuration(myNext.duration_seconds)}
                </p>
              </div>
              <div className="shrink-0 text-xs font-mono text-emerald-400/60 border border-emerald-500/20 px-2 py-1 rounded-lg">
                {formatDuration(myNext.duration_seconds)}
              </div>
            </div>
          </div>
        )}

        {/* ── JOUW CUES ── */}
        {myCues.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
              Jouw cues ({myCues.length})
            </p>
            <div className="space-y-2">
              {myCues.map(cue => (
                <div key={cue.id} className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                  cue.status === 'running'  ? 'border-emerald-500/40 bg-emerald-500/[0.06]' :
                  cue.status === 'done' || cue.status === 'skipped' ? 'border-white/[0.04] opacity-40' :
                  'border-white/[0.08] bg-white/[0.015]'
                )}>
                  <span className="text-xs font-mono text-white/25 w-6 shrink-0">
                    #{cue.position + 1}
                  </span>
                  <span className={cn(
                    'flex-1 text-sm font-medium truncate',
                    cue.status === 'running' ? 'text-white font-bold' :
                    cue.status === 'done' || cue.status === 'skipped' ? 'line-through text-white/30' :
                    'text-white/70'
                  )}>
                    {cue.title}
                  </span>
                  <span className="text-xs font-mono text-white/30 shrink-0">
                    {formatDuration(cue.duration_seconds)}
                  </span>
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide shrink-0',
                    cue.status === 'running'  ? 'bg-emerald-500/20 text-emerald-400' :
                    cue.status === 'done'     ? 'bg-white/5 text-white/20' :
                    cue.status === 'skipped'  ? 'bg-red-500/10 text-red-400/50' :
                    'bg-white/[0.04] text-white/25'
                  )}>
                    {cue.status === 'running' ? '● Live' : cue.status === 'done' ? '✓' : cue.status === 'skipped' ? '—' : 'Wacht'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VOLLEDIG PROGRAMMA ── */}
        <div>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">
            {perms.view_all_cues ? 'Volledig programma' : 'Jouw programma'}
          </p>
          {perms.edit_cues && (
            <p className="text-[10px] text-white/20 mb-3 flex items-center gap-1">
              <Pencil className="h-2.5 w-2.5" /> Tik op een cue om de naam of locatie aan te passen
            </p>
          )}
          {rundowns.map(rundown => {
            const rundownCues = visibleCues(rundown.id)
            if (rundownCues.length === 0) return null
            return (
              <div key={rundown.id} className="mb-4">
                {rundowns.length > 1 && (
                  <p className="text-xs font-semibold text-white/30 mb-2 flex items-center gap-1.5">
                    <Radio className="h-3 w-3" /> {rundown.name}
                  </p>
                )}
                <div className="space-y-1">
                  {rundownCues.map(cue => {
                    const isMe = memberName && cue.presenter?.toLowerCase().includes(memberName.toLowerCase())
                    const isEditing = editingCueId === cue.id
                    const canEdit = perms.edit_cues && cue.status !== 'running' && cue.status !== 'done' && cue.status !== 'skipped'

                    if (isEditing) {
                      return (
                        <div key={cue.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-white/20 w-5 shrink-0">{cue.position + 1}</span>
                            <input
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              placeholder="Naam van de cue"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 shrink-0" />
                            <div className="flex-1 flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                              <MapPin className="h-3 w-3 text-white/30 shrink-0" />
                              <input
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                                value={editLocation}
                                onChange={e => setEditLocation(e.target.value)}
                                placeholder="Podium / locatie (optioneel)"
                              />
                            </div>
                          </div>
                          {saveError && (
                            <p className="text-xs text-red-400/80 px-6">{saveError}</p>
                          )}
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors px-2 py-1"
                            >
                              <X className="h-3.5 w-3.5" /> Annuleren
                            </button>
                            <button
                              onClick={() => saveEdit(cue.id)}
                              disabled={saving || !editTitle.trim()}
                              className="flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold px-3 py-1.5 rounded-lg transition-all"
                            >
                              {saving
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Check className="h-3.5 w-3.5" />
                              }
                              Opslaan
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={cue.id}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                          cue.status === 'running'  ? 'bg-emerald-500/[0.06] border border-emerald-500/25' :
                          cue.status === 'done' || cue.status === 'skipped' ? 'opacity-30' :
                          isMe ? 'bg-white/[0.03] border border-white/[0.08]' : '',
                          canEdit ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                        )}
                        onClick={() => canEdit && startEdit(cue)}
                      >
                        <span className="text-[11px] font-mono text-white/20 w-5 shrink-0">
                          {cue.position + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            'block truncate',
                            cue.status === 'running' ? 'text-white font-semibold' :
                            cue.status === 'done' || cue.status === 'skipped' ? 'line-through text-white/30' :
                            isMe ? 'text-white/80' : 'text-white/40'
                          )}>
                            {cue.title}
                            {isMe && <span className="ml-1.5 text-[10px] text-emerald-400/70 font-bold normal-case">● jij</span>}
                          </span>
                          {cue.location && (
                            <span className="flex items-center gap-1 text-[10px] text-white/25 mt-0.5">
                              <MapPin className="h-2.5 w-2.5" /> {cue.location}
                            </span>
                          )}
                          {/* Tech notes — alleen als view_tech_notes=true */}
                          {perms.view_tech_notes && cue.tech_notes && (
                            <span className="flex items-center gap-1 text-[10px] text-yellow-400/50 mt-0.5">
                              <Wrench className="h-2.5 w-2.5" /> {cue.tech_notes}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-white/20 shrink-0">
                          {formatDuration(cue.duration_seconds)}
                        </span>
                        {canEdit && (
                          <Pencil className="h-3 w-3 text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
