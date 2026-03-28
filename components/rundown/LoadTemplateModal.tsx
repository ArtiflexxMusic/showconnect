'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookTemplate, Trash2, Clock, AlertTriangle } from 'lucide-react'
import type { RundownTemplate, TemplateCue } from '@/lib/types/database'
import { formatDuration } from '@/lib/utils'

interface LoadTemplateModalProps {
  open: boolean
  onClose: () => void
  onApply: (cues: TemplateCue[]) => Promise<void>
  hasCues: boolean
}

export function LoadTemplateModal({ open, onClose, onApply, hasCues }: LoadTemplateModalProps) {
  const [templates, setTemplates]       = useState<RundownTemplate[]>([])
  const [loading, setLoading]           = useState(false)
  const [selected, setSelected]         = useState<RundownTemplate | null>(null)
  const [applying, setApplying]         = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(null)
    setConfirmOverwrite(false)

    supabase
      .from('rundown_templates')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setTemplates((data ?? []) as RundownTemplate[])
        setLoading(false)
      })
  }, [open])

  const totalDuration = (cues: TemplateCue[]) =>
    cues.reduce((s, c) => s + c.duration_seconds, 0)

  const handleApply = async () => {
    if (!selected) return
    if (hasCues && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    setApplying(true)
    await onApply(selected.cues_json)
    setApplying(false)
    onClose()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    await supabase.from('rundown_templates').delete().eq('id', id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
    if (selected?.id === id) setSelected(null)
    setDeletingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Template laden
          </DialogTitle>
          <DialogDescription>
            Kies een template om toe te passen op deze rundown.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px] max-h-[380px] overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookTemplate className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground text-sm">Geen templates gevonden</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Sla eerst een rundown op als template via de toolbar.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-1">
              {templates.map((tpl) => {
                const dur = totalDuration(tpl.cues_json)
                const isSelected = selected?.id === tpl.id
                return (
                  <button
                    key={tpl.id}
                    onClick={() => { setSelected(tpl); setConfirmOverwrite(false) }}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{tpl.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {tpl.cues_json.length} cues
                          </Badge>
                          {dur > 0 && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDuration(dur)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(tpl.id, e)}
                        disabled={deletingId === tpl.id}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                        title="Template verwijderen"
                      >
                        {deletingId === tpl.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </button>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Overschrijf-waarschuwing */}
        {confirmOverwrite && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              De huidige cues worden vervangen door de {selected?.cues_json.length} cues uit de template.
              Weet je het zeker?
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Annuleren
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selected || applying}
          >
            {applying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Laden…</>
            ) : confirmOverwrite ? (
              'Ja, overschrijven'
            ) : (
              'Template toepassen'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
