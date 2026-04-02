'use client'

import { formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

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

interface CrewMember {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: string
  department: string | null
  call_time: string | null
}

interface RundownWithCues {
  id: string
  name: string
  show_start_time: string | null
  notes: string | null
  cues: Cue[]
}

interface Show {
  name: string
  date: string | null
  venue: string | null
  description: string | null
  client?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CallsheetNotes extends Record<string, any> {
  briefing?: string
  dresscode?: string
  wifi_network?: string
  wifi_password?: string
  parking?: string
  catering?: string
  emergency?: string
  extra?: string
}

interface Props {
  show: Show
  rundowns: RundownWithCues[]
  crew: CrewMember[]
  notes: CallsheetNotes
  totalCues: number
  totalSecs: number
  generatedAt: string
}

export default function CallsheetPrintView({ show, rundowns, crew, notes, totalCues, totalSecs, generatedAt }: Props) {
  const showClient = show.client ?? null

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f4f5f7 !important; color: #111827 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
          font-size: 13px; line-height: 1.5; }
        @media print {
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          @page { margin: 14mm 18mm; size: A4 portrait; }
        }
        .wrap { max-width: 900px; margin: 0 auto; padding: 28px 20px 48px; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 18px; overflow: hidden; }
        .hdr { background: #111827; color: white; padding: 28px 32px 22px; }
        .hdr-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.15em; color: #6b7280; margin-bottom: 6px; }
        .hdr h1 { font-size: 26px; font-weight: 800; line-height: 1.15; margin-bottom: 12px; color: white; }
        .hdr-meta { display: flex; flex-wrap: wrap; gap: 18px; font-size: 12px; color: #9ca3af; }
        .strip { background: #1f2937; border-top: 1px solid #374151; padding: 12px 32px; display: flex; gap: 36px; }
        .si { text-align: center; }
        .si-val { font-size: 20px; font-weight: 800; color: white; line-height: 1; margin-bottom: 2px; }
        .si-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; }
        .sh { background: #f9fafb; border-bottom: 1px solid #e5e7eb;
          padding: 9px 24px; font-size: 9px; text-transform: uppercase;
          letter-spacing: 0.12em; color: #6b7280; font-weight: 700;
          display: flex; justify-content: space-between; align-items: center; }
        .ig { display: grid; grid-template-columns: 1fr 1fr; }
        .ic { padding: 14px 24px; border-bottom: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; }
        .ic:nth-child(even) { border-right: none; }
        .ic.full { grid-column: span 2; border-right: none; }
        .il { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em;
          color: #9ca3af; font-weight: 700; margin-bottom: 4px; }
        .iv { font-size: 13px; color: #111827; white-space: pre-line; line-height: 1.6; }
        .iv.mono { font-family: 'Courier New', monospace; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
          color: #9ca3af; font-weight: 700; padding: 8px 14px; border-bottom: 1px solid #e5e7eb;
          background: #f9fafb; }
        th.r { text-align: right; }
        td { padding: 9px 14px; border-bottom: 1px solid #f3f4f6; vertical-align: top; color: #111827; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:nth-child(even) { background: #fafafa; }
        tfoot td { background: #f9fafb; border-top: 2px solid #e5e7eb; border-bottom: none;
          font-size: 11px; color: #6b7280; padding: 8px 14px; }
        .fw { font-weight: 600; }
        .badge { display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.05em; background: #f3f4f6; color: #6b7280;
          padding: 2px 8px; border-radius: 99px; }
        .ct { font-family: monospace; font-weight: 800; color: #2563eb; font-size: 14px; }
        .mu { color: #9ca3af; font-size: 12px; }
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
      `}</style>

      <div className="wrap">

        {/* Print knop */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '9px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', border: 'none', background: '#111827', color: 'white' }}
          >
            🖨️ Afdrukken / Opslaan als PDF
          </button>
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
            <div style={{ padding: '14px 24px', whiteSpace: 'pre-line', lineHeight: '1.7', color: '#374151' }}>{notes.briefing}</div>
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
    </>
  )
}
