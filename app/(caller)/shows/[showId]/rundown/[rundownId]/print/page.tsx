import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDuration, cueTypeLabel, calculateCueStartTimes } from '@/lib/utils'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

// Statische kleurcodering per type (voor print)
function typeColor(type: string): string {
  const map: Record<string, string> = {
    video:    '#3b82f6',
    audio:    '#a855f7',
    lighting: '#eab308',
    speech:   '#22c55e',
    break:    '#6b7280',
    intro:    '#f97316',
    outro:    '#ef4444',
    custom:   '#64748b',
  }
  return map[type] ?? '#64748b'
}

export default async function PrintPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const { data: rundownRaw } = await supabase
    .from('rundowns').select('*').eq('id', rundownId).single()

  if (!rundownRaw) return notFound()

  const { data: showRaw } = await supabase
    .from('shows').select('*').eq('id', showId).single()

  if (!showRaw) return notFound()

  const { data: cuesRaw } = await supabase
    .from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true })

  const rundown = rundownRaw as unknown as Rundown
  const show    = showRaw    as unknown as Show
  const cues    = (cuesRaw ?? []) as unknown as Cue[]

  const expectedTimes = calculateCueStartTimes(cues, rundown.show_start_time)
  const totalSecs = cues.reduce((acc, c) => acc + c.duration_seconds, 0)

  const now = new Date()
  const printDate = now.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
  const printTime = now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })

  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Rundown – ${show.name} – ${rundown.name}`}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 12px;
            color: #111;
            background: white;
            padding: 24px 32px;
          }
          .header { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 12px; }
          .header h1 { font-size: 22px; font-weight: 800; }
          .header h2 { font-size: 14px; font-weight: 400; color: #555; margin-top: 2px; }
          .meta { display: flex; gap: 16px; margin-top: 8px; font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th {
            text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 0.05em; color: #666; border-bottom: 1px solid #ddd;
            padding: 6px 8px; background: #f8f8f8;
          }
          td { padding: 7px 8px; vertical-align: top; border-bottom: 1px solid #eee; }
          tr:last-child td { border-bottom: none; }
          .num { font-family: monospace; color: #888; font-size: 11px; white-space: nowrap; }
          .time { font-family: monospace; font-size: 10px; color: #aaa; }
          .title { font-weight: 600; font-size: 12px; }
          .type-badge {
            display: inline-block; padding: 1px 7px; border-radius: 100px;
            font-size: 10px; font-weight: 600; color: white; white-space: nowrap;
          }
          .duration { font-family: monospace; font-size: 11px; text-align: right; white-space: nowrap; }
          .notes { font-size: 11px; color: #555; margin-top: 2px; }
          .tech-notes { font-size: 10px; color: #b45309; margin-top: 2px; }
          .presenter { font-size: 10px; color: #555; }
          .total-row td { font-weight: 700; border-top: 2px solid #111; background: #f8f8f8; }
          .footer { margin-top: 20px; font-size: 10px; color: #aaa; text-align: right; }
          @media print {
            body { padding: 12px 20px; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        {/* Print knop – niet zichtbaar bij printen */}
        <div className="no-print" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            id="print-btn"
            style={{
              padding: '8px 16px', background: '#111', color: 'white', border: 'none',
              borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
            }}
          >
            🖨 Afdrukken / Opslaan als PDF
          </button>
          <a href={`/shows/${showId}/rundown/${rundownId}`}
            style={{
              padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px',
              textDecoration: 'none', color: '#555', fontSize: '13px'
            }}
          >
            ← Terug naar editor
          </a>
        </div>

        <div className="header">
          <h1>{show.name}</h1>
          <h2>{rundown.name}</h2>
          <div className="meta">
            {show.date && <span>📅 {new Date(show.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            {show.venue && <span>📍 {show.venue}</span>}
            {rundown.show_start_time && <span>🕐 Aanvang {rundown.show_start_time.slice(0, 5)}</span>}
            <span>⏱ Totaal: {formatDuration(totalSecs)}</span>
            <span>{cues.length} cues</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th style={{ width: '50px' }}>Tijd</th>
              <th>Cue titel</th>
              <th>Type</th>
              <th style={{ width: '60px', textAlign: 'right' }}>Duur</th>
            </tr>
          </thead>
          <tbody>
            {cues.map((cue, i) => (
              <tr key={cue.id}>
                <td className="num">{(i + 1).toString().padStart(2, '0')}</td>
                <td className="time">{expectedTimes[i] !== '--:--' ? expectedTimes[i] : ''}</td>
                <td>
                  <div className="title">{cue.title}</div>
                  {(cue.presenter || cue.location) && (
                    <div className="presenter">
                      {cue.presenter && `🎤 ${cue.presenter}`}
                      {cue.presenter && cue.location && ' · '}
                      {cue.location && `📍 ${cue.location}`}
                    </div>
                  )}
                  {cue.notes && <div className="notes">💬 {cue.notes}</div>}
                  {cue.tech_notes && <div className="tech-notes">🔧 {cue.tech_notes}</div>}
                </td>
                <td>
                  <span
                    className="type-badge"
                    style={{ backgroundColor: typeColor(cue.type) }}
                  >
                    {cueTypeLabel(cue.type)}
                  </span>
                </td>
                <td className="duration">{formatDuration(cue.duration_seconds)}</td>
              </tr>
            ))}

            {/* Totaal rij */}
            <tr className="total-row">
              <td className="num" colSpan={2} />
              <td style={{ fontWeight: 700 }}>Totale duur</td>
              <td />
              <td className="duration">{formatDuration(totalSecs)}</td>
            </tr>
          </tbody>
        </table>

        <div className="footer">
          Afgedrukt via CueBoard · {printDate} {printTime}
          {rundown.show_start_time && ` · Aanvang ${rundown.show_start_time.slice(0, 5)}`}
        </div>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: "document.getElementById('print-btn').onclick=function(){window.print()}" }} />
      </body>
    </html>
  )
}
