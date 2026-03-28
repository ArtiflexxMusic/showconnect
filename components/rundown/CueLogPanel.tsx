'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Clock, History, Download } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { CueType } from '@/lib/types/database'

interface LogEntry {
  id: string
  cue_id: string
  cue_title: string
  cue_type: CueType
  cue_position: number
  triggered_at: string
  duration_seconds: number
}

interface CueLogPanelProps {
  rundownId: string
  rundownName: string
  onClose: () => void
}

const TYPE_COLORS: Partial<Record<CueType, string>> = {
  video:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  audio:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  lighting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  speech:   'bg-green-500/10 text-green-400 border-green-500/20',
  break:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  intro:    'bg-pink-500/10 text-pink-400 border-pink-500/20',
  outro:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
  custom:   'bg-muted text-muted-foreground border-border',
}

const TYPE_LABELS: Record<CueType, string> = {
  video:        'Video',
  audio:        'Audio',
  lighting:     'Licht',
  speech:       'Spreker',
  break:        'Pauze',
  intro:        'Intro',
  outro:        'Outro',
  custom:       'Overig',
  presentation: 'Presentatie',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDelta(a: string, b: string) {
  const diff = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000)
  if (diff < 0) return '–'
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return m > 0 ? `+${m}m ${s}s` : `+${s}s`
}

export function CueLogPanel({ rundownId, rundownName, onClose }: CueLogPanelProps) {
  const [log, setLog]       = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase            = createClient()

  useEffect(() => {
    supabase
      .from('cue_log')
      .select('id, cue_id, cue_title, cue_type, cue_position, triggered_at, duration_seconds')
      .eq('rundown_id', rundownId)
      .order('triggered_at', { ascending: true })
      .then(({ data }) => {
        setLog((data ?? []) as LogEntry[])
        setLoading(false)
      })

    // Realtime: nieuwe log-entries ontvangen
    const channel = supabase
      .channel(`cue_log:${rundownId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cue_log', filter: `rundown_id=eq.${rundownId}` },
        (payload) => {
          setLog((prev) => [...prev, payload.new as LogEntry])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rundownId])

  // Exporteer als CSV
  const exportCsv = () => {
    const lines = [
      ['#', 'Titel', 'Type', 'Gestart om', 'Duur', 'Vertraging'].join(';'),
      ...log.map((entry, i) => {
        const prev = i > 0 ? log[i - 1].triggered_at : entry.triggered_at
        return [
          entry.cue_position + 1,
          `"${entry.cue_title.replace(/"/g, '""')}"`,
          TYPE_LABELS[entry.cue_type],
          formatTime(entry.triggered_at),
          formatDuration(entry.duration_seconds),
          i > 0 ? formatDelta(prev, entry.triggered_at) : '–',
        ].join(';')
      }),
    ].join('\n')

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${rundownName.replace(/\s+/g, '-')}-cuelog.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalReal = log.length >= 2
    ? Math.round((new Date(log[log.length - 1].triggered_at).getTime() - new Date(log[0].triggered_at).getTime()) / 1000)
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Cue log
            </h2>
            <p className="text-xs text-muted-foreground">{rundownName}</p>
          </div>
          <div className="flex items-center gap-2">
            {log.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5 text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Samenvatting */}
        {log.length > 0 && (
          <div className="px-6 py-3 border-b border-border/50 bg-muted/20 flex items-center gap-6 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <strong className="text-foreground">{log.length}</strong> cues gestart
            </span>
            {totalReal > 0 && (
              <span>
                Totale showduur: <strong className="text-foreground">{formatDuration(totalReal)}</strong>
              </span>
            )}
            <span>
              Start: <strong className="text-foreground">{formatTime(log[0].triggered_at)}</strong>
            </span>
          </div>
        )}

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : log.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="font-medium text-muted-foreground text-sm">Nog geen cues gestart</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                De log wordt automatisch bijgehouden zodra de show loopt.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="text-xs text-muted-foreground border-b border-border/50">
                  <th className="text-left px-6 py-2 font-medium w-8">#</th>
                  <th className="text-left px-3 py-2 font-medium">Cue</th>
                  <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Tijd</th>
                  <th className="text-right px-6 py-2 font-medium hidden sm:table-cell">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {log.map((entry, i) => {
                  const prev = i > 0 ? log[i - 1].triggered_at : entry.triggered_at
                  const color = TYPE_COLORS[entry.cue_type] ?? 'bg-muted text-muted-foreground border-border'
                  return (
                    <tr key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-2.5 text-muted-foreground text-xs">{entry.cue_position + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium truncate max-w-[200px]">{entry.cue_title}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(entry.duration_seconds)}</p>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', color)}>
                          {TYPE_LABELS[entry.cue_type]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                        {formatTime(entry.triggered_at)}
                      </td>
                      <td className="px-6 py-2.5 text-right text-xs text-muted-foreground hidden sm:table-cell tabular-nums">
                        {i > 0 ? formatDelta(prev, entry.triggered_at) : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
