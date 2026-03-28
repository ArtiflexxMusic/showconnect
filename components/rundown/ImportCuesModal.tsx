'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import type { CueType, CreateCueInput } from '@/lib/types/database'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedRow {
  [key: string]: string
}

interface MappedCue {
  title: string
  type: CueType
  duration_seconds: number
  notes: string | null
  tech_notes: string | null
  presenter: string | null
  location: string | null
  valid: boolean
  warnings: string[]
}

interface ImportCuesModalProps {
  onClose: () => void
  onImport: (cues: CreateCueInput[]) => Promise<void>
}

// ─── Cue type mapping ────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, CueType> = {
  // English
  video: 'video', vid: 'video',
  audio: 'audio', music: 'audio', geluid: 'audio', muziek: 'audio',
  lighting: 'lighting', licht: 'lighting', belichting: 'lighting', light: 'lighting',
  speech: 'speech', toespraak: 'speech', spreker: 'speech', talk: 'speech', presentatie: 'speech',
  break: 'break', pauze: 'break', pause: 'break',
  intro: 'intro', opening: 'intro',
  outro: 'outro', afsluiting: 'outro', closing: 'outro',
  custom: 'custom', overig: 'custom', other: 'custom', anders: 'custom',
}

const CUE_TYPES: CueType[] = ['video', 'audio', 'lighting', 'speech', 'break', 'intro', 'outro', 'presentation', 'custom']

// ─── Column detection ────────────────────────────────────────────────────────

type FieldKey = 'title' | 'type' | 'duration' | 'notes' | 'tech_notes' | 'presenter' | 'location'

const COLUMN_ALIASES: Record<FieldKey, string[]> = {
  title:      ['titel', 'title', 'naam', 'name', 'onderwerp', 'item', 'cue', 'omschrijving', 'description'],
  type:       ['type', 'soort', 'categorie', 'category', 'format'],
  duration:   ['duur', 'duration', 'tijd', 'time', 'lengte', 'length', 'min', 'minuten', 'minutes', 'sec', 'seconden', 'seconds', 'tijdsduur'],
  notes:      ['notities', 'notes', 'note', 'opmerkingen', 'beschrijving', 'info', 'opmerking', 'toelichting'],
  tech_notes: ['tech', 'technisch', 'tech notes', 'technische notities', 'tech_notes', 'technotities', 'techniek'],
  presenter:  ['spreker', 'presenter', 'presentator', 'speaker', 'wie', 'who', 'host'],
  location:   ['locatie', 'location', 'ruimte', 'podium', 'scene', 'scène', 'zaal', 'plek', 'venue'],
}

function detectColumn(headers: string[], field: FieldKey): string | null {
  const aliases = COLUMN_ALIASES[field]
  for (const header of headers) {
    const h = header.toLowerCase().trim()
    if (aliases.some(a => h === a || h.includes(a) || a.includes(h))) return header
  }
  return null
}

// ─── Duration parsing ────────────────────────────────────────────────────────

function parseDuration(raw: string): number {
  if (!raw?.trim()) return 0
  const s = raw.trim()

  // MM:SS or H:MM:SS
  if (/^\d+:\d{2}(:\d{2})?$/.test(s)) {
    const parts = s.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return parts[0] * 60 + parts[1]
  }

  // "5m30s", "5 min 30 sec", "5 min", "30 sec"
  const minMatch = s.match(/(\d+)\s*(?:m(?:in(?:uten?|utes?)?)?)/i)
  const secMatch = s.match(/(\d+)\s*(?:s(?:ec(?:onden?|onds?)?)?)/i)
  if (minMatch || secMatch) {
    return (minMatch ? parseInt(minMatch[1]) * 60 : 0) + (secMatch ? parseInt(secMatch[1]) : 0)
  }

  // Plain number → seconds
  const num = parseFloat(s.replace(',', '.'))
  if (!isNaN(num)) return Math.round(num)

  return 0
}

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  // Detect delimiter (comma, semicolon or tab)
  const firstLine = lines[0]
  const delim = firstLine.includes('\t') ? '\t' : firstLine.split(';').length > firstLine.split(',').length ? ';' : ','

  function splitLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === delim && !inQuote) {
        result.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = splitLine(lines[0])
  return lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const values = splitLine(l)
      const row: ParsedRow = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })
}

// ─── Excel parser (SheetJS via CDN) ──────────────────────────────────────────

declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer, opts: { type: string }) => {
        SheetNames: string[]
        Sheets: Record<string, unknown>
      }
      utils: {
        sheet_to_json: (sheet: unknown, opts?: { header?: number; defval?: string }) => ParsedRow[]
      }
    }
  }
}

async function loadXLSX(): Promise<NonNullable<Window['XLSX']>> {
  if (window.XLSX) return window.XLSX
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    script.onload = () => resolve(window.XLSX!)
    script.onerror = () => reject(new Error('Kon SheetJS niet laden'))
    document.head.appendChild(script)
  })
}

async function parseXLSX(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const XLSX = await loadXLSX()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).map((row: unknown) => {
    const r = row as string[]
    return r
  }) as unknown as ParsedRow[]
}

async function parseXLSXRows(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const XLSX = await loadXLSX()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return rows as ParsedRow[]
}

// ─── Row → Cue mapping ───────────────────────────────────────────────────────

type ColumnMap = Partial<Record<FieldKey, string>>

function mapRowToCue(row: ParsedRow, colMap: ColumnMap): MappedCue {
  const warnings: string[] = []

  const title = (colMap.title ? row[colMap.title] : '') || ''
  const rawType = (colMap.type ? row[colMap.type] : '') || ''
  const rawDuration = (colMap.duration ? row[colMap.duration] : '') || ''

  const type: CueType = TYPE_MAP[rawType.toLowerCase().trim()] ?? 'custom'
  if (rawType && !TYPE_MAP[rawType.toLowerCase().trim()]) {
    warnings.push(`Onbekend type "${rawType}", ingesteld als "custom"`)
  }

  const duration_seconds = parseDuration(rawDuration)
  if (!duration_seconds && rawDuration) warnings.push(`Duur "${rawDuration}" niet herkend, ingesteld op 0`)

  return {
    title: title.trim(),
    type,
    duration_seconds,
    notes: (colMap.notes ? row[colMap.notes]?.trim() : null) || null,
    tech_notes: (colMap.tech_notes ? row[colMap.tech_notes]?.trim() : null) || null,
    presenter: (colMap.presenter ? row[colMap.presenter]?.trim() : null) || null,
    location: (colMap.location ? row[colMap.location]?.trim() : null) || null,
    valid: title.trim().length > 0,
    warnings,
  }
}

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<CueType, string> = {
  video: 'bg-blue-500/15 text-blue-400',
  audio: 'bg-purple-500/15 text-purple-400',
  lighting: 'bg-yellow-500/15 text-yellow-500',
  speech: 'bg-green-500/15 text-green-400',
  break: 'bg-gray-500/15 text-gray-400',
  intro:        'bg-orange-500/15 text-orange-400',
  outro:        'bg-red-500/15 text-red-400',
  presentation: 'bg-emerald-500/15 text-emerald-400',
  custom:       'bg-slate-500/15 text-slate-400',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportCuesModal({ onClose, onImport }: ImportCuesModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parsed state
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<ParsedRow[]>([])
  const [colMap, setColMap] = useState<ColumnMap>({})
  const [fileName, setFileName] = useState('')

  const mappedCues: MappedCue[] = rawRows.map(r => mapRowToCue(r, colMap))
  const validCount = mappedCues.filter(c => c.valid).length
  const warnCount = mappedCues.filter(c => c.warnings.length > 0).length

  // ── File processing ──────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setParsing(true)
    setError(null)
    setFileName(file.name)

    try {
      let rows: ParsedRow[] = []

      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const text = await file.text()
        rows = parseCSV(text)
      } else if (file.name.match(/\.xlsx?$/i)) {
        const buffer = await file.arrayBuffer()
        rows = await parseXLSXRows(buffer)
      } else {
        throw new Error('Alleen .csv en .xlsx bestanden worden ondersteund')
      }

      if (rows.length === 0) throw new Error('Geen rijen gevonden in het bestand')

      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs)
      setRawRows(rows)

      // Auto-detect columns
      const detected: ColumnMap = {}
      for (const field of Object.keys(COLUMN_ALIASES) as FieldKey[]) {
        const match = detectColumn(hdrs, field)
        if (match) detected[field] = match
      }
      setColMap(detected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const toImport: CreateCueInput[] = mappedCues
      .filter(c => c.valid)
      .map(c => ({
        title:            c.title,
        type:             c.type,
        duration_seconds: c.duration_seconds,
        notes:            c.notes ?? undefined,
        tech_notes:       c.tech_notes ?? undefined,
        presenter:        c.presenter ?? undefined,
        location:         c.location ?? undefined,
      }))
    if (toImport.length === 0) return
    setImporting(true)
    try {
      await onImport(toImport)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import mislukt')
    } finally {
      setImporting(false)
    }
  }, [mappedCues, onImport, onClose])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Cues importeren</h2>
              <p className="text-xs text-muted-foreground">Vanuit CSV of Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Upload zone */}
          {rawRows.length === 0 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Bestand verwerken…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium text-sm">Sleep een bestand hierheen of klik om te kiezen</p>
                    <p className="text-xs text-muted-foreground mt-1">Ondersteund: CSV, Excel (.xlsx)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Column mapping */}
          {rawRows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{rawRows.length} rijen gevonden</p>
                </div>
                <button
                  onClick={() => { setRawRows([]); setHeaders([]); setColMap({}); setFileName(''); setError(null) }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ander bestand
                </button>
              </div>

              {/* Column mapping grid */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Kolom koppeling</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(COLUMN_ALIASES) as FieldKey[]).map(field => {
                    const labels: Record<FieldKey, string> = {
                      title: 'Titel *', type: 'Type', duration: 'Duur',
                      notes: 'Notities', tech_notes: 'Tech notities',
                      presenter: 'Spreker', location: 'Locatie',
                    }
                    return (
                      <div key={field}>
                        <label className="block text-xs text-muted-foreground mb-1">{labels[field]}</label>
                        <div className="relative">
                          <select
                            value={colMap[field] ?? ''}
                            onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                            className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">— niet koppelen —</option>
                            {headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <ChevronDown className="h-3 w-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validCount} klaar om te importeren
                </div>
                {rawRows.length - validCount > 0 && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {rawRows.length - validCount} overgeslagen (geen titel)
                  </div>
                )}
                {warnCount > 0 && (
                  <div className="flex items-center gap-1.5 text-yellow-500">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {warnCount} met waarschuwingen
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-8">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Titel</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Duur</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Spreker</th>
                        <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedCues.map((cue, i) => (
                        <tr key={i} className={cn(
                          'border-b border-border/50 last:border-0',
                          !cue.valid && 'opacity-40'
                        )}>
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium max-w-[180px] truncate">
                            {cue.title || <span className="italic text-muted-foreground">geen titel</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', TYPE_COLORS[cue.type])}>
                              {cue.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">
                            {cue.duration_seconds > 0
                              ? `${Math.floor(cue.duration_seconds / 60)}:${String(cue.duration_seconds % 60).padStart(2, '0')}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[100px] truncate">
                            {cue.presenter || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {!cue.valid ? (
                              <span className="text-destructive">overgeslagen</span>
                            ) : cue.warnings.length > 0 ? (
                              <span className="text-yellow-500" title={cue.warnings.join(', ')}>⚠ waarschuwing</span>
                            ) : (
                              <span className="text-green-500">✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Template download hint */}
          {rawRows.length === 0 && !parsing && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Geen sjabloon bij de hand?{' '}
                <button
                  onClick={() => {
                    const csv = 'Titel,Type,Duur,Spreker,Locatie,Notities,Tech notities\nOpening,intro,5:00,,,Welkomstwoord,Microfoon aan\nPresentatie,speech,15:00,Jan de Vries,Podium A,Keynote spreker,Clicker gereed\nPauze,break,15:00,,,Koffie,\nAfsluiting,outro,5:00,,,Bedankt voor aanwezig zijn,'
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'cueboard-sjabloon.csv'; a.click()
                    URL.revokeObjectURL(url)
                  }}
                  className="text-primary hover:underline"
                >
                  download het sjabloon
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={importing}>Annuleren</Button>
          {rawRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Importeren…
                </span>
              ) : (
                `${validCount} cue${validCount !== 1 ? 's' : ''} importeren`
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
