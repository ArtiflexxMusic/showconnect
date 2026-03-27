'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { parseDuration, formatDuration } from '@/lib/utils'
import type { CreateCueInput, Cue, CueType } from '@/lib/types/database'

const CUE_TYPES: { value: CueType; label: string; emoji: string }[] = [
  { value: 'intro',    label: 'Intro',    emoji: '🎬' },
  { value: 'video',    label: 'Video',    emoji: '📹' },
  { value: 'audio',    label: 'Audio',    emoji: '🎵' },
  { value: 'lighting', label: 'Licht',    emoji: '💡' },
  { value: 'speech',   label: 'Spreker',  emoji: '🎤' },
  { value: 'break',    label: 'Pauze',    emoji: '☕' },
  { value: 'outro',    label: 'Outro',    emoji: '🏁' },
  { value: 'custom',   label: 'Overig',   emoji: '⚙️' },
]

interface CueFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateCueInput) => void | Promise<void>
  initialValues?: Partial<Cue>
  loading?: boolean
  mode?: 'add' | 'edit'
}

export function CueFormModal({
  open, onClose, onSave, initialValues, loading = false, mode = 'add'
}: CueFormModalProps) {
  const [title, setTitle]           = useState('')
  const [type, setType]             = useState<CueType>('custom')
  const [durationStr, setDurationStr] = useState('0:00')
  const [notes, setNotes]           = useState('')
  const [techNotes, setTechNotes]   = useState('')
  const [presenter, setPresenter]   = useState('')
  const [location, setLocation]     = useState('')
  const [showExtra, setShowExtra]   = useState(false)

  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title ?? '')
      setType(initialValues.type ?? 'custom')
      setDurationStr(formatDuration(initialValues.duration_seconds ?? 0))
      setNotes(initialValues.notes ?? '')
      setTechNotes(initialValues.tech_notes ?? '')
      setPresenter(initialValues.presenter ?? '')
      setLocation(initialValues.location ?? '')
      // Toon extra sectie als er al gegevens zijn
      setShowExtra(
        !!(initialValues.tech_notes || initialValues.presenter || initialValues.location)
      )
    } else {
      setTitle('')
      setType('custom')
      setDurationStr('0:00')
      setNotes('')
      setTechNotes('')
      setPresenter('')
      setLocation('')
      setShowExtra(false)
    }
  }, [initialValues, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title:            title.trim(),
      type,
      duration_seconds: parseDuration(durationStr),
      notes:            notes.trim() || undefined,
      tech_notes:       techNotes.trim() || undefined,
      presenter:        presenter.trim() || undefined,
      location:         location.trim() || undefined,
    })
  }

  function handleDurationBlur() {
    setDurationStr(formatDuration(parseDuration(durationStr)))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Cue toevoegen' : 'Cue bewerken'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">

            {/* Titel */}
            <div className="space-y-2">
              <Label htmlFor="cue-title">Titel *</Label>
              <Input
                id="cue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Opening intro video"
                required
                autoFocus
              />
            </div>

            {/* Type + Duur */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CueType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="mr-1.5">{t.emoji}</span>{t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cue-duration">Duur (M:SS)</Label>
                <Input
                  id="cue-duration"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  onBlur={handleDurationBlur}
                  placeholder="5:00"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Presenter + Locatie */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cue-presenter">Spreker / Artiest</Label>
                <Input
                  id="cue-presenter"
                  value={presenter}
                  onChange={(e) => setPresenter(e.target.value)}
                  placeholder="Jan de Vries"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cue-location">Locatie / Podium</Label>
                <Input
                  id="cue-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Hoofdpodium"
                />
              </div>
            </div>

            {/* Algemene notities */}
            <div className="space-y-2">
              <Label htmlFor="cue-notes">Notities (zichtbaar voor iedereen)</Label>
              <Textarea
                id="cue-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra info voor de crew..."
                rows={2}
              />
            </div>

            {/* Technische notities (uitklapbaar) */}
            <div>
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Technische notities
              </button>

              {showExtra && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    placeholder="Interne technische details (niet zichtbaar voor sprekers)..."
                    rows={2}
                    className="text-sm border-yellow-500/30 bg-yellow-500/5"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</>
              ) : mode === 'add' ? 'Cue toevoegen' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
