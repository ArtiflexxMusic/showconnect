'use client'

import { useEffect } from 'react'
import { cueTypeLabel, formatDuration, calculateCueStartTimes } from '@/lib/utils'
import type { Cue, Rundown } from '@/lib/types/database'

interface PrintableRundownProps {
  rundown: Rundown
  show: { name: string; date: string | null; venue: string | null }
  cues: Cue[]
}

const TYPE_EMOJI: Record<string, string> = {
  video: '📹', audio: '🎵', lighting: '💡', speech: '🎤',
  break: '☕', intro: '🎬', outro: '🏁', presentation: '📊', custom: '⚙️',
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function PrintableRundown({ rundown, show, cues }: PrintableRundownProps) {
  const startTimes = calculateCueStartTimes(cues, rundown.show_start_time)
  const totalSeconds = cues.reduce((s, c) => s + c.duration_seconds, 0)
  const printDate = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    document.title = `Rundown – ${rundown.name} – ${show.name}`
  }, [rundown.name, show.name])

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: white; font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; }
        .no-print { display: flex; }
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          @page { margin: 1.5cm; size: A4; }
          tr { page-break-inside: avoid; }
        }
        table { border-collapse: collapse; width: 100%; }
        th { background: #0d1a12; color: white; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 12px; }
        tr:nth-child(even) td { background: #f9fafb; }
        .notes { color: #6b7280; font-size: 11px; margin-top: 2px; }
        .tech  { color: #d97706; font-size: 10px; margin-top: 1px; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 10px; font-weight: 600; border: 1px solid; }
        .running { background: #dcfce7; color: #166534; border-color: #86efac; }
        .done    { color: #9ca3af; }
        .skipped { color: #f87171; text-decoration: line-through; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href={`/shows`} style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}>← Terug</a>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{rundown.name}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* CSV download knop */}
          <button
            onClick={() => downloadCSV(cues, rundown, show, startTimes)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            CSV exporteren
          </button>
          {/* Excel download knop — incl. mic patch sheet */}
          <a
            href={`/api/export/rundown/${rundown.id}/xlsx`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #16a34a', borderRadius: 8, background: '#f0fdf4', color: '#15803d', fontSize: 13, cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}
            title="Download als Excel met aparte mic patch-sheet"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13l3 3 5-5"/></svg>
            Excel + mic patch
          </a>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: '#0d4a2e', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Afdrukken / PDF
          </button>
        </div>
      </div>

      {/* Factuurpagina */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Kop */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 24, height: 24, background: '#22c55e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="3" rx="1.5" fill="white" opacity="0.9"/>
                <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill="white" opacity="0.7"/>
                <rect x="3" y="16" width="15" height="3" rx="1.5" fill="white" opacity="0.5"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase' }}>CueBoard · Rundown</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '4px 0 2px', color: '#111' }}>{rundown.name}</h1>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
            <span>🎭 {show.name}</span>
            {show.date && <span>📅 {formatDate(show.date)}</span>}
            {show.venue && <span>📍 {show.venue}</span>}
            {rundown.show_start_time && <span>🕐 Aanvang {rundown.show_start_time.slice(0,5)}</span>}
            <span>⏱ Totaal {formatDuration(totalSeconds)}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            Afgedrukt op {printDate} · {cues.length} cues
          </div>
        </div>

        {/* Tabel */}
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ width: 60 }}>Start</th>
              <th style={{ width: 60 }}>Duur</th>
              <th style={{ width: 80 }}>Type</th>
              <th>Titel / Details</th>
              <th style={{ width: 100 }}>Spreker</th>
              <th style={{ width: 80 }}>Locatie</th>
            </tr>
          </thead>
          <tbody>
            {cues.map((cue, i) => (
              <tr key={cue.id} className={cue.status === 'done' ? 'done' : cue.status === 'skipped' ? 'skipped' : ''}>
                <td style={{ fontWeight: 700, color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>
                  {startTimes[cue.position] && startTimes[cue.position] !== '--:--' ? startTimes[cue.position] : '—'}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{formatDuration(cue.duration_seconds)}</td>
                <td>
                  <span className={`badge ${cue.status === 'running' ? 'running' : ''}`} style={{ fontSize: 10 }}>
                    {TYPE_EMOJI[cue.type] ?? '⚙️'} {cueTypeLabel(cue.type)}
                  </span>
                  {cue.secondary_types?.map(st => (
                    <span key={st} className="badge" style={{ fontSize: 9, marginLeft: 3, opacity: 0.7, background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' }}>
                      {cueTypeLabel(st)}
                    </span>
                  ))}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: cue.color ?? undefined }}>
                    {cue.title}
                    {cue.auto_advance && <span style={{ marginLeft: 6, fontSize: 10, color: '#6b7280' }}>⏩ auto</span>}
                  </div>
                  {cue.notes && <div className="notes">{cue.notes}</div>}
                  {cue.tech_notes && <div className="tech">🔧 {cue.tech_notes}</div>}
                  {cue.presentation_filename && <div className="notes">📊 {cue.presentation_filename}</div>}
                  {cue.media_filename && <div className="notes">🎵 {cue.media_filename}</div>}
                </td>
                <td style={{ fontSize: 11, color: '#374151' }}>{cue.presenter ?? '—'}</td>
                <td style={{ fontSize: 11, color: '#374151' }}>{cue.location ?? '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ fontWeight: 700, paddingTop: 12, fontSize: 11, color: '#6b7280' }}>Totaal</td>
              <td style={{ fontFamily: 'monospace', fontWeight: 700, paddingTop: 12 }}>{formatDuration(totalSeconds)}</td>
              <td colSpan={4} style={{ paddingTop: 12, fontSize: 11, color: '#9ca3af' }}>{cues.length} cues</td>
            </tr>
          </tfoot>
        </table>

        {/* Rundown notities */}
        {rundown.notes && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Rundown notities</p>
            <p style={{ fontSize: 12, color: '#78350f', margin: 0 }}>{rundown.notes}</p>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #f3f4f6', fontSize: 10, color: '#d1d5db', textAlign: 'center' }}>
          CueBoard · cueboard.app · {show.name} · {rundown.name}
        </div>
      </div>
    </>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function downloadCSV(
  cues: Cue[],
  rundown: Rundown,
  show: { name: string; date: string | null; venue: string | null },
  startTimes: Record<number, string>
) {
  const header = ['#', 'Start', 'Duur (sec)', 'Type', 'Titel', 'Spreker', 'Locatie', 'Notities', 'Tech notities', 'Media', 'Presentatie']
  const rows = cues.map((c, i) => [
    i + 1,
    startTimes[c.position] ?? '',
    c.duration_seconds,
    cueTypeLabel(c.type),
    c.title,
    c.presenter ?? '',
    c.location ?? '',
    c.notes ?? '',
    c.tech_notes ?? '',
    c.media_filename ?? '',
    c.presentation_filename ?? '',
  ])
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `rundown-${show.name}-${rundown.name}.csv`.replace(/[^a-zA-Z0-9-_.]/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}
