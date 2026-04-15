/**
 * GET /api/export/rundown/[rundownId]/xlsx
 *
 * Exporteert een rundown als Excel-bestand (.xlsx) met twee sheets:
 *  1. Rundown  — alle cues (positie, titel, type, duur, starttijd, spreker, locatie, notities)
 *  2. Mic Patch — per cue welke devices zijn toegewezen, inclusief kanaal, persoon en fase
 *
 * Zelfde auth als de CSV-export: alleen show-leden of show-eigenaar.
 */

import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatStartTime(baseIso: string | null, offsetSeconds: number): string {
  if (!baseIso) return ''
  const d = new Date(new Date(baseIso).getTime() + offsetSeconds * 1000)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

const CUE_TYPE_LABELS: Record<string, string> = {
  video:        'Video',
  audio:        'Audio',
  lighting:     'Belichting',
  speech:       'Spraak',
  break:        'Pauze',
  custom:       'Overig',
  intro:        'Intro',
  outro:        'Outro',
  presentation: 'Presentatie',
}

const AUDIO_DEVICE_LABELS: Record<string, string> = {
  handheld: 'Handheld',
  headset:  'Headset',
  lapel:    'Lavalier',
  table:    'Tafelmicrofoon',
  iem:      'In-ear monitor',
}

const PHASE_LABELS: Record<string, string> = {
  before: 'Vooraf',
  during: 'Tijdens',
  after:  'Na afloop',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rundownId: string }> },
) {
  const { rundownId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Rundown + show + starttijd
  const { data: rundown } = await supabase
    .from('rundowns')
    .select('id, name, show_id, show_start_time, shows!inner(id, name, created_by, date, venue)')
    .eq('id', rundownId)
    .single()

  if (!rundown) return NextResponse.json({ error: 'Rundown niet gevonden' }, { status: 404 })

  const show = (rundown as {
    shows?: { id: string; name: string; created_by: string | null; date: string | null; venue: string | null }
  }).shows
  if (!show) return NextResponse.json({ error: 'Show niet gevonden' }, { status: 404 })

  // Toegangscheck
  const { data: membership } = await supabase
    .from('show_members')
    .select('role')
    .eq('show_id', rundown.show_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership && show.created_by !== user.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // Cues (cast nodig tot generated types secondary_types kennen)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cues }: { data: Array<{ id: string; position: number; title: string; type: string; secondary_types: string[] | null; duration_seconds: number; presenter: string | null; location: string | null; notes: string | null; tech_notes: string | null }> | null } = await (supabase as any)
    .from('cues')
    .select('id, position, title, type, secondary_types, duration_seconds, presenter, location, notes, tech_notes')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  if (!cues) return NextResponse.json({ error: 'Cues niet gevonden' }, { status: 404 })

  // Audio devices + assignments voor de hele show
  const { data: devices } = await supabase
    .from('audio_devices')
    .select('id, name, type, channel, color, notes')
    .eq('show_id', rundown.show_id)
    .order('channel', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  type DeviceRow     = { id: string; name: string; type: string; channel: number | null; color: string; notes: string | null }
  type AssignmentRow = { id: string; cue_id: string; device_id: string; person_name: string | null; phase: string }

  const cueIds = cues.map(c => c.id)
  let assignments: AssignmentRow[] = []
  if (cueIds.length > 0) {
    const { data } = await supabase
      .from('cue_audio_assignments')
      .select('id, cue_id, device_id, person_name, phase')
      .in('cue_id', cueIds)
    assignments = (data ?? []) as AssignmentRow[]
  }

  const deviceList = (devices ?? []) as DeviceRow[]
  const deviceById = new Map<string, DeviceRow>(deviceList.map(d => [d.id, d]))
  const assignmentsByCue = new Map<string, AssignmentRow[]>()
  for (const a of assignments) {
    const arr = assignmentsByCue.get(a.cue_id) ?? []
    arr.push(a)
    assignmentsByCue.set(a.cue_id, arr)
  }

  // ── Workbook bouwen ─────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'CueBoard'
  wb.created  = new Date()
  wb.company  = 'CueBoard'

  // Sheet 1: Rundown
  const rundownSheet = wb.addWorksheet('Rundown', {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  rundownSheet.columns = [
    { header: '#',                  key: 'position',     width:  5 },
    { header: 'Titel',              key: 'title',        width: 36 },
    { header: 'Type',               key: 'type',         width: 14 },
    { header: 'Extra types',        key: 'extraTypes',   width: 20 },
    { header: 'Duur',               key: 'duration',     width: 10 },
    { header: 'Starttijd',          key: 'startTime',    width: 11 },
    { header: 'Spreker / naam',     key: 'presenter',    width: 24 },
    { header: 'Locatie / podium',   key: 'location',     width: 22 },
    { header: 'Notities',           key: 'notes',        width: 40 },
    { header: 'Technische notities', key: 'techNotes',   width: 40 },
  ]

  // Header-rij met show-info (rijen 1-3), daarna kolomkoppen op rij 4
  rundownSheet.spliceRows(1, 0, [], [], [])
  rundownSheet.getCell('A1').value = `${show.name} — ${rundown.name}`
  rundownSheet.getCell('A1').font  = { bold: true, size: 14 }
  rundownSheet.mergeCells('A1:J1')

  const showMeta: string[] = []
  if (show.date)  showMeta.push(new Date(show.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }))
  if (show.venue) showMeta.push(show.venue)
  rundownSheet.getCell('A2').value = showMeta.join(' · ')
  rundownSheet.getCell('A2').font  = { color: { argb: 'FF666666' } }
  rundownSheet.mergeCells('A2:J2')

  rundownSheet.getCell('A3').value = `Geëxporteerd op ${new Date().toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
  rundownSheet.getCell('A3').font  = { color: { argb: 'FF999999' }, italic: true, size: 10 }
  rundownSheet.mergeCells('A3:J3')

  // Kolomkoppen op rij 4 stylen
  const headerRow = rundownSheet.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 22

  // Data-rijen
  let runningSeconds = 0
  for (const cue of cues) {
    const startTime = formatStartTime(rundown.show_start_time, runningSeconds)
    const extraTypes = ((cue as { secondary_types?: string[] }).secondary_types ?? [])
      .map(t => CUE_TYPE_LABELS[t] ?? t)
      .join(', ')
    rundownSheet.addRow({
      position:   cue.position,
      title:      cue.title,
      type:       CUE_TYPE_LABELS[cue.type] ?? cue.type,
      extraTypes,
      duration:   formatDuration(cue.duration_seconds),
      startTime,
      presenter:  cue.presenter ?? '',
      location:   cue.location ?? '',
      notes:      cue.notes ?? '',
      techNotes:  cue.tech_notes ?? '',
    })
    runningSeconds += cue.duration_seconds
  }

  // Totaal-rij
  const totalRow = rundownSheet.addRow({
    position: '',
    title:    '',
    type:     '',
    duration: formatDuration(runningSeconds),
    startTime: 'Totaal',
  })
  totalRow.font = { bold: true }
  totalRow.getCell('duration').alignment = { horizontal: 'left' }

  // Rijen wrappen voor leesbaarheid notities
  rundownSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 5) {
      row.alignment = { vertical: 'top', wrapText: true }
    }
  })

  // Sheet 2: Mic Patch
  const micSheet = wb.addWorksheet('Mic Patch', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  micSheet.columns = [
    { header: 'Cue #',        key: 'cuePos',     width:  7 },
    { header: 'Cue',          key: 'cueTitle',   width: 30 },
    { header: 'Kanaal',       key: 'channel',    width:  8 },
    { header: 'Device',       key: 'device',     width: 22 },
    { header: 'Type',         key: 'deviceType', width: 16 },
    { header: 'Persoon',      key: 'person',     width: 24 },
    { header: 'Fase',         key: 'phase',      width: 12 },
    { header: 'Notities',     key: 'notes',      width: 32 },
  ]

  micSheet.spliceRows(1, 0, [])
  micSheet.getCell('A1').value = `Mic patch — ${show.name} (${rundown.name})`
  micSheet.getCell('A1').font  = { bold: true, size: 14 }
  micSheet.mergeCells('A1:H1')

  const micHeaderRow = micSheet.getRow(2)
  micHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  micHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
  micHeaderRow.height = 22

  // Rij per assignment, gesorteerd op cue-positie dan kanaal
  let hasAssignments = false
  for (const cue of cues) {
    const cueAssignments = (assignmentsByCue.get(cue.id) ?? []).slice().sort((a, b) => {
      const devA = deviceById.get(a.device_id)
      const devB = deviceById.get(b.device_id)
      const chA = devA?.channel ?? 9999
      const chB = devB?.channel ?? 9999
      return chA - chB
    })
    for (const a of cueAssignments) {
      const dev = deviceById.get(a.device_id)
      hasAssignments = true
      micSheet.addRow({
        cuePos:     cue.position,
        cueTitle:   cue.title,
        channel:    dev?.channel ?? '',
        device:     dev?.name ?? '(onbekend)',
        deviceType: dev ? (AUDIO_DEVICE_LABELS[dev.type] ?? dev.type) : '',
        person:     a.person_name ?? '',
        phase:      PHASE_LABELS[a.phase] ?? a.phase,
        notes:      dev?.notes ?? '',
      })
    }
  }

  if (!hasAssignments) {
    micSheet.addRow({ cuePos: '', cueTitle: 'Nog geen mic patch toegewezen voor deze rundown.' })
    micSheet.getCell(`B3`).font = { italic: true, color: { argb: 'FF999999' } }
  }

  micSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 3) row.alignment = { vertical: 'top', wrapText: true }
  })

  // Sheet 3: Devices overzicht (compact referentie-lijstje)
  if (deviceList.length > 0) {
    const devSheet = wb.addWorksheet('Devices', { views: [{ state: 'frozen', ySplit: 1 }] })
    devSheet.columns = [
      { header: 'Kanaal',   key: 'channel', width:  8 },
      { header: 'Naam',     key: 'name',    width: 22 },
      { header: 'Type',     key: 'type',    width: 16 },
      { header: 'Kleur',    key: 'color',   width: 10 },
      { header: 'Notities', key: 'notes',   width: 40 },
    ]
    const dhRow = devSheet.getRow(1)
    dhRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    dhRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }

    for (const d of deviceList) {
      devSheet.addRow({
        channel: d.channel ?? '',
        name:    d.name,
        type:    AUDIO_DEVICE_LABELS[d.type] ?? d.type,
        color:   d.color,
        notes:   d.notes ?? '',
      })
    }
  }

  // ── Response ────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()

  const filename = `${show.name} — ${rundown.name}`
    .replace(/[^\w\s\-—]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      'Cache-Control':       'no-store',
    },
  })
}
