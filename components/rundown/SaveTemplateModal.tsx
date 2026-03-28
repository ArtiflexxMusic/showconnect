'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, BookTemplate } from 'lucide-react'
import type { Cue } from '@/lib/types/database'
import type { TemplateCue } from '@/lib/types/database'

interface SaveTemplateModalProps {
  open: boolean
  onClose: () => void
  rundownName: string
  cues: Cue[]
}

export function SaveTemplateModal({ open, onClose, rundownName, cues }: SaveTemplateModalProps) {
  const [name, setName]               = useState(rundownName)
  const [description, setDescription] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError('')

    // Zet cues om naar template-formaat (zonder rundown-specifieke velden)
    const cuesJson: TemplateCue[] = cues.map((c) => ({
      title:            c.title,
      type:             c.type,
      duration_seconds: c.duration_seconds,
      notes:            c.notes,
      tech_notes:       c.tech_notes,
      presenter:        c.presenter,
      location:         c.location,
    }))

    const { error: dbError } = await supabase
      .from('rundown_templates')
      .insert({
        name:        name.trim(),
        description: description.trim() || null,
        cues_json:   cuesJson,
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
