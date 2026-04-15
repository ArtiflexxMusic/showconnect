/**
 * GET /api/export/template/[templateId]/xlsx
 *
 * Exporteert een rundown-template als .xlsx, inclusief mic patch als die in
 * audio_json staat. Zelfde drie-tabs-layout als de rundown-export, met als
 * verschil dat er geen starttijdkolom is (templates hebben geen show_start_time).
 *
 * Auth: RLS op rundown_templates zorgt dat alleen de eigenaar (of public templates)
 * door de SELECT komen. Eigen-check niet extra nodig.
 */

import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'
import type { TemplateCue, TemplateAudioPayload } from '@/lib/types/database'

export const runtime = 'nodejs'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
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
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Cast nodig tot generated types audio_json kennen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: template }: { data: { id: string; name: string; description: string | null; cues_json: TemplateCue[] | null; audio_json: TemplateAudioPayload | null; created_at: string } | null } = await (supabase as any)
    .from('rundown_templates')
    .select('id, name, description, cues_json, audio_json, created_at')
    .eq('id', templateId)
    .single()

  if (!template) return NextResponse.json({ error: 'Template niet gevonden' }, { status: 404 })

  const cues: TemplateCue[] = Array.isArray(template.cues_json) ? template.cues_json : []
  const audio: TemplateAudioPayload | null = (template as { audio_json?: TemplateAudioPayload | null }).audio_json ?? null

  // ── Workbook bouwen ─────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CueBoard'
  wb.created = new Date()
  wb.company = 'CueBoard'

  // Sheet 1: Rundown
  const rundownSheet = wb.addWorksheet('Rundown', {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  rundownSheet.columns = [
    { header: '#',                   key: 'position',   width:  5 },
    { header: 'Titel',               key: 'title',      width: 36 },
    { header: 'Type',                key: 'type',       width: 14 },
    { header: 'Extra types',         key: 'extraTypes', width: 20 },
    { header: 'Duur',                key: 'duration',   width: 10 },
    { header: 'Spreker / naam',      key: 'presenter',  width: 24 },
    { header: 'Locatie / podium',    key: 'location',   width: 22 },
    { header: 'Notities',            key: 'notes',      width: 40 },
    { header: 'Technische notities', key: 'techNotes',  width: 40 },
  ]

  rundownSheet.spliceRows(1, 0, [], [], [])
  rundownSheet.getCell('A1').value = `Template — ${template.name}`
  rundownSheet.getCell('A1').font  = { bold: true, size: 14 }
  rundownSheet.mergeCells('A1:I1')

  rundownSheet.getCell('A2').value = template.description ?? ''
  rundownSheet.getCell('A2').font  = { color: { argb: 'FF666666' } }
  rundownSheet.mergeCells('A2:I2')

  rundownSheet.getCell('A3').value = `Geëxporteerd op ${new Date().toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — bewaard ${new Date(template.created_at).toLocaleDateString('nl-NL')}`
  rundownSheet.getCell('A3').font  = { color: { argb: 'FF999999' }, italic: true, size: 10 }
  rundownSheet.mergeCells('A3:I3')

  const headerRow = rundownSheet.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 22

  let totalSeconds = 0
  cues.forEach((cue, i) => {
    const secondary = (cue.secondary_types ?? []).map(t => CUE_TYPE_LABELS[t] ?? t).join(', ')
    rundownSheet.addRow({
      position:   i + 1,
      title:      cue.title,
      type:       CUE_TYPE_LABELS[cue.type] ?? cue.type,
      extraTypes: secondary,
      duration:   formatDuration(cue.duration_seconds),
      presenter:  cue.presenter ?? '',
      location:   cue.location ?? '',
      notes:      cue.notes ?? '',
      techNotes:  cue.tech_notes ?? '',
    })
    totalSeconds += cue.duration_seconds
  })

  const totalRow = rundownSheet.addRow({
    position:  '',
    title:     '',
    type:      '',
    extraTypes:'',
    duration:  formatDuration(totalSeconds),
  })
  totalRow.font = { bold: true }

  rundownSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 5) row.alignment = { vertical: 'top', wrapText: true }
  })

  // Sheet 2: Mic Patch
  const micSheet = wb.addWorksheet('Mic Patch', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  micSheet.columns = [
    { header: 'Cue #',    key: 'cuePos',     width:  7 },
    { header: 'Cue',      key: 'cueTitle',   width: 30 },
    { header: 'Kanaal',   key: 'channel',    width:  8 },
    { header: 'Device',   key: 'device',     width: 22 },
    { header: 'Type',     key: 'deviceType', width: 16 },
    { header: 'Persoon',  key: 'person',     width: 24 },
    { header: 'Fase',     key: 'phase',      width: 12 },
    { header: 'Notities', key: 'notes',      width: 32 },
  ]

  micSheet.spliceRows(1, 0, [])
  micSheet.getCell('A1').value = `Mic patch — ${template.name}`
  micSheet.getCell('A1').font  = { bold: true, size: 14 }
  micSheet.mergeCells('A1:H1')

  const micHeaderRow = micSheet.getRow(2)
  micHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  micHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
  micHeaderRow.height = 22

  const hasAudio = audio && audio.devices.length > 0 && audio.assignments.length > 0
  if (hasAudio) {
    // Sorteer per cue-positie, dan kanaal
    const sortedAsn = [...audio.assignments].sort((a, b) => {
      if (a.cue_index !== b.cue_index) return a.cue_index - b.cue_index
      const chA = audio.devices[a.device_index]?.channel ?? 9999
      const chB = audio.devices[b.device_index]?.channel ?? 9999
      return chA - chB
    })
    for (const a of sortedAsn) {
      const dev = audio.devices[a.device_index]
      const cue = cues[a.cue_index]
      if (!dev || !cue) continue
      micSheet.addRow({
        cuePos:     a.cue_index + 1,
        cueTitle:   cue.title,
        channel:    dev.channel ?? '',
        device:     dev.name,
        deviceType: AUDIO_DEVICE_LABELS[dev.type] ?? dev.type,
        person:     a.person_name ?? '',
        phase:      PHASE_LABELS[a.phase] ?? a.phase,
        notes:      dev.notes ?? '',
      })
    }
  } else {
    micSheet.addRow({ cuePos: '', cueTitle: 'Deze template bevat nog geen mic patch.' })
    micSheet.getCell('B3').font = { italic: true, color: { argb: 'FF999999' } }
  }

  micSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 3) row.alignment = { vertical: 'top', wrapText: true }
  })

  // Sheet 3: Devices overzicht (alleen bij audio-payload)
  if (audio && audio.devices.length > 0) {
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

    for (const d of audio.devices) {
      devSheet.addRow({
        channel: d.channel ?? '',
        name:    d.name,
        type:    AUDIO_DEVICE_LABELS[d.type] ?? d.type,
        color:   d.color,
        notes:   d.notes ?? '',
      })
    }
  }

  const buffer = await wb.xlsx.writeBuffer()

  const filename = `Template_${template.name}`
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
