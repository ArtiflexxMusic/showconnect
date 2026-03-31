'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDuration } from '@/lib/utils'
import type { Cue, CueType, CreateCueInput } from '@/lib/types/database'
import { Copy, Loader2, Check, ChevronDown } from 'lucide-react'

interface SourceRundown {
  id: string
  name: string
}

interface CopyCuesModalProps {
  currentRundownId: string
  allRundowns: SourceRundown[]
  onCopy: (cues: CreateCueInput[]) => Promise<void>
  onClose: () => void
}

const TYPE_EMOJI: Record<CueType, string> = {
  video:        '📹',
  audio:        '🎵',
  lighting:     '💡',
  speech:       '🎤',
  break:        '☕',
  intro:        '🎬',
  outro:        '🏁',
  presentation: '📊',
  custom:       '⚙️',
}

export function CopyCuesModal({ currentRundownId, allRundowns, onCopy, onClose }: CopyCuesModalProps) {
  const supabase = createClient()
  const otherRundowns = allRundowns.filter((r) => r.id !== currentRundownId)

  const [selectedRundownId, setSelectedRundownId] = useState<string>(otherRundowns[0]?.id ?? '')
  const [sourceCues, setSourceCues] = useState<Cue[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copying, setCopying] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Laad cues van geselecteerde rundown
  useEffect(() => {
    if (!selectedRundownId) return
    setLoading(true)
    setSelectedIds(new Set())
    supabase
      .from('cues')
      .select('*')
      .eq('rundown_id', selectedRundownId)
      .order('position', { ascending: true })
      .then(({ data }) => {
        setSourceCues((data ?? []) as Cue[])
        setLoading(false)
      })
  }, [selectedRundownId, supabase])

  function toggleAll() {
    if (selectedIds.size === sourceCues.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sourceCues.map((c) => c.id)))
    }
  }

  function toggleCue(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy() {
    const toCopy = sourceCues.filter((c) => selectedIds.has(c.id))
    if (toCopy.length === 0) return
    setCopying(true)
    const inputs: CreateCueInput[] = toCopy.map((c) => ({
      title: c.title,
      type: c.type,
      duration_seconds: c.duration_seconds,
      notes: c.notes,
      tech_notes: c.tech_notes,
      presenter: c.presenter,
      location: c.location,
      color: c.color,
      auto_advance: c.auto_advance,
    }))
    await onCopy(inputs)
    setCopying(false)
    onClose()
  }

  if (otherRundowns.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <Copy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Geen andere rundowns</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Er zijn geen andere rundowns in deze show om cues van te kopiëren.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    )
  }

  const selectedRundown = otherRundowns.find((r) => r.id === selectedRundownId)
  const allSelected = sourceCues.length > 0 && selectedIds.size === sourceCues.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <Copy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Cues kopiëren</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Kies een rundown en selecteer welke cues je wilt kopiëren naar deze rundown.
          </p>
        </div>

        {/* Rundown selector */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
            Kopieer van rundown
          </label>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium">{selectedRundown?.name ?? '—'}</span>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showDropdown && 'rotate-180')} />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                {otherRundowns.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setSelectedRundownId(r.id); setShowDropdown(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors',
                      r.id === selectedRundownId && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    {r.id === selectedRundownId && <Check className="h-3.5 w-3.5 shrink-0" />}
                    <span className={r.id !== selectedRundownId ? 'ml-5' : ''}>{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cue lijst */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Cues laden…</span>
            </div>
          ) : sourceCues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">Deze rundown heeft geen cues.</p>
            </div>
          ) : (
            <>
              {/* Selecteer alles header */}
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-2.5 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded accent-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    Alles selecteren ({sourceCues.length} cues)
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-primary font-medium">
                    {selectedIds.size} geselecteerd
                  </span>
                )}
              </div>

              {/* Cue rijen */}
              {sourceCues.map((cue) => (
                <label
                  key={cue.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0',
                    selectedIds.has(cue.id) && 'bg-primary/5'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(cue.id)}
                    onChange={() => toggleCue(cue.id)}
                    className="rounded accent-primary shrink-0"
                  />
                  <span className="text-base shrink-0">{TYPE_EMOJI[cue.type] ?? '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cue.title}</p>
                    {cue.presenter && (
                      <p className="text-xs text-muted-foreground truncate">🎤 {cue.presenter}</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                    {formatDuration(cue.duration_seconds)}
                  </span>
                  {cue.color && (
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cue.color }}
                    />
                  )}
                </label>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={copying}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleCopy}
            disabled={selectedIds.size === 0 || copying}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copying ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Kopiëren…</>
            ) : (
              <><Copy className="h-4 w-4" /> {selectedIds.size > 0 ? `${selectedIds.size} cue${selectedIds.size !== 1 ? 's' : ''} kopiëren` : 'Kopiëren'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
