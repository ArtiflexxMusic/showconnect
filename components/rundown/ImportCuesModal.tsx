'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileSpreadsheet, AlertTriangle, CheckCircle2, ChevronDown, Mic } from 'lucide-react'
import type { CueType, CreateCueInput } from '@/lib/types/database'
import { cn } from '@/lib/utils'

// ─── Mic patch import types ─────────────────────────────────────────────────

export type ImportAudioDeviceType = 'handheld' | 'headset' | 'lapel' | 'table' | 'iem'
export type ImportAudioPhase = 'before' | 'during' | 'after'

export interface ImportAudioDevice {
  name: string
  type: ImportAudioDeviceType
  channel: number | null
  color: string
  notes: string | null
}

export interface ImportAudioAssignment {
  cue_index: number
  device_index: number
  person_name: string | null
  phase: ImportAudioPhase
}

export interface ImportMicPatch {
  devices: ImportAudioDevice[]
  assignments: ImportAudioAssignment[]
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedRow {
  [key: string]: string
}

interface MappedCue {
  title: string
  type: CueType
  secondary_types: CueType[]
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
  onImport: (cues: CreateCueInput[], micPatch: ImportMicPatch | null) => Promise<void>
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

type FieldKey = 'title' | 'type' | 'secondary_types' | 'duration' | 'notes' | 'tech_notes' | 'presenter' | 'location'

const COLUMN_ALIASES: Record<FieldKey, string[]> = {
  title:           ['titel', 'title', 'naam', 'name', 'onderwerp', 'item', 'cue', 'omschrijving', 'description'],
  type:            ['type', 'soort', 'categorie', 'category', 'format'],
  secondary_types: ['extra types', 'extra', 'tags', 'extra_types', 'extratypes', 'secondary', 'sub types', 'subtypes'],
  duration:        ['duur', 'duration', 'tijd', 'time', 'lengte', 'length', 'min', 'minuten', 'minutes', 'sec', 'seconden', 'seconds', 'tijdsduur'],
  notes:           ['notities', 'notes', 'note', 'opmerkingen', 'beschrijving', 'info', 'opmerking', 'toelichting'],
  tech_notes:      ['tech', 'technisch', 'tech notes', 'technische notities', 'tech_notes', 'technotities', 'techniek'],
  presenter:       ['spreker', 'presenter', 'presentator', 'speaker', 'wie', 'who', 'host'],
  location:        ['locatie', 'location', 'ruimte', 'podium', 'scene', 'scène', 'zaal', 'plek', 'venue'],
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

// ─── Excel parser (SheetJS, lokaal gebundeld) ────────────────────────────────

interface XLSXLib {
  read: (data: ArrayBuffer, opts: { type: string }) => {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  utils: {
    sheet_to_json: (sheet: unknown, opts?: { header?: number; defval?: string }) => ParsedRow[]
    aoa_to_sheet: (data: unknown[][]) => unknown
    book_new: () => { SheetNames: string[]; Sheets: Record<string, unknown> }
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void
  }
  writeFile: (wb: unknown, filename: string) => void
}

async function loadXLSX(): Promise<XLSXLib> {
  // Dynamic import zodat xlsx alleen in de client-bundle komt als de gebruiker
  // de import-modal daadwerkelijk opent. Vervangt de vroegere CDN-load.
  const mod = await import('xlsx')
  return mod as unknown as XLSXLib
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

// Leest alle relevante sheets: cues + optioneel devices + mic patch
async function parseXLSXWorkbook(buffer: ArrayBuffer): Promise<{
  cues: ParsedRow[]
  devices: ParsedRow[] | null
  patch: ParsedRow[] | null
}> {
  const XLSX = await loadXLSX()
  const wb = XLSX.read(buffer, { type: 'array' })
  const find = (...names: string[]) =>
    wb.SheetNames.find(s => names.some(n => s.toLowerCase() === n.toLowerCase()))

  // Skip instructie-sheets in de fallback zodat Uitleg/README niet per ongeluk als cues wordt geparsed
  const SKIP_SHEETS = new Set(['uitleg', 'instructies', 'instructions', 'readme', 'help', 'legenda'])
  const firstDataSheet = wb.SheetNames.find(s => !SKIP_SHEETS.has(s.toLowerCase())) ?? wb.SheetNames[0]

  const cuesName = find('Cues', 'Rundown') ?? firstDataSheet
  const cues = XLSX.utils.sheet_to_json(wb.Sheets[cuesName], { defval: '' }) as ParsedRow[]

  const devName = find('Devices', 'Microfoons', 'Mic devices')
  const devices = devName ? XLSX.utils.sheet_to_json(wb.Sheets[devName], { defval: '' }) as ParsedRow[] : null

  const patchName = find('Mic Patch', 'MicPatch', 'Patch', 'Mic')
  const patch = patchName ? XLSX.utils.sheet_to_json(wb.Sheets[patchName], { defval: '' }) as ParsedRow[] : null

  return { cues, devices, patch }
}

// Device type mapping (losse termen zoals 'lavalier' → 'lapel')
const DEVICE_TYPE_MAP: Record<string, ImportAudioDeviceType> = {
  handheld: 'handheld', hand: 'handheld', handmic: 'handheld',
  headset: 'headset', head: 'headset',
  lapel: 'lapel', lavalier: 'lapel', lav: 'lapel', speldje: 'lapel', speld: 'lapel',
  table: 'table', tafel: 'table', tafelmic: 'table', tafelmicrofoon: 'table',
  iem: 'iem', 'in-ear': 'iem', earpiece: 'iem', monitor: 'iem',
}

const PHASE_MAP: Record<string, ImportAudioPhase> = {
  before: 'before', vooraf: 'before', pre: 'before',
  during: 'during', tijdens: 'during',
  after: 'after',  na: 'after', 'na afloop': 'after', post: 'after',
}

function getField(row: ParsedRow, ...keys: string[]): string {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => rk.toLowerCase().trim() === k.toLowerCase())
    if (found && String(row[found]).trim()) return String(row[found]).trim()
  }
  return ''
}

function deriveMicPatch(
  devRows: ParsedRow[] | null,
  patchRows: ParsedRow[] | null,
  cueCount: number,
): ImportMicPatch | null {
  if (!patchRows || patchRows.length === 0) return null

  // Mic-patch tab bevat ÀLLE device-info inline. Unieke (naam, type, kanaal)
  // combinaties → één device. Zo hoeft de gebruiker geen aparte Devices-tab
  // in te vullen. Oude 3-tab sjablonen met een aparte Devices-tab blijven
  // werken: als die bestaat, voegen we die devices vooraf toe zodat matches
  // daarop kloppen.
  const devices: ImportAudioDevice[] = []
  const deviceIndexByKey = new Map<string, number>()

  const keyOf = (name: string, type: ImportAudioDeviceType, channel: number | null) =>
    `${name.toLowerCase()}|${type}|${channel ?? ''}`

  const addDevice = (d: ImportAudioDevice): number => {
    const key = keyOf(d.name, d.type, d.channel)
    const existing = deviceIndexByKey.get(key)
    if (existing !== undefined) return existing
    devices.push(d)
    const idx = devices.length - 1
    deviceIndexByKey.set(key, idx)
    return idx
  }

  // Oude Devices-tab (als die bestaat in upload) voor backward-compat
  if (devRows) {
    for (const r of devRows) {
      const name = getField(r, 'naam', 'name', 'device', 'microfoon')
      if (!name) continue
      const rawType = getField(r, 'type', 'soort').toLowerCase()
      const type: ImportAudioDeviceType = DEVICE_TYPE_MAP[rawType] ?? 'handheld'
      const rawCh = getField(r, 'kanaal', 'channel', 'ch')
      const chNum = rawCh ? parseInt(rawCh, 10) : NaN
      const channel = isNaN(chNum) ? null : chNum
      addDevice({
        name,
        type,
        channel,
        color: getField(r, 'kleur', 'color') || '#64748b',
        notes: getField(r, 'notities', 'notes', 'opmerking') || null,
      })
    }
  }

  const assignments: ImportAudioAssignment[] = []
  for (const r of patchRows) {
    const rawCue = getField(r, 'cue #', 'cue#', 'cue', 'nummer', '#')
    const name   = getField(r, 'microfoon', 'device', 'mic', 'naam')
    if (!rawCue || !name) continue
    const cueNum = parseInt(String(rawCue).replace(/[^\d]/g, ''), 10)
    if (isNaN(cueNum) || cueNum < 1 || cueNum > cueCount) continue

    const rawType = getField(r, 'type', 'soort').toLowerCase()
    const type: ImportAudioDeviceType = DEVICE_TYPE_MAP[rawType] ?? 'handheld'
    const rawCh = getField(r, 'kanaal', 'channel', 'ch')
    const chNum = rawCh ? parseInt(rawCh, 10) : NaN
    const channel = isNaN(chNum) ? null : chNum

    // Match eerst op naam alleen (oude sjabloon, Devices-tab case), dan op volle key
    let deviceIndex = -1
    for (const [key, idx] of deviceIndexByKey.entries()) {
      if (key.startsWith(name.toLowerCase() + '|')) { deviceIndex = idx; break }
    }
    if (deviceIndex === -1) {
      deviceIndex = addDevice({ name, type, channel, color: '#64748b', notes: null })
    }

    const rawPhase = getField(r, 'fase', 'phase').toLowerCase()
    const phase: ImportAudioPhase = PHASE_MAP[rawPhase] ?? 'during'
    const person_name = getField(r, 'persoon', 'person', 'spreker', 'wie') || null

    assignments.push({
      cue_index:    cueNum - 1,
      device_index: deviceIndex,
      person_name,
      phase,
    })
  }

  if (assignments.length === 0) return null
  return { devices, assignments }
}

// Genereert een compact sjabloon: Uitleg + Cues + Mic patch (3 tabs)
async function downloadSjabloonXlsx() {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()

  // ── Tab 1: Uitleg (kort en scanbaar) ────────────────────────────────────
  const uitlegWs = XLSX.utils.aoa_to_sheet([
    ['CueBoard — import sjabloon'],
    [],
    ['Dit bestand heeft 2 tabbladen die je invult:'],
    ['  1. Cues — het draaiboek (wat gebeurt wanneer)'],
    ['  2. Mic patch — welke microfoon wordt gebruikt bij welke cue'],
    [],
    ['Upload daarna dit bestand terug in CueBoard → "Cues importeren".'],
    [],
    [],
    ['TAB "Cues"'],
    ['Kolom',        'Wat invullen'],
    ['#',            'Volgnummer — 1, 2, 3, ... (verbindt met de Mic patch tab)'],
    ['Titel',        'Korte naam, bv "Opening", "Keynote Jan", "Pauze"'],
    ['Type',         'intro · speech · break · outro · video · audio · lighting · presentation · custom (laat leeg = custom)'],
    ['Extra types',  'Extra types naast het hoofdtype, komma-gescheiden. Bv "audio, lighting" (optioneel)'],
    ['Duur',         'M:SS, bv "5:00" = 5 min, "1:30:00" = 1 uur 30'],
    ['Spreker',      'Naam van de spreker (optioneel)'],
    ['Locatie',      'Podium, zaal of ruimte (optioneel)'],
    ['Notities',     'Vrije tekst voor de crew (optioneel)'],
    ['Tech notities','Technische aantekeningen voor techniek (optioneel)'],
    [],
    [],
    ['TAB "Mic patch"'],
    ['Kolom',     'Wat invullen'],
    ['Cue #',     'Het nummer uit de Cues-tab waarin de microfoon wordt gebruikt'],
    ['Microfoon', 'Vrije naam, bv "Mic 1", "Headset Jan" — zelfde naam = zelfde microfoon'],
    ['Type',      'handheld · headset · lavalier · tafelmic · in-ear (laat leeg = handheld)'],
    ['Kanaal',    'Audio-kanaal nummer (optioneel)'],
    ['Persoon',   'Wie gebruikt de microfoon in deze cue (optioneel)'],
    [],
    ['Tip: één microfoon bij meerdere cues? Meerdere rijen, zelfde naam.'],
    ['Tip: rijen met een Cue # dat niet bestaat worden overgeslagen.'],
  ])
  ;(uitlegWs as unknown as { ['!cols']: Array<{ wch: number }> })['!cols'] = [
    { wch: 14 }, { wch: 72 },
  ]
  XLSX.utils.book_append_sheet(wb, uitlegWs, 'Uitleg')

  // ── Tab 2: Cues ─────────────────────────────────────────────────────────
  const cuesWs = XLSX.utils.aoa_to_sheet([
    ['#', 'Titel',          'Type',    'Extra types',     'Duur',  'Spreker',       'Locatie',   'Notities',        'Tech notities'],
    [1,   'Ontvangst',       'custom',  '',                '30:00', '',              'Entree',    'Gasten welkom',   'Muziek aan in foyer'],
    [2,   'Opening',         'intro',   'speech',          '5:00',  'Dagvoorzitter', 'Podium',    'Welkomstwoord',   'Intro-dia op scherm'],
    [3,   'Keynote',         'speech',  'presentation',    '30:00', 'Jan de Vries',  'Podium',    'Over strategie',  'Clicker gereed, slides geladen'],
    [4,   'Paneldiscussie',  'speech',  'audio, lighting', '20:00', '',              'Podium',    '4 panelleden',    'Handheld mics klaar, stoelen opstellen'],
    [5,   'Pauze',           'break',   '',                '15:00', '',              'Foyer',     'Koffie & thee',   'Muziek aan'],
    [6,   'Afsluiting',      'outro',   'speech',          '5:00',  'Dagvoorzitter', 'Podium',    'Bedankt',         'Slot-dia'],
  ])
  ;(cuesWs as unknown as { ['!cols']: Array<{ wch: number }> })['!cols'] = [
    { wch: 4 }, { wch: 26 }, { wch: 10 }, { wch: 22 }, { wch: 8 }, { wch: 20 }, { wch: 16 }, { wch: 28 }, { wch: 32 },
  ]
  XLSX.utils.book_append_sheet(wb, cuesWs, 'Cues')

  // ── Tab 3: Mic patch (alles in één tab) ────────────────────────────────
  const patchWs = XLSX.utils.aoa_to_sheet([
    ['Cue #', 'Microfoon',   'Type',     'Kanaal', 'Persoon'],
    [2,        'Mic 1',       'handheld', 1,        'Dagvoorzitter'],
    [3,        'Headset Jan', 'headset',  2,        'Jan de Vries'],
    [4,        'Mic Panel 1', 'handheld', 3,        'Panellid 1'],
    [4,        'Mic Panel 2', 'handheld', 4,        'Panellid 2'],
    [6,        'Mic 1',       'handheld', 1,        'Dagvoorzitter'],
  ])
  ;(patchWs as unknown as { ['!cols']: Array<{ wch: number }> })['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, patchWs, 'Mic patch')

  XLSX.writeFile(wb, 'cueboard-sjabloon.xlsx')
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

  // Secondary types — komma- of pipe-gescheiden lijst → CueType[]
  const rawSecondary = (colMap.secondary_types ? row[colMap.secondary_types] : '') || ''
  const secondary_types: CueType[] = []
  if (rawSecondary.trim()) {
    for (const raw of rawSecondary.split(/[,;|]/).map(s => s.trim()).filter(Boolean)) {
      const mapped = TYPE_MAP[raw.toLowerCase()]
      if (mapped && mapped !== type && !secondary_types.includes(mapped)) {
        secondary_types.push(mapped)
      } else if (!mapped) {
        warnings.push(`Extra type "${raw}" niet herkend`)
      }
    }
  }

  return {
    title: title.trim(),
    type,
    secondary_types,
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
  const [rawDevices, setRawDevices] = useState<ParsedRow[] | null>(null)
  const [rawPatch, setRawPatch]     = useState<ParsedRow[] | null>(null)

  const mappedCues: MappedCue[] = rawRows.map(r => mapRowToCue(r, colMap))
  const validCount = mappedCues.filter(c => c.valid).length
  const warnCount = mappedCues.filter(c => c.warnings.length > 0).length
  const derivedPatch = deriveMicPatch(rawDevices, rawPatch, validCount)

  // Groepeer unieke waarschuwingen met counts zodat de gebruiker in één
  // oogopslag ziet welke types/duur-waardes niet worden herkend.
  const warningSummary = (() => {
    const counts = new Map<string, number>()
    for (const cue of mappedCues) {
      for (const w of cue.warnings) counts.set(w, (counts.get(w) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([msg, count]) => ({ msg, count }))
  })()

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
        setRawDevices(null)
        setRawPatch(null)
      } else if (file.name.match(/\.xlsx?$/i)) {
        const buffer = await file.arrayBuffer()
        const wb = await parseXLSXWorkbook(buffer)
        rows = wb.cues
        setRawDevices(wb.devices)
        setRawPatch(wb.patch)
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
        secondary_types:  c.secondary_types,
        duration_seconds: c.duration_seconds,
        notes:            c.notes ?? undefined,
        tech_notes:       c.tech_notes ?? undefined,
        presenter:        c.presenter ?? undefined,
        location:         c.location ?? undefined,
      }))
    if (toImport.length === 0) return
    setImporting(true)
    try {
      await onImport(toImport, derivedPatch)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import mislukt')
    } finally {
      setImporting(false)
    }
  }, [mappedCues, onImport, onClose, derivedPatch])

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
                  onClick={() => { setRawRows([]); setHeaders([]); setColMap({}); setFileName(''); setError(null); setRawDevices(null); setRawPatch(null) }}
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
                      title: 'Titel *', type: 'Type', secondary_types: 'Extra types', duration: 'Duur',
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
              <div className="flex items-center gap-3 text-xs flex-wrap">
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
                {derivedPatch && (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Mic className="h-3.5 w-3.5" />
                    Mic patch: {derivedPatch.devices.length} devices, {derivedPatch.assignments.length} toewijzingen
                  </div>
                )}
                {!derivedPatch && (rawDevices || rawPatch) && (
                  <div className="flex items-center gap-1.5 text-yellow-500" title="Zowel 'Devices' als 'Mic Patch' sheets nodig met minstens 1 rij die matcht">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Mic patch gedetecteerd maar niet bruikbaar
                  </div>
                )}
              </div>

              {/* Waarschuwing-overzicht: welke types/waardes niet herkend zijn */}
              {warningSummary.length > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                  <p className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Waarschuwingen
                  </p>
                  <ul className="space-y-1 text-xs text-yellow-200/90 max-h-40 overflow-y-auto">
                    {warningSummary.map(({ msg, count }, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-yellow-400/70 tabular-nums shrink-0 min-w-[28px]">{count}×</span>
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-yellow-200/50 mt-2">
                    Niet-herkende types worden als <strong>custom</strong> geïmporteerd, je kan ze per cue aanpassen. Niet-herkende duur wordt 0:00.
                  </p>
                </div>
              )}

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
            <div className="text-center space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Geen sjabloon bij de hand?{' '}
                <button
                  onClick={() => {
                    downloadSjabloonXlsx().catch(e => setError(e instanceof Error ? e.message : 'Sjabloon genereren mislukt'))
                  }}
                  className="text-primary hover:underline"
                >
                  download het Excel-sjabloon
                </button>
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Bevat 2 tabbladen om in te vullen: <strong>Cues</strong> (het draaiboek) en <strong>Mic patch</strong> (welke microfoon per cue). Tab <strong>Uitleg</strong> legt per kolom uit wat je invult.
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
