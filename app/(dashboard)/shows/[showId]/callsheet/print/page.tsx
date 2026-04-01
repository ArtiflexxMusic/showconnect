import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string }>
}

const CUE_TYPE_LABEL: Record<string, string> = {
  speech:       'Spreek',
  video:        'Video',
  audio:        'Audio',
  lighting:     'Licht',
  presentation: 'Presentatie',
  intro:        'Intro',
  outro:        'Outro',
  break:        'Pauze',
  custom:       'Anders',
}

const CUE_TYPE_COLOR: Record<string, string> = {
  speech:       '#2563eb',
  video:        '#7c3aed',
  audio:        '#059669',
  lighting:     '#d97706',
  presentation: '#0891b2',
  intro:        '#16a34a',
  outro:        '#9333ea',
  break:        '#6b7280',
  custom:       '#374151',
}

function addSeconds(hhmm: string, totalSec: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const base = h * 3600 + m * 60 + totalSec
  const hh = Math.floor(base / 3600) % 24
  const mm = Math.floor((base % 3600) / 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default async function CallsheetPrintPage({ params }: PageProps) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [showRes, rundownsRes, membersRes] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns')
      .select('id, name, show_start_time, notes')
      .eq('show_id', showId)
      .order('created_at'),
    supabase.from('show_members')
      .select('role, profiles(full_name, email, phone)')
      .eq('show_id', showId),
  ])

  const show = showRes.data
  if (!show) redirect('/dashboard')

  const rundowns = await Promise.all(
    (rundownsRes.data ?? []).map(async (r) => {
      const { data: cues } = await supabase
        .from('cues')
        .select('id, title, type, duration_seconds, presenter, position, notes, tech_notes, location, color')
        .eq('rundown_id', r.id)
        .order('position')
      return { ...r, cues: (cues ?? []) as Cue[] }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crew = (membersRes.data ?? []).map((m: any) => ({
    full_name: m.profiles?.full_name ?? null,
    email:     m.profiles?.email ?? null,
    phone:     m.profiles?.phone ?? null,
    role:      m.role as string,
  }))

  const roleLabel: Record<string, string> = {
    owner:     'Eigenaar',
    editor:    'Editor',
    viewer:    'Kijker',
    caller:    'Caller',
    crew:      'Crew',
    presenter: 'Presentator',
  }

  const generatedAt = new Date().toLocaleString('nl-NL', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Callsheet — {show.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; }
          @media print {
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            @page { margin: 15mm 18mm; }
          }
          .container { max-width: 860px; margin: 0 auto; padding: 32px 20px; }
          .header { background: #111827; color: white; padding: 28px 36px; border-radius: 12px 12px 0 0; }
          .header-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; margin-bottom: 6px; }
          .header h1 { font-size: 26px; font-weight: 800; margin-bottom: 10px; }
          .header-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #9ca3af; }
          .body { background: white; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px; }
          .section { padding: 20px 36px; border-bottom: 1px solid #e5e7eb; }
          .section:last-child { border-bottom: none; }
          .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; font-weight: 700; margin-bottom: 12px; }
          .crew-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .crew-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; padding: 0 0 6px; border-bottom: 1px solid #f3f4f6; }
          .crew-table td { padding: 7px 8px 7px 0; border-bottom: 1px solid #f9fafb; vertical-align: middle; }
          .crew-table tr:last-child td { border-bottom: none; }
          .role-badge { font-size: 10px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 99px; white-space: nowrap; }
          .rundown-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
          .rundown-title { font-size: 15px; font-weight: 700; color: #111827; }
          .rundown-time { font-size: 12px; color: #6b7280; }
          .rundown-notes { font-size: 12px; color: #6b7280; margin-bottom: 14px; line-height: 1.5; background: #f9fafb; border-left: 3px solid #e5e7eb; padding: 8px 12px; border-radius: 0 6px 6px 0; }
          .cue-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .cue-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; padding: 0 8px 6px 0; border-bottom: 2px solid #f3f4f6; }
          .cue-table td { padding: 8px 8px 8px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
          .cue-table tr:last-child td { border-bottom: none; }
          .cue-num { color: #d1d5db; font-size: 11px; width: 28px; font-variant-numeric: tabular-nums; padding-top: 9px !important; }
          .cue-type-badge { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px; color: white; white-space: nowrap; margin-bottom: 4px; }
          .cue-title { font-weight: 600; color: #111827; }
          .cue-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
          .cue-notes { font-size: 11px; color: #6b7280; margin-top: 4px; line-height: 1.5; white-space: pre-line; }
          .cue-tech { font-size: 11px; color: #b45309; margin-top: 3px; line-height: 1.5; white-space: pre-line; }
          .cue-time { font-family: monospace; font-size: 12px; color: #6b7280; text-align: right; white-space: nowrap; padding-top: 9px !important; }
          .cue-dur { font-family: monospace; font-size: 12px; color: #9ca3af; text-align: right; white-space: nowrap; padding-top: 9px !important; }
          .total-row td { padding-top: 10px; font-size: 12px; color: #9ca3af; text-align: right; font-style: italic; border-top: 2px solid #f3f4f6; }
          .print-bar { display: flex; gap: 12px; justify-content: flex-end; margin-bottom: 20px; }
          .btn { padding: 9px 22px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
          .btn-primary { background: #111827; color: white; }
          .footer { text-align: center; font-size: 11px; color: #d1d5db; padding: 18px 0 4px; }
        `}</style>
        {/* onClick werkt niet in server components — fix via inline script */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('DOMContentLoaded', function() {
            var btn = document.getElementById('printBtn');
            if (btn) btn.addEventListener('click', function() { window.print(); });
          });
        ` }} />
      </head>
      <body>
        <div className="container">

          <div className="print-bar no-print">
            <button id="printBtn" className="btn btn-primary">🖨️ Afdrukken / Opslaan als PDF</button>
          </div>

          <div className="header">
            <p className="header-label">CueBoard · Callsheet</p>
            <h1>{show.name}</h1>
            <div className="header-meta">
              {show.date  && <span>📅 {formatDate(show.date)}</span>}
              {show.venue && <span>📍 {show.venue}</span>}
              {(show as { client?: string | null }).client && (
                <span>💼 {(show as { client?: string | null }).client}</span>
              )}
            </div>
          </div>

          <div className="body">

            {show.description && (
              <div className="section">
                <p className="section-title">Omschrijving</p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>{show.description}</p>
              </div>
            )}

            {/* Crew met telefoonnummer */}
            {crew.length > 0 && (
              <div className="section">
                <p className="section-title">Crew &amp; Team ({crew.length})</p>
                <table className="crew-table">
                  <thead>
                    <tr>
                      <th>Naam</th>
                      <th>Rol</th>
                      <th>E-mail</th>
                      <th>Telefoon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crew.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{m.full_name ?? '—'}</td>
                        <td><span className="role-badge">{roleLabel[m.role] ?? m.role}</span></td>
                        <td style={{ color: '#6b7280' }}>{m.email ?? '—'}</td>
                        <td style={{ color: '#6b7280' }}>{m.phone ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Rundowns met starttijden per cue */}
            {rundowns.map((r) => {
              const baseTime = r.show_start_time?.slice(0, 5) ?? null
              let elapsed = 0

              return (
                <div key={r.id} className="section">
                  <div className="rundown-header">
                    <span className="rundown-title">📋 {r.name}</span>
                    {baseTime && <span className="rundown-time">Aanvang: {baseTime}</span>}
                  </div>

                  {r.notes && (
                    <div className="rundown-notes">{r.notes}</div>
                  )}

                  {r.cues.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>Geen cues.</p>
                  ) : (
                    <table className="cue-table">
                      <thead>
                        <tr>
                          <th style={{ width: '28px' }}>#</th>
                          <th>Cue</th>
                          <th style={{ width: '70px', textAlign: 'right' }}>Start</th>
                          <th style={{ width: '60px', textAlign: 'right' }}>Duur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.cues.map((cue, idx) => {
                          const startTime = baseTime ? addSeconds(baseTime, elapsed) : null
                          const typeColor = CUE_TYPE_COLOR[cue.type] ?? '#374151'
                          const typeLabel = CUE_TYPE_LABEL[cue.type] ?? cue.type
                          elapsed += cue.duration_seconds

                          return (
                            <tr key={cue.id}>
                              <td className="cue-num">{idx + 1}</td>
                              <td>
                                <span className="cue-type-badge" style={{ backgroundColor: typeColor }}>
                                  {typeLabel}
                                </span>
                                <div className="cue-title">{cue.title}</div>
                                {cue.presenter && <div className="cue-sub">👤 {cue.presenter}</div>}
                                {cue.location  && <div className="cue-sub">📍 {cue.location}</div>}
                                {cue.notes     && <div className="cue-notes">💬 {cue.notes}</div>}
                                {cue.tech_notes && <div className="cue-tech">🔧 {cue.tech_notes}</div>}
                              </td>
                              <td className="cue-time">{startTime ?? '—'}</td>
                              <td className="cue-dur">{formatDuration(cue.duration_seconds)}</td>
                            </tr>
                          )
                        })}
                        <tr className="total-row">
                          <td colSpan={2} />
                          <td colSpan={2}>
                            Totaal: {formatDuration(r.cues.reduce((s, c) => s + c.duration_seconds, 0))}
                            {baseTime && (
                              <> · Einde ~{addSeconds(baseTime, r.cues.reduce((s, c) => s + c.duration_seconds, 0))}</>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              )
            })}
          </div>

          <p className="footer no-print">Gegenereerd op {generatedAt} via CueBoard · cueboard.nl</p>
        </div>
      </body>
    </html>
  )
}
