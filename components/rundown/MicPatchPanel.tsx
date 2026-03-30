'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Mic, Plus, Trash2, Pencil, Loader2, AlertTriangle, Headphones,
  Volume2, Radio, Monitor,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AudioDevice, AudioDeviceType, Cue } from '@/lib/types/database'

interface MicPatchPanelProps {
  showId: string
  rundownId: string
  cues: Cue[]
  open: boolean
  onClose: () => void
}

const DEVICE_TYPES: { value: AudioDeviceType; label: string; icon: React.ElementType }[] = [
  { value: 'handheld', label: 'Handmicrofoon', icon: Mic },
  { value: 'headset',  label: 'Headset',       icon: Headphones },
  { value: 'lapel',    label: 'Dasspeld',      icon: Radio },
  { value: 'table',    label: 'Tafelmicrofoon', icon: Monitor },
  { value: 'iem',      label: 'IEM / Oortje',  icon: Volume2 },
]

const COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#84cc16','#6366f1',
]

interface Assignment {
  id: string
  cue_id: string
  device_id: string
  person_name: string | null
  phase: string
}

function deviceTypeIcon(type: AudioDeviceType) {
  const found = DEVICE_TYPES.find(d => d.value === type)
  return found ? found.icon : Mic
}

function deviceTypeLabel(type: AudioDeviceType) {
  const found = DEVICE_TYPES.find(d => d.value === type)
  return found ? found.label : type
}

export function MicPatchPanel({ showId, rundownId, cues, open, onClose }: MicPatchPanelProps) {
  const supabase = createClient()

  const [devices, setDevices]         = useState<AudioDevice[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [addDeviceOpen, setAddDeviceOpen] = useState(false)
  const [editDevice, setEditDevice]   = useState<AudioDevice | null>(null)

  // Device form state
  const [dName, setDName]       = useState('')
  const [dType, setDType]       = useState<AudioDeviceType>('handheld')
  const [dChannel, setDChannel] = useState('')
  const [dColor, setDColor]     = useState(COLORS[0])
  const [dNotes, setDNotes]     = useState('')

  // Assignment map: { [cueId-deviceId]: Assignment }
  const [assignMap, setAssignMap] = useState<Record<string, Assignment>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  // Realtime channel ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeRef = useRef<any>(null)

  // ── Initieel laden ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: devs } = await (supabase as any).from('audio_devices').select('*').eq('show_id', showId).order('name')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: asgns } = await (supabase as any).from('cue_audio_assignments').select('*').in('cue_id', cues.map(c => c.id))
    setDevices(devs ?? [])
    const map: Record<string, Assignment> = {}
    ;(asgns ?? []).forEach((a: Assignment) => {
      const key = `${a.cue_id}-${a.device_id}`
      if (!map[key]) map[key] = a
    })
    setAssignMap(map)
    setLoading(false)
  }, [showId, cues, supabase])

  useEffect(() => {
    if (!open) return
    load()
  }, [open, load])

  // ── Realtime subscription op cue_audio_assignments ────────────────────────
  useEffect(() => {
    if (!open || cues.length === 0) return

    const cueIds = cues.map(c => c.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`mic-patch:${rundownId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cue_audio_assignments' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const a = payload.new as Assignment
          if (!cueIds.includes(a.cue_id)) return
          const key = `${a.cue_id}-${a.device_id}`
          setAssignMap(prev => ({ ...prev, [key]: a }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cue_audio_assignments' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const a = payload.old as Assignment
          if (!cueIds.includes(a.cue_id)) return
          const key = `${a.cue_id}-${a.device_id}`
          setAssignMap(prev => {
            const next = { ...prev }
            delete next[key]
            return next
          })
        }
      )
      .subscribe()

    realtimeRef.current = ch
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).removeChannel(ch)
      realtimeRef.current = null
    }
  }, [open, rundownId, cues, supabase])

  // ── Device CRUD ───────────────────────────────────────────────────────────
  function openAddDevice() {
    setEditDevice(null)
    setDName(''); setDType('handheld'); setDChannel(''); setDColor(COLORS[0]); setDNotes('')
    setSaveError(null)
    setAddDeviceOpen(true)
  }

  function openEditDevice(d: AudioDevice) {
    setEditDevice(d)
    setDName(d.name); setDType(d.type); setDChannel(d.channel?.toString() ?? ''); setDColor(d.color); setDNotes(d.notes ?? '')
    setSaveError(null)
    setAddDeviceOpen(true)
  }

  async function saveDevice() {
    if (!dName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        show_id: showId, name: dName.trim(), type: dType,
        channel: dChannel ? parseInt(dChannel) : null,
        color: dColor, notes: dNotes.trim() || null,
      }
      let error: { message: string } | null = null
      if (editDevice) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any).from('audio_devices').update(payload).eq('id', editDevice.id)
        error = result.error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase as any).from('audio_devices').insert(payload)
        error = result.error
      }
      if (error) { setSaveError(error.message ?? 'Opslaan mislukt'); return }
      await load()
      setAddDeviceOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteDevice(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audio_devices').delete().eq('id', id)
    await load()
  }

  // ── Broadcast mic patch wijziging naar crew ───────────────────────────────
  async function broadcastMicChange(deviceName: string, cueName: string, added: boolean) {
    try {
      const ch = supabase.channel(`rundown:${rundownId}`)
      await ch.send({
        type: 'broadcast',
        event: 'mic_patch_change',
        payload: { deviceName, cueName, added },
      })
    } catch {
      // best-effort
    }
  }

  // ── Optimistic toggle — geen full reload, scroll blijft staan ─────────────
  async function toggleAssignment(cueId: string, deviceId: string) {
    const key = `${cueId}-${deviceId}`
    const existing = assignMap[key]

    // Zoek namen voor de melding
    const dev  = devices.find(d => d.id === deviceId)
    const cue  = cues.find(c => c.id === cueId)
    const devName = dev?.name ?? 'Apparaat'
    const cueName = cue?.title ?? 'cue'

    if (existing) {
      // Optimistic: verwijder direct
      setAssignMap(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('cue_audio_assignments')
        .delete()
        .eq('cue_id', cueId)
        .eq('device_id', deviceId)
      if (error) {
        setAssignMap(prev => ({ ...prev, [key]: existing }))
      } else {
        broadcastMicChange(devName, cueName, false)
      }
    } else {
      // Optimistic: voeg toe met tijdelijk id
      const tempAssignment: Assignment = {
        id: `temp-${Date.now()}`,
        cue_id: cueId,
        device_id: deviceId,
        person_name: null,
        phase: 'during',
      }
      setAssignMap(prev => ({ ...prev, [key]: tempAssignment }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cue_audio_assignments')
        .insert({ cue_id: cueId, device_id: deviceId, phase: 'during' })
        .select()
        .single()
      if (error) {
        setAssignMap(prev => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      } else {
        if (data) setAssignMap(prev => ({ ...prev, [key]: data as Assignment }))
        broadcastMicChange(devName, cueName, true)
      }
    }
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-400" />
              Mic Patch
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Laden…
              </div>
            ) : (
              <div className="space-y-6">

                {/* Device beheer */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Apparaten</h3>
                    <Button size="sm" onClick={openAddDevice} className="gap-1.5 h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold">
                      <Plus className="h-3.5 w-3.5" /> Apparaat toevoegen
                    </Button>
                  </div>

                  {devices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-xl">
                      <Mic className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nog geen apparaten. Voeg een microfoon of IEM toe.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {devices.map(dev => {
                        const Icon = deviceTypeIcon(dev.type)
                        return (
                          <div
                            key={dev.id}
                            className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 bg-muted/20"
                            style={{ borderLeftColor: dev.color, borderLeftWidth: 3 }}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: dev.color }} />
                            <span className="text-sm font-medium">{dev.name}</span>
                            {dev.channel && (
                              <span className="text-xs font-mono text-muted-foreground">ch.{dev.channel}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground/50">{deviceTypeLabel(dev.type)}</span>
                            <div className="flex gap-1 ml-1">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditDevice(dev)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => deleteDevice(dev.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Cue × Device matrix */}
                {devices.length > 0 && cues.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Toewijzing per cue</h3>
                      <span className="text-xs text-muted-foreground/50">Klik op een cel om een mic aan of uit te zetten</span>
                    </div>

                    {/* Horizontaal scrollbaar, maar de eerste kolom blijft sticky */}
                    <div className="overflow-x-auto rounded-lg border border-border/30">
                      <table className="text-xs border-collapse" style={{ minWidth: 'max-content', width: '100%' }}>
                        <thead>
                          <tr className="border-b border-border/30">
                            {/* Sticky header cel — apparaatnaam kolom */}
                            <th
                              className="text-left p-2 text-muted-foreground font-medium w-44 min-w-[11rem] bg-background"
                              style={{ position: 'sticky', left: 0, zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.15)' }}
                            >
                              Apparaat
                            </th>
                            {cues.map(cue => (
                              <th key={cue.id} className="p-2 min-w-[4.5rem] max-w-[5.5rem] bg-background">
                                <div className={cn(
                                  'text-center leading-tight',
                                  cue.status === 'running' ? 'text-emerald-400' :
                                  cue.status === 'done'    ? 'text-muted-foreground/25' :
                                  'text-muted-foreground/60'
                                )}>
                                  <div className="font-mono text-[10px] opacity-60">#{cue.position + 1}</div>
                                  <div className="font-semibold truncate text-[11px] max-w-[4.5rem] mx-auto">{cue.title}</div>
                                  {cue.status === 'running' && (
                                    <div className="text-[9px] text-emerald-400/70 mt-0.5">● live</div>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {devices.map(dev => (
                            <tr key={dev.id} className="border-t border-border/20">
                              {/* Sticky device-naam cel */}
                              <td
                                className="p-2 bg-background"
                                style={{ position: 'sticky', left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.15)' }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dev.color }} />
                                  <span className="font-medium truncate max-w-[8rem]">{dev.name}</span>
                                  {dev.channel && (
                                    <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0">ch.{dev.channel}</span>
                                  )}
                                </div>
                              </td>
                              {cues.map(cue => {
                                const key = `${cue.id}-${dev.id}`
                                const isOn = !!assignMap[key]
                                return (
                                  <td key={cue.id} className="p-1 text-center">
                                    <button
                                      onClick={() => toggleAssignment(cue.id, dev.id)}
                                      title={isOn ? `Uit: ${dev.name} bij "${cue.title}"` : `Aan: ${dev.name} bij "${cue.title}"`}
                                      className={cn(
                                        'h-7 w-full rounded-lg border transition-all duration-150 text-[11px] font-bold',
                                        isOn
                                          ? 'border-transparent text-white shadow-sm'
                                          : 'bg-transparent border-border/20 hover:border-border/50 text-muted-foreground/30 hover:text-muted-foreground/50'
                                      )}
                                      style={isOn ? {
                                        backgroundColor: dev.color + '30',
                                        borderColor: dev.color + '70',
                                        color: dev.color,
                                        boxShadow: `0 0 6px ${dev.color}30`,
                                      } : {}}
                                    >
                                      {isOn ? '●' : '○'}
                                    </button>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/edit device dialog */}
      <Dialog open={addDeviceOpen} onOpenChange={setAddDeviceOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editDevice ? 'Apparaat bewerken' : 'Apparaat toevoegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Naam *</Label>
              <Input value={dName} onChange={e => setDName(e.target.value)} placeholder="MIC-1, Sofie headset…" autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {DEVICE_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDType(value)}
                    className={cn(
                      'flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-all',
                      dType === value ? 'border-blue-500/60 bg-blue-500/10 text-blue-300' : 'border-border/40 text-muted-foreground hover:border-border/70'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kanaal</Label>
                <Input value={dChannel} onChange={e => setDChannel(e.target.value)} type="number" placeholder="1" />
              </div>
              <div className="space-y-1">
                <Label>Kleur</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COLORS.map(c => (
                    <button
                      key={c} type="button" onClick={() => setDColor(c)}
                      className={`h-5 w-5 rounded-full transition-all ${dColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110' : 'opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notities</Label>
              <Input value={dNotes} onChange={e => setDNotes(e.target.value)} placeholder="Bijv. frequentie, reserve voor…" />
            </div>
          </div>
          {saveError && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 -mb-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {saveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDeviceOpen(false)}>Annuleren</Button>
            <Button onClick={saveDevice} disabled={saving || !dName.trim()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editDevice ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
