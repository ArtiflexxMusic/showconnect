'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, BookTemplate, Trash2, Clock, AlertTriangle, Sparkles, Mic } from 'lucide-react'
import type { RundownTemplate, TemplateCue, TemplateAudioPayload } from '@/lib/types/database'
import { formatDuration } from '@/lib/utils'

// ─── Ingebouwde startertemplates ──────────────────────────────────────────────

const STARTER_TEMPLATES: Array<{ id: string; name: string; description: string; cues: TemplateCue[] }> = [
  {
    id: 'starter-bedrijfsevent',
    name: 'Bedrijfsevent (2 uur)',
    description: 'Standaard opzet voor een zakelijk evenement met pauze',
    cues: [
      { title: 'Ontvangst & registratie',    type: 'custom',       duration_seconds: 1800, notes: 'Gasten welkom heten, badge uitreiken', tech_notes: null, presenter: null, location: 'Entree' },
      { title: 'Opening door dagvoorzitter',  type: 'speech',        duration_seconds:  300, notes: null, tech_notes: 'Microfoon klaar, dia op welkomstscherm', presenter: 'Dagvoorzitter', location: 'Podium' },
      { title: 'Keynote presentatie',         type: 'presentation',  duration_seconds: 1800, notes: null, tech_notes: 'HDMI verbinding controleren', presenter: null, location: 'Podium' },
      { title: 'Q&A sessie',                  type: 'custom',       duration_seconds:  600, notes: 'Looprouter microfoon gereed', tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Pauze',                       type: 'break',         duration_seconds:  900, notes: 'Koffie & thee in foyer', tech_notes: 'Muziek aan tijdens pauze', presenter: null, location: 'Foyer' },
      { title: 'Workshop / breakout sessies', type: 'custom',       duration_seconds: 2700, notes: null, tech_notes: null, presenter: null, location: 'Diverse zalen' },
      { title: 'Plenaire terugkoppeling',     type: 'speech',        duration_seconds:  600, notes: null, tech_notes: null, presenter: 'Groepsleiders', location: 'Hoofdzaal' },
      { title: 'Afsluiting & borrel',         type: 'custom',       duration_seconds: 1800, notes: 'Uitlooptijd inbegrepen', tech_notes: 'Muziek aan na afsluiting', presenter: null, location: 'Foyer' },
    ],
  },
  {
    id: 'starter-theatershow',
    name: 'Theatershow / concert',
    description: 'Klassieke show-opzet met voorprogramma en pauze',
    cues: [
      { title: 'Zaalopen',            type: 'custom',      duration_seconds: 1800, notes: 'Publieks binnenkomst', tech_notes: 'Zaalverlichting 50%, sfeermuizk aan', presenter: null, location: 'Zaal' },
      { title: 'Belsein 1',           type: 'custom',      duration_seconds:  300, notes: '15 minuten voor aanvang', tech_notes: null, presenter: null, location: null },
      { title: 'Belsein 2',           type: 'custom',      duration_seconds:  300, notes: '5 minuten voor aanvang', tech_notes: null, presenter: null, location: null },
      { title: 'Zaal dicht & intro',  type: 'custom',      duration_seconds:  120, notes: 'Deuren sluiten, huisregels', tech_notes: 'Verlichting naar zwart, muziek uit', presenter: null, location: null },
      { title: 'Eerste helft',        type: 'speech',  duration_seconds: 3600, notes: null, tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Pauze',               type: 'break',        duration_seconds: 1200, notes: 'Bar open', tech_notes: 'Zaallicht aan, muziek', presenter: null, location: 'Foyer' },
      { title: 'Tweede helft',        type: 'speech',  duration_seconds: 3000, notes: null, tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Applaus & curtain',   type: 'custom',      duration_seconds:  300, notes: null, tech_notes: 'Verlichting fade up na slotakkoord', presenter: null, location: 'Podium' },
      { title: 'Publiek verlaat zaal',type: 'custom',      duration_seconds:  600, notes: null, tech_notes: 'Uitleidmuziek aan', presenter: null, location: 'Zaal' },
    ],
  },
  {
    id: 'starter-dagcongres',
    name: 'Dagcongres',
    description: 'Volledig dagprogramma met meerdere sprekers',
    cues: [
      { title: 'Registratie & ontvangst',     type: 'custom',      duration_seconds: 2700, notes: 'Koffie & croissants', tech_notes: 'Dia met programma op scherm', presenter: null, location: 'Entree' },
      { title: 'Welkom & opening',             type: 'speech',       duration_seconds:  600, notes: null, tech_notes: null, presenter: 'Organisator', location: 'Podium' },
      { title: 'Keynote spreker 1',            type: 'presentation', duration_seconds: 2700, notes: null, tech_notes: 'Presentatie vooraf ontvangen en getest', presenter: null, location: 'Podium' },
      { title: 'Q&A spreker 1',                type: 'custom',      duration_seconds:  600, notes: null, tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Spreker 2',                    type: 'presentation', duration_seconds: 1800, notes: null, tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Koffiepauze',                  type: 'break',        duration_seconds:  900, notes: null, tech_notes: 'Muziek tijdens pauze', presenter: null, location: 'Foyer' },
      { title: 'Paneldiscussie',               type: 'custom',      duration_seconds: 2700, notes: '4–5 panelleden', tech_notes: 'Stoelen en microfoons klaar op podium', presenter: null, location: 'Podium' },
      { title: 'Lunch',                        type: 'break',        duration_seconds: 3600, notes: null, tech_notes: null, presenter: null, location: 'Restaurantruimte' },
      { title: 'Middagsessie sprekers',        type: 'presentation', duration_seconds: 5400, notes: '3 × 30 min', tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Interactieve sessie / poll',   type: 'custom',      duration_seconds:  900, notes: 'Slido / Mentimeter klaar', tech_notes: null, presenter: null, location: 'Podium' },
      { title: 'Afsluiting & netwerk borrel',  type: 'custom',      duration_seconds: 3600, notes: null, tech_notes: 'Muziek aan na afsluiting', presenter: null, location: 'Foyer' },
    ],
  },
  {
    id: 'starter-livestream',
    name: 'Live-uitzending / webinar',
    description: 'Online uitzending of hybride event met live regie',
    cues: [
      { title: 'Pre-show loop',          type: 'custom',      duration_seconds: 1800, notes: 'Afteltimer + muziek op stream', tech_notes: 'OBS/vMix: loop scene actief', presenter: null, location: null },
      { title: 'Countdown to live',      type: 'custom',      duration_seconds:  300, notes: '5 min aftellen', tech_notes: 'Stream-alert activeren', presenter: null, location: null },
      { title: 'Live opening',           type: 'speech',       duration_seconds:  180, notes: null, tech_notes: 'Schakel naar camera 1, presentator in beeld', presenter: 'Host', location: 'Studio' },
      { title: 'Segment 1 – presentatie',type: 'presentation', duration_seconds: 1500, notes: null, tech_notes: 'Screenshare klaar', presenter: null, location: null },
      { title: 'Live Q&A via chat',      type: 'custom',      duration_seconds:  900, notes: 'Moderator leest vragen voor', tech_notes: null, presenter: 'Host + gast', location: null },
      { title: 'Segment 2 – demo',       type: 'custom',      duration_seconds: 1200, notes: null, tech_notes: 'Demo laptop gereed, screen capture actief', presenter: null, location: null },
      { title: 'Gast interview',         type: 'speech',       duration_seconds: 1200, notes: null, tech_notes: 'Schakel naar split-screen', presenter: 'Host + gast', location: null },
      { title: 'Afsluiting & CTA',       type: 'speech',       duration_seconds:  300, notes: 'Link naar registratie/opname delen', tech_notes: 'Outro-overlay actief', presenter: 'Host', location: null },
      { title: 'Post-show / uitloop',    type: 'custom',      duration_seconds:  300, notes: null, tech_notes: 'Stream stoppen na aftelling', presenter: null, location: null },
    ],
  },
]

// ─── Unified template selection type ──────────────────────────────────────────

type AnyTemplate =
  | { kind: 'saved';   id: string; name: string; description?: string | null; cues_json: TemplateCue[]; audio_json: TemplateAudioPayload | null }
  | { kind: 'starter'; id: string; name: string; description: string;          cues: TemplateCue[] }

interface LoadTemplateModalProps {
  open: boolean
  onClose: () => void
  onApply: (cues: TemplateCue[], audio: TemplateAudioPayload | null) => Promise<void>
  hasCues: boolean
}

export function LoadTemplateModal({ open, onClose, onApply, hasCues }: LoadTemplateModalProps) {
  const [templates, setTemplates]       = useState<RundownTemplate[]>([])
  const [loading, setLoading]           = useState(false)
  const [selected, setSelected]         = useState<AnyTemplate | null>(null)
  const [applying, setApplying]         = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [tab, setTab]                   = useState<'mine' | 'starter'>('mine')

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
        const saved = (data ?? []) as RundownTemplate[]
        setTemplates(saved)
        // Switch to starter tab automatically when user has no saved templates
        if (saved.length === 0) setTab('starter')
        setLoading(false)
      })
  }, [open])

  const totalDuration = (cues: TemplateCue[]) =>
    cues.reduce((s, c) => s + c.duration_seconds, 0)

  const getSelectedCues = (): TemplateCue[] => {
    if (!selected) return []
    return selected.kind === 'saved' ? selected.cues_json : selected.cues
  }

  const getSelectedAudio = (): TemplateAudioPayload | null => {
    if (!selected || selected.kind !== 'saved') return null
    return selected.audio_json
  }

  const handleApply = async () => {
    if (!selected) return
    if (hasCues && !confirmOverwrite) {
      setConfirmOverwrite(true)
      return
    }
    setApplying(true)
    await onApply(getSelectedCues(), getSelectedAudio())
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

  const renderTemplateRow = (
    id: string,
    name: string,
    description: string | null | undefined,
    cues: TemplateCue[],
    isStarter: boolean,
    audio: TemplateAudioPayload | null = null,
  ) => {
    const dur = totalDuration(cues)
    const isSelected = selected?.id === id
    const micCount = audio?.devices.length ?? 0
    return (
      <button
        key={id}
        onClick={() => {
          setSelected(isStarter
            ? { kind: 'starter', id, name, description: description ?? '', cues }
            : { kind: 'saved',   id, name, description, cues_json: cues, audio_json: audio }
          )
          setConfirmOverwrite(false)
        }}
        className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-border/80 hover:bg-muted/30'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isStarter && <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />}
              <p className="font-medium text-sm truncate">{name}</p>
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {cues.length} cues
              </Badge>
              {dur > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDuration(dur)}
                </span>
              )}
              {micCount > 0 && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1" title={`${micCount} devices in mic patch`}>
                  <Mic className="h-2.5 w-2.5" />
                  Mic patch · {micCount}
                </span>
              )}
            </div>
          </div>
          {!isStarter && (
            <button
              onClick={(e) => handleDelete(id, e)}
              disabled={deletingId === id}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
              title="Template verwijderen"
            >
              {deletingId === id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
            </button>
          )}
        </div>
      </button>
    )
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

        {/* Tab toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
          <button
            onClick={() => { setTab('mine'); setSelected(null); setConfirmOverwrite(false) }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'mine'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mijn templates
            {templates.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {templates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('starter'); setSelected(null); setConfirmOverwrite(false) }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === 'starter'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            Startertemplates
          </button>
        </div>

        <div className="min-h-[200px] max-h-[360px] overflow-y-auto -mx-1 px-1">
          {tab === 'mine' ? (
            loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookTemplate className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-medium text-muted-foreground text-sm">Nog geen opgeslagen templates</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Sla een rundown op als template via de toolbar, of gebruik een startertemplate.
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                {templates.map((tpl) =>
                  renderTemplateRow(tpl.id, tpl.name, tpl.description, tpl.cues_json, false, tpl.audio_json)
                )}
              </div>
            )
          ) : (
            <div className="space-y-2 py-1">
              <p className="text-[11px] text-muted-foreground px-1 pt-1 pb-0.5">
                Kant-en-klare programmastructuren — pas ze daarna naar wens aan.
              </p>
              {STARTER_TEMPLATES.map((tpl) =>
                renderTemplateRow(tpl.id, tpl.name, tpl.description, tpl.cues, true)
              )}
            </div>
          )}
        </div>

        {/* Overschrijf-waarschuwing */}
        {confirmOverwrite && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              De huidige cues worden vervangen door de {getSelectedCues().length} cues uit de template.
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
