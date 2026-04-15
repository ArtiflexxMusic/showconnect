'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, BookTemplate, Mic } from 'lucide-react'
import type {
  Cue, TemplateCue, TemplateAudioPayload, TemplateAudioDevice, TemplateAudioAssignment,
} from '@/lib/types/database'

interface SaveTemplateModalProps {
  open: boolean
  onClose: () => void
  rundownName: string
  cues: Cue[]
  showId: string
}

export function SaveTemplateModal({ open, onClose, rundownName, cues, showId }: SaveTemplateModalProps) {
  const [name, setName]               = useState(rundownName)
  const [description, setDescription] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [includeAudio, setIncludeAudio] = useState(true)

  // Hoeveel mic patch data beschikbaar is — puur voor UI feedback
  const [audioPreview, setAudioPreview] = useState<{ devices: number; assignments: number } | null>(null)

  const supabase = createClient()
  const cueIds = useMemo(() => cues.map(c => c.id), [cues])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const [{ data: devs }, { data: asns }] = await Promise.all([
        sb.from('audio_devices').select('id').eq('show_id', showId),
        cueIds.length
          ? sb.from('cue_audio_assignments').select('id').in('cue_id', cueIds)
          : Promise.resolve({ data: [] as Array<{ id: string }> }),
      ])
      if (cancelled) return
      setAudioPreview({ devices: devs?.length ?? 0, assignments: asns?.length ?? 0 })
    })()
    return () => { cancelled = true }
  }, [open, showId, cueIds, supabase])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    const cuesJson: TemplateCue[] = cues.map((c) => ({
      title:            c.title,
      type:             c.type,
      duration_seconds: c.duration_seconds,
      notes:            c.notes,
      tech_notes:       c.tech_notes,
      presenter:        c.presenter,
      location:         c.location,
    }))

    // Mic patch snapshot bouwen als gebruiker dat wil en er data is
    let audioJson: TemplateAudioPayload | null = null
    if (includeAudio && (audioPreview?.assignments ?? 0) > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: devices, error: devErr }: { data: Array<{ id: string; name: string; type: string; channel: number | null; color: string; notes: string | null }> | null; error: unknown } = await sb
        .from('audio_devices')
        .select('id, name, type, channel, color, notes')
        .eq('show_id', showId)

      const { data: assignments, error: asnErr }: { data: Array<{ cue_id: string; device_id: string; person_name: string | null; phase: string }> | null; error: unknown } = cueIds.length
        ? await sb
            .from('cue_audio_assignments')
            .select('cue_id, device_id, person_name, phase')
            .in('cue_id', cueIds)
        : { data: [], error: null }

      if (devErr || asnErr) {
        setSaving(false)
        setError('Mic patch ophalen mislukt. Probeer opnieuw of sla op zonder mic patch.')
        return
      }

      // Alleen devices meenemen die ergens toegewezen zijn — zo blijft de
      // template compact en bevat hij geen ongebruikte apparaten.
      const usedDeviceIds = new Set((assignments ?? []).map(a => a.device_id))
      const usedDevices = (devices ?? []).filter(d => usedDeviceIds.has(d.id))

      const deviceIndexById = new Map<string, number>()
      const templateDevices: TemplateAudioDevice[] = usedDevices.map((d, i) => {
        deviceIndexById.set(d.id, i)
        return {
          name:    d.name,
          type:    d.type as TemplateAudioDevice['type'],
          channel: d.channel,
          color:   d.color,
          notes:   d.notes,
        }
      })

      const cueIndexById = new Map<string, number>()
      cues.forEach((c, i) => cueIndexById.set(c.id, i))

      const templateAssignments: TemplateAudioAssignment[] = []
      for (const a of assignments ?? []) {
        const ci = cueIndexById.get(a.cue_id)
        const di = deviceIndexById.get(a.device_id)
        if (ci === undefined || di === undefined) continue
        templateAssignments.push({
          cue_index:    ci,
          device_index: di,
          person_name:  a.person_name,
          phase:        a.phase as TemplateAudioAssignment['phase'],
        })
      }

      audioJson = { devices: templateDevices, assignments: templateAssignments }
    }

    const { error: dbError } = await supabase
      .from('rundown_templates')
      .insert({
        name:        name.trim(),
        description: description.trim() || null,
        cues_json:   cuesJson,
        audio_json:  audioJson,
        is_public:   false,
      })

    setSaving(false)

    if (dbError) {
      setError('Opslaan mislukt. Probeer opnieuw.')
    } else {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1200)
    }
  }

  const handleClose = () => {
    setName(rundownName)
    setDescription('')
    setError('')
    setSaved(false)
    onClose()
  }

  const hasAudio = (audioPreview?.assignments ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Opslaan als template
          </DialogTitle>
          <DialogDescription>
            Sla de huidige {cues.length} cues op als herbruikbare template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Naam</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Bedrijfsevent standaard"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-desc">Beschrijving <span className="text-muted-foreground">(optioneel)</span></Label>
            <Input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="bijv. Voor events van 2 uur met pauze"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="rounded-lg bg-muted/40 border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{cues.length} cues</span> worden opgeslagen in de template.
              De template is alleen voor jou zichtbaar.
            </p>
          </div>

          {hasAudio && (
            <label className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-emerald-500/50 accent-emerald-500"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
              />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Mic className="h-3.5 w-3.5 text-emerald-500" />
                  Mic patch meenemen
                </div>
                <p className="text-xs text-muted-foreground">
                  {audioPreview?.devices ?? 0} devices en {audioPreview?.assignments ?? 0} toewijzingen
                  worden in de template bewaard. Bij toepassen worden ze automatisch opnieuw aangemaakt.
                </p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || cues.length === 0}>
            {saving  ? <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan…</> :
             saved   ? '✓ Opgeslagen!' :
             'Template opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
