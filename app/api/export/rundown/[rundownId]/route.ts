/**
 * GET /api/export/rundown/[rundownId]
 *
 * Exporteert een rundown als CSV-bestand (UTF-8 BOM voor Excel-compatibiliteit).
 * Inclusief: positie, titel, type, duur, spreker, locatie, notities, technische notities.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function csvCell(value: string | null | undefined): string {
  if (!value) return ''
  // Escape aanhalingstekens en wrap in quotes als nodig
  const str = String(value).replace(/"/g, '""')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str}"`
  }
  return str
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rundownId: string }> },
) {
  const { rundownId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Haal rundown + show op voor naamgeving
  const { data: rundown } = await supabase
    .from('rundowns')
    .select('id, name, show_id, shows!inner(id, name, created_by)')
    .eq('id', rundownId)
    .single()

  if (!rundown) return NextResponse.json({ error: 'Rundown niet gevonden' }, { status: 404 })

  // Toegangscheck: alleen leden of eigenaar
  const show = (rundown as { shows?: { id: string; name: string; created_by: string | null } }).shows
  if (!show) return NextResponse.json({ error: 'Show niet gevonden' }, { status: 404 })

  const { data: membership } = await supabase
    .from('show_members')
    .select('role')
    .eq('show_id', rundown.show_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership && show.created_by !== user.id) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // Haal alle cues op
  const { data: cues } = await supabase
    .from('cues')
    .select('position, title, type, duration_seconds, presenter, location, notes, tech_notes')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  if (!cues) return NextResponse.json({ error: 'Cues niet gevonden' }, { status: 404 })

  // Bouw CSV op
  const headers = ['#', 'Titel', 'Type', 'Duur', 'Spreker / Naam', 'Locatie / Podium', 'Notities', 'Technische notities']
  const rows = cues.map(cue => [
    String(cue.position),
    csvCell(cue.title),
    csvCell(CUE_TYPE_LABELS[cue.type] ?? cue.type),
    csvCell(formatDuration(cue.duration_seconds)),
    csvCell(cue.presenter),
    csvCell(cue.location),
    csvCell(cue.notes),
    csvCell(cue.tech_notes),
  ])

  const totalSeconds = cues.reduce((sum, c) => sum + c.duration_seconds, 0)

  const csvLines = [
    // Rundown info
    `"${show.name} — ${rundown.name}"`,
    `"Geëxporteerd op: ${new Date().toLocaleString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}"`,
    '',
    // Headers
    headers.map(csvCell).join(','),
    // Data rows
    ...rows.map(row => row.join(',')),
    '',
    // Totaal
    `,,Totaal,${csvCell(formatDuration(totalSeconds))}`,
  ]

  // UTF-8 BOM zodat Excel de encoding correct herkent
  const BOM = '\uFEFF'
  const csv = BOM + csvLines.join('\r\n')

  const filename = `${show.name} — ${rundown.name}`
    .replace(/[^\w\s\-—]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}
