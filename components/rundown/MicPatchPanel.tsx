'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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

const PHASES: { value: string; label: string }[] = [
  { value: 'before', label: 'Vóór' },
  { value: 'during', label: 'Tijdens' },
  { value: 'after',  label: 'Na' },
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

  const [devices, setDevices]           = useState<AudioDevice[]>([])
  const [assignments, setAssignments]   = useState<Assignment[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [addDeviceOpen, setAddDeviceOpen] = useState(false)
  const [editDevice, setEditDevice]     = useState<AudioDevice | null>(null)

  // Device form state
  const [dName, setDName]     = useState('')
  const [dType, setDType]     = useState<AudioDeviceType>('handheld')
  const [dChannel, setDChannel] = useState('')
  const [dColor, setDColor]   = useState(COLORS[0])
  const [dNotes, setDNotes]   = useState('')

  // Assignment state: { [cueId-deviceId-phase]: assignment }
  const [assignMap, setAssignMap] = useState<Record<string, Assignment>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: devs } = await (supabase as any).from('audio_devices').select('*').eq('show_id', showId).order('name')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: asgns } = await (supabase as any).from('cue_audio_assignments').select('*').in('cue_id', cues.map(c => c.id))
    setDevices(devs ?? [])
    setAssignments(asgns ?? [])
    const map: Record<string, Assignment> = {}
    ;(asgns ?? []).forEach((a: Assignment) => {
      map[`${a.cue_id}-${a.device_id}-${a.phase}`] = a
    })
    setAssignMap(map)
    setLoading(false)
  }, [showId, cues, supabase])

  useEffect(() => { if (open) load() }, [open, load])

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
      if (error) {
        setSaveError(error.message ?? 'Opslaan mislukt')
        return
      }
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

  async function toggleAssignment(cueId: string, deviceId: string, phase: string) {
    const key = `${cueId}-${deviceId}-${phase}`
    const existing = assignMap[key]
    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('cue_audio_assignments').delete().eq('id', existing.id)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('cue_audio_assignments').insert({ cue_id: cueId, device_id: deviceId, phase })
    }
    await load()
  }

  // Conflict detectie: zelfde device, zelfde fase, overlappende cues (vereenvoudigd: consecutive running cues)
  function hasConflict(deviceId: string, phase: string): string[] {
    // Vind alle cues die dit device gebruiken in deze fase
    const usedInCues = assignments.filter(a => a.device_id === deviceId && a.phase === phase).map(a => a.cue_id)
    // Voor nu: geen echte overlap detectie, maar als device in >1 gelijktijdige cues — simpele check
    return usedInCues
  }

  if (!open) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
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
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Toewijzing per cue</h3>
                  <p className="text-xs text-muted-foreground/60 mb-3">
                    Klik op een cel om een apparaat toe te wijzen aan een cue.
                    <span className="ml-2 inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-blue-500/30 border border-blue-500/50 inline-block" /> Vóór</span>
                    <span className="ml-2 inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block" /> Tijdens</span>
                    <span className="ml-2 inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-orange-500/30 border border-orange-500/50 inline-block" /> Na</span>
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 text-muted-foreground font-medium w-40 min-w-[10rem]">Apparaat</th>
                          {cues.map(cue => (
                            <th key={cue.id} className="p-2 min-w-[5rem] max-w-[6rem]">
                              <div className={cn(
                                'text-center leading-tight',
                                cue.status === 'running' ? 'text-emerald-400' :
                                cue.status === 'done'    ? 'text-muted-foreground/30' :
                                'text-muted-foreground/70'
                              )}>
                                <div className="font-mono text-[10px] opacity-60">#{cue.position + 1}</div>
                                <div className="font-semibold truncate text-[11px] max-w-[5rem] mx-auto">{cue.title}</div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {devices.map(dev => (
                          <tr key={dev.id} className="border-t border-border/20">
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dev.color }} />
                                <span className="font-medium truncate max-w-[8rem]">{dev.name}</span>
                              </div>
                            </td>
                            {cues.map(cue => (
                              <td key={cue.id} className="p-1">
                                <div className="flex flex-col gap-0.5">
                                  {PHASES.map(ph => {
                                    const key = `${cue.id}-${dev.id}-${ph.value}`
                                    const assigned = !!assignMap[key]
                                    return (
                                      <button
                                        key={ph.value}
                                        onClick={() => toggleAssignment(cue.id, dev.id, ph.value)}
                                        title={`${ph.label}: ${dev.name} bij "${cue.title}"`}
                                        className={cn(
                                          'h-4 w-full rounded text-[9px] font-bold transition-all border',
                                          assigned
                                            ? ph.value === 'before'  ? 'bg-blue-500/30 border-blue-500/60 text-blue-300'
                                            : ph.value === 'during'  ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-300'
                                            :                          'bg-orange-500/30 border-orange-500/60 text-orange-300'
                                            : 'bg-transparent border-border/20 text-transparent hover:border-border/50'
                                        )}
                                      >
                                        {assigned ? ph.label[0] : ''}
                                      </button>
                                    )
                                  })}
                                </div>
                              </td>
                            ))}
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
