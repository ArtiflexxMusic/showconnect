/**
 * Callsheet printpagina — standalone route buiten dashboard layout
 *
 * Alle callsheet-notities worden meegegeven als ?d=<JSON> via de URL.
 * Show-info, crew en rundowns worden direct uit Supabase gehaald.
 *
 * Printen: klik de knop of gebruik Ctrl/Cmd+P
 * PDF:     in printdialoog → "Opslaan als PDF" kiezen
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

interface PageProps {
  params:       Promise<{ showId: string }>
  searchParams: Promise<{ d?: string }>
}

const TYPE_LABEL: Record<string, string> = {
  speech: 'Spreek', video: 'Video', audio: 'Audio', lighting: 'Licht',
  presentation: 'Presentatie', intro: 'Intro', outro: 'Outro',
  break: 'Pauze', custom: 'Anders',
}
const TYPE_COLOR: Record<string, string> = {
  speech: '#2563eb', video: '#7c3aed', audio: '#059669', lighting: '#d97706',
  presentation: '#0891b2', intro: '#16a34a', outro: '#9333ea',
  break: '#6b7280', custom: '#374151',
}
const ROLE_LABEL: Record<string, string> = {
  owner: 'Eigenaar', editor: 'Editor', viewer: 'Kijker',
  caller: 'Caller', crew: 'Crew', presenter: 'Presentator',
}

function addSecs(hhmm: string, secs: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 3600 + m * 60 + secs
  return `${String(Math.floor(t / 3600) % 24).padStart(2, '0')}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}`
}

export default async function CallsheetPrintPage({ params, searchParams }: PageProps) {
  const { showId } = await params
  const { d }      = await searchParams
  const supabase   = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Decodeer callsheet-notities uit URL-param
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notes: Record<string, any> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let crewExtras: Record<string, any> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let passedCrew: any[] = []
  if (d) {
    try {
      const parsed = JSON.parse(decodeURIComponent(d))
      notes      = parsed
      crewExtras = parsed.crew_extras ?? {}
      passedCrew = parsed.crew ?? []
    } catch { /* laat leeg */ }
  }

  const [showRes, rundownsRes, membersRes] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns')
      .select('id, name, show_start_time, notes')
      .eq('show_id', showId).order('created_at'),
    supabase.from('show_members')
      .select('id, role, profiles(full_name, email, phone)')
      .eq('show_id', showId),
  ])

  const show = showRes.data
  if (!show) redirect('/dashboard')

  const rundowns = await Promise.all(
    (rundownsRes.data ?? []).map(async (r) => {
      const { data: cues } = await supabase
        .from('cues')
        .select('id, title, type, duration_seconds, presenter, position, notes, tech_notes, location')
        .eq('rundown_id', r.id).order('position')
      return { ...r, cues: (cues ?? []) as Cue[] }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crew = (membersRes.data ?? []).map((m: any) => {
    const extra = crewExtras[m.id] ?? {}
    const phone = extra.phone || m.profiles?.phone || passedCrew.find((c: any) => c.id === m.id)?.phone || null
    return {
      id:         m.id,
      full_name:  m.profiles?.full_name ?? null,
      email:      m.profiles?.email ?? null,
      phone,
      role:       m.role as string,
      department: extra.department || null,
      call_time:  extra.call_time  || null,
    }
  })

  const totalCues = rundowns.reduce((s, r) => s + r.cues.length, 0)
  const totalSecs = rundowns.reduce((s, r) => s + r.cues.reduce((ss, c) => ss + c.duration_seconds, 0), 0)
  const showClient = (show as { client?: string | null }).client ?? null

  const generatedAt = new Date().toLocaleString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
           background: #f4f5f7; color: #111827; font-size: 13px; line-height: 1.5; }
    @media print {
      body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
      @page { margin: 14mm 18mm; size: A4 portrait; }
    }
    .wrap { max-width: 900px; margin: 0 auto; padding: 28px 20px 48px; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 18px; overflow: hidden; }

    /* Print bar */
    .print-bar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 20px; }
    .btn { padding: 9px 22px; border-radius: 8px; font-size: 13px; font-weight: 700;
           cursor: pointer; border: none; letter-spacing: 0.01em; }
    .btn-dark { background: #111827; color: white; }

    /* Header */
    .hdr { background: #111827; color: white; padding: 28px 32px 22px; }
    .hdr-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #6b7280; margin-bottom: 6px; }
    .hdr h1 { font-size: 26px; font-weight: 800; line-height: 1.15; margin-bottom: 12px; }
    .hdr-meta { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #9ca3af; }
    .strip { background: #1f2937; border-top: 1px solid #374151; padding: 12px 32px; display: flex; gap: 36px; }
    .si { text-align: center; }
    .si-val { font-size: 20px; font-weight: 800; color: white; line-height: 1; margin-bottom: 2px; }
    .si-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }

    /* Section head */
    .sh { background: #f9fafb; border-bottom: 1px solid #e5e7eb;
          padding: 9px 24px; font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.12em; color: #6b7280; font-weight: 700;
          display: flex; justify-content: space-between; align-items: center; }

    /* Info grid */
    .ig { display: grid; grid-template-columns: 1fr 1fr; }
    .ic { padding: 14px 24px; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
    .ic:nth-child(even) { border-right: none; }
    .ic.full { grid-column: span 2; border-right: none; }
    .il { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
          color: #9ca3af; font-weight: 700; margin-bottom: 4px; }
    .iv { font-size: 13px; color: #111827; white-space: pre-line; line-height: 1.6; }
    .iv.mono { font-family: 'Courier New', monospace; }

    /* Table */
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
         color: #9ca3af; font-weight: 700; padding: 8px 14px; border-bottom: 1px solid #e5e7eb;
         background: #f9fafb; }
    th.r { text-align: right; }
    td { padding: 9px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #fafafa; }
    tfoot td { background: #f9fafb; border-top: 2px solid #e5e7eb; border-bottom: none;
               font-size: 11px; color: #6b7280; padding: 8px 14px; }

    /* Crew */
    .fw { font-weight: 600; }
    .badge { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase;
             letter-spacing: 0.05em; background: #f3f4f6; color: #6b7280;
             padding: 2px 8px; border-radius: 99px; }
    .ct { font-family: monospace; font-weight: 800; color: #2563eb; font-size: 14px; }
    .mu { color: #9ca3af; font-size: 12px; }

    /* Cues */
    .nc { color: #d1d5db; font-size: 11px; padding-top: 11px !important; }
    .tc { font-family: monospace; font-size: 12px; font-weight: 700; color: #2563eb;
          text-align: right; white-space: nowrap; padding-top: 11px !important; }
    .dc { font-family: monospace; font-size: 12px; color: #9ca3af;
          text-align: right; white-space: nowrap; padding-top: 11px !important; }
    .tb { display: inline-block; font-size: 8px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.06em; color: white; padding: 2px 6px; border-radius: 4px; margin-bottom: 3px; }
    .ct2 { font-weight: 600; color: #111827; }
    .cs  { font-size: 11px; color: #9ca3af; margin-top: 1px; }
    .cn  { font-size: 11px; color: #374151; margin-top: 3px; white-space: pre-line; line-height: 1.5; }
    .ctn { font-size: 11px; color: #92400e; margin-top: 2px; white-space: pre-line; line-height: 1.5; }
    .rnotes { font-size: 12px; color: #6b7280; background: #f9fafb;
              border-left: 3px solid #e5e7eb; padding: 10px 16px;
              white-space: pre-line; line-height: 1.6; }
    .footer { text-align: center; font-size: 10px; color: #d1d5db; padding: 14px 0; }
  `

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Callsheet — {show.name}</title>
        <style>{css}</style>
        {/* Print-knop via native onclick — werkt altijd, ook zonder React hydration */}
        <script dangerouslySetInnerHTML={{ __html: 'function doPrint(){ window.print(); }' }} />
      </head>
      <body>
        <div className="wrap">

          {/* Print-knop */}
          <div className="print-bar no-print">
            <button className="btn btn-dark" onclick="doPrint()">🖨️ Afdrukken / Opslaan als PDF</button>
          </div>

          {/* Header */}
          <div className="card">
            <div className="hdr">
              <p className="hdr-label">CueBoard · Callsheet</p>
              <h1>{show.name}</h1>
              <div className="hdr-meta">
                {show.date  && <span>📅 {formatDate(show.date)}</span>}
                {show.venue && <span>📍 {show.venue}</span>}
                {showClient && <span>💼 {showClient}</span>}
              </div>
            </div>
            <div className="strip">
              {rundowns[0]?.show_start_time && (
                <div className="si">
                  <div className="si-val">{rundowns[0].show_start_time.slice(0, 5)}</div>
                  <div className="si-lbl">Aanvang</div>
                </div>
              )}
              <div className="si">
                <div className="si-val">{totalCues}</div>
                <div className="si-lbl">Cues</div>
              </div>
              <div className="si">
                <div className="si-val">{formatDuration(totalSecs)}</div>
                <div className="si-lbl">Totale duur</div>
              </div>
              <div className="si">
                <div className="si-val">{crew.length}</div>
                <div className="si-lbl">Crew</div>
              </div>
            </div>
          </div>

          {/* Omschrijving */}
          {show.description && (
            <div className="card">
              <div className="sh">Omschrijving</div>
              <div style={{ padding: '14px 24px', color: '#374151', lineHeight: '1.7' }}>{show.description}</div>
            </div>
          )}

          {/* Briefing */}
          {notes.briefing && (
            <div className="card">
              <div className="sh">📋 Briefing</div>
              <div style={{ padding: '14px 24px', whiteSpace: 'pre-line', lineHeight: '1.7' }}>{notes.briefing}</div>
            </div>
          )}

          {/* Praktische info */}
          {(notes.dresscode || notes.wifi_network || notes.wifi_password || notes.parking || notes.catering || notes.emergency || notes.extra) && (
            <div className="card">
              <div className="sh">Praktische info</div>
              <div className="ig">
                {notes.dresscode && (
                  <div className="ic">
                    <div className="il">👔 Dresscode</div>
                    <div className="iv">{notes.dresscode}</div>
                  </div>
                )}
                {notes.emergency && (
                  <div className="ic">
                    <div className="il">🚨 Noodcontact</div>
                    <div className="iv">{notes.emergency}</div>
                  </div>
                )}
                {(notes.wifi_network || notes.wifi_password) && (
                  <div className="ic">
                    <div className="il">📶 WiFi</div>
                    <div className="iv mono">
                      {notes.wifi_network  && <div>Netwerk: {notes.wifi_network}</div>}
                      {notes.wifi_password && <div>Wachtwoord: {notes.wifi_password}</div>}
                    </div>
                  </div>
                )}
                {notes.parking && (
                  <div className="ic">
                    <div className="il">🚗 Parkeren</div>
                    <div className="iv">{notes.parking}</div>
                  </div>
                )}
                {notes.catering && (
                  <div className="ic full">
                    <div className="il">🍽️ Catering</div>
                    <div className="iv">{notes.catering}</div>
                  </div>
                )}
                {notes.extra && (
                  <div className="ic full">
                    <div className="il">📌 Extra notities</div>
                    <div className="iv">{notes.extra}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crew */}
          {crew.length > 0 && (
            <div className="card">
              <div className="sh">👥 Crew &amp; Call times ({crew.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Functie</th>
                    <th>Call time</th>
                    <th>Telefoon</th>
                    <th>E-mail</th>
                  </tr>
                </thead>
                <tbody>
                  {crew.map((m) => (
                    <tr key={m.id}>
                      <td className="fw">{m.full_name ?? '—'}</td>
                      <td><span className="badge">{m.department || ROLE_LABEL[m.role] || m.role}</span></td>
                      <td>{m.call_time ? <span className="ct">{m.call_time}</span> : <span className="mu">—</span>}</td>
                      <td className="mu">{m.phone ?? '—'}</td>
                      <td className="mu">{m.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rundowns */}
          {rundowns.map((r) => {
            const base = r.show_start_time?.slice(0, 5) ?? null
            let elapsed = 0
            const runSecs = r.cues.reduce((s, c) => s + c.duration_seconds, 0)

            return (
              <div key={r.id} className="card">
                <div className="sh">
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#111827' }}>📋 {r.name}</span>
                  {base && <span style={{ fontSize: '11px', color: '#6b7280' }}>Aanvang {base}</span>}
                </div>

                {r.notes && <div className="rnotes">{r.notes}</div>}

                {r.cues.length === 0 ? (
                  <div style={{ padding: '16px 24px', color: '#9ca3af', fontStyle: 'italic' }}>Geen cues.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '28px' }}>#</th>
                        <th>Cue</th>
                        <th className="r" style={{ width: '70px' }}>Start</th>
                        <th className="r" style={{ width: '64px' }}>Duur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.cues.map((cue, idx) => {
                        const start = base ? addSecs(base, elapsed) : null
                        const color = TYPE_COLOR[cue.type] ?? '#374151'
                        const label = TYPE_LABEL[cue.type] ?? cue.type
                        elapsed += cue.duration_seconds
                        return (
                          <tr key={cue.id}>
                            <td className="nc">{idx + 1}</td>
                            <td>
                              <div><span className="tb" style={{ background: color }}>{label}</span></div>
                              <div className="ct2">{cue.title}</div>
                              {cue.presenter  && <div className="cs">👤 {cue.presenter}</div>}
                              {cue.location   && <div className="cs">📍 {cue.location}</div>}
                              {cue.notes      && <div className="cn">💬 {cue.notes}</div>}
                              {cue.tech_notes && <div className="ctn">🔧 {cue.tech_notes}</div>}
                            </td>
                            <td className="tc">{start ?? '—'}</td>
                            <td className="dc">{formatDuration(cue.duration_seconds)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2}>{r.cues.length} onderdelen</td>
                        <td colSpan={2} style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#374151' }}>
                          {formatDuration(runSecs)}{base && <> · einde ~{addSecs(base, runSecs)}</>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )
          })}

          <p className="footer no-print">Gegenereerd op {generatedAt} · CueBoard · cueboard.nl</p>
        </div>
      </body>
    </html>
  )
}
