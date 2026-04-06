'use client'

import { useEffect } from 'react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

/* ─── Brand ────────────────────────────────────────────────────────────────── */
const BRAND = {
  green:       '#22c55e',
  greenDark:   '#16a34a',
  greenDeep:   '#0d4a2e',
  greenLight:  '#dcfce7',
  dark:        '#0a0f0d',
  headerBg:    '#050f09',
  grey:        '#6b7280',
  greyLight:   '#f9fafb',
  greyBorder:  '#e5e7eb',
  white:       '#ffffff',
  bg:          '#f4f5f4',
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

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface CrewMember {
  id: string; full_name: string | null; email: string | null
  phone: string | null; role: string; department: string | null; call_time: string | null
}
interface RundownWithCues {
  id: string; name: string; show_start_time: string | null; notes: string | null; cues: Cue[]
}
interface Show {
  name: string; date: string | null; venue: string | null
  description: string | null; client?: string | null
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CallsheetNotes extends Record<string, any> {
  briefing?: string; dresscode?: string; wifi_network?: string; wifi_password?: string
  parking?: string; catering?: string; emergency?: string; extra?: string
}
interface Props {
  show: Show; rundowns: RundownWithCues[]; crew: CrewMember[]
  notes: CallsheetNotes; totalCues: number; totalSecs: number; generatedAt: string
}

/* ─── Reusable style objects ─────────────────────────────────────────────────── */
const card: React.CSSProperties = {
  background: BRAND.white, border: `1px solid ${BRAND.greyBorder}`,
  borderRadius: 12, marginBottom: 16, overflow: 'hidden',
}
const sectionHead: React.CSSProperties = {
  background: BRAND.greyLight, borderBottom: `1px solid ${BRAND.greyBorder}`,
  padding: '8px 22px', fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '0.12em', color: BRAND.grey, fontWeight: 700,
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const infoLabel: React.CSSProperties = {
  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
  color: '#9ca3af', fontWeight: 700, marginBottom: 4,
}
const infoValue: React.CSSProperties = {
  fontSize: 13, color: BRAND.dark, whiteSpace: 'pre-line', lineHeight: 1.6,
}

/* ─── CueBoard Logo — matches AppHeader exactly ──────────────────────────────── */
function CueBoardLogo({ dark = false }: { dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{
        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
        background: BRAND.green,
        boxShadow: `0 0 8px 2px rgba(52,211,153,0.6)`,
      }} />
      <span style={{
        fontWeight: 900, fontSize: 15, letterSpacing: '-0.02em',
        textTransform: 'uppercase', color: dark ? BRAND.dark : BRAND.white,
        lineHeight: 1,
      }}>CueBoard</span>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function CallsheetPrintView({ show, rundowns, crew, notes, totalCues, totalSecs, generatedAt }: Props) {
  useEffect(() => {
    document.title = `Callsheet — ${show.name} — CueBoard`
  }, [show.name])

  return (
    <div style={{ background: BRAND.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif', color: BRAND.dark }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 56px' }}>

        {/* ── Toolbar ── */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <CueBoardLogo dark />
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: BRAND.green, color: BRAND.white,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Afdrukken / Opslaan als PDF
          </button>
        </div>

        {/* ── Header card ── */}
        <div style={{ ...card, marginBottom: 16 }}>
          {/* Top brand bar */}
          <div style={{ background: `linear-gradient(135deg, ${BRAND.headerBg} 0%, ${BRAND.greenDeep} 100%)`, padding: '26px 28px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CueBoardLogo />
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                  · Callsheet
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                {generatedAt}
              </span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: BRAND.white, lineHeight: 1.15, marginBottom: 10 }}>
              {show.name}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {show.date  && <span>📅 {formatDate(show.date)}</span>}
              {show.venue && <span>📍 {show.venue}</span>}
              {show.client && <span>💼 {show.client}</span>}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ background: '#f0faf4', borderTop: `2px solid ${BRAND.green}`, padding: '12px 28px', display: 'flex', gap: 32 }}>
            {rundowns[0]?.show_start_time && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.green, lineHeight: 1, marginBottom: 2 }}>
                  {rundowns[0].show_start_time.slice(0, 5)}
                </div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: BRAND.grey }}>Aanvang</div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.dark, lineHeight: 1, marginBottom: 2 }}>{totalCues}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: BRAND.grey }}>Cues</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.dark, lineHeight: 1, marginBottom: 2 }}>{formatDuration(totalSecs)}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: BRAND.grey }}>Totale duur</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.dark, lineHeight: 1, marginBottom: 2 }}>{crew.length}</div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: BRAND.grey }}>Crew</div>
            </div>
          </div>
        </div>

        {/* ── Omschrijving ── */}
        {show.description && (
          <div style={card}>
            <div style={sectionHead}>Omschrijving</div>
            <div style={{ padding: '14px 22px', color: '#374151', lineHeight: 1.7 }}>{show.description}</div>
          </div>
        )}

        {/* ── Briefing ── */}
        {notes.briefing && (
          <div style={card}>
            <div style={{ ...sectionHead, borderLeft: `3px solid ${BRAND.green}` }}>
              <span>📋 Briefing</span>
            </div>
            <div style={{ padding: '14px 22px', whiteSpace: 'pre-line', lineHeight: 1.7, color: '#374151' }}>{notes.briefing}</div>
          </div>
        )}

        {/* ── Praktische info ── */}
        {(notes.dresscode || notes.wifi_network || notes.wifi_password || notes.parking || notes.catering || notes.emergency || notes.extra) && (
          <div style={card}>
            <div style={sectionHead}>Praktische info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {notes.dresscode && (
                <div style={{ padding: '14px 22px', borderBottom: `1px solid ${BRAND.greyBorder}`, borderRight: `1px solid ${BRAND.greyBorder}` }}>
                  <div style={infoLabel}>👔 Dresscode</div>
                  <div style={infoValue}>{notes.dresscode}</div>
                </div>
              )}
              {notes.emergency && (
                <div style={{ padding: '14px 22px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>
                  <div style={infoLabel}>🚨 Noodcontact</div>
                  <div style={infoValue}>{notes.emergency}</div>
                </div>
              )}
              {(notes.wifi_network || notes.wifi_password) && (
                <div style={{ padding: '14px 22px', borderBottom: `1px solid ${BRAND.greyBorder}`, borderRight: `1px solid ${BRAND.greyBorder}` }}>
                  <div style={infoLabel}>📶 WiFi</div>
                  <div style={{ ...infoValue, fontFamily: 'Courier New, monospace' }}>
                    {notes.wifi_network  && <div>Netwerk: {notes.wifi_network}</div>}
                    {notes.wifi_password && <div>Wachtwoord: {notes.wifi_password}</div>}
                  </div>
                </div>
              )}
              {notes.parking && (
                <div style={{ padding: '14px 22px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>
                  <div style={infoLabel}>🚗 Parkeren</div>
                  <div style={infoValue}>{notes.parking}</div>
                </div>
              )}
              {notes.catering && (
                <div style={{ padding: '14px 22px', gridColumn: 'span 2', borderBottom: `1px solid ${BRAND.greyBorder}` }}>
                  <div style={infoLabel}>🍽️ Catering</div>
                  <div style={infoValue}>{notes.catering}</div>
                </div>
              )}
              {notes.extra && (
                <div style={{ padding: '14px 22px', gridColumn: 'span 2' }}>
                  <div style={infoLabel}>📌 Extra notities</div>
                  <div style={infoValue}>{notes.extra}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Crew & Call times ── */}
        {crew.length > 0 && (
          <div style={card}>
            <div style={sectionHead}>
              <span>👥 Crew &amp; Call times</span>
              <span style={{ background: BRAND.greenLight, color: BRAND.green, borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                {crew.length}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: BRAND.greyLight }}>
                  {['Naam', 'Functie', 'Call time', 'Telefoon', 'E-mail'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', fontWeight: 700, padding: '8px 14px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crew.map((m, i) => (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? BRAND.white : '#fafafa' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: BRAND.dark, borderBottom: `1px solid #f3f4f6`, fontSize: 13 }}>{m.full_name ?? '—'}</td>
                    <td style={{ padding: '9px 14px', borderBottom: `1px solid #f3f4f6` }}>
                      <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: BRAND.greenLight, color: BRAND.green, padding: '2px 8px', borderRadius: 99 }}>
                        {m.department || ROLE_LABEL[m.role] || m.role}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', borderBottom: `1px solid #f3f4f6` }}>
                      {m.call_time
                        ? <span style={{ fontFamily: 'monospace', fontWeight: 800, color: BRAND.green, fontSize: 14 }}>{m.call_time}</span>
                        : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '9px 14px', color: '#6b7280', fontSize: 12, borderBottom: `1px solid #f3f4f6` }}>{m.phone ?? '—'}</td>
                    <td style={{ padding: '9px 14px', color: '#6b7280', fontSize: 12, borderBottom: `1px solid #f3f4f6` }}>{m.email ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Rundowns ── */}
        {rundowns.map((r) => {
          const base = r.show_start_time?.slice(0, 5) ?? null
          let elapsed = 0
          const runSecs = r.cues.reduce((s, c) => s + c.duration_seconds, 0)
          return (
            <div key={r.id} style={card}>
              <div style={{ ...sectionHead, borderLeft: `3px solid ${BRAND.green}` }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: BRAND.dark }}>📋 {r.name}</span>
                {base && <span style={{ fontSize: 11, color: BRAND.grey }}>Aanvang {base}</span>}
              </div>

              {r.notes && (
                <div style={{ fontSize: 12, color: BRAND.grey, background: '#f0faf4', borderLeft: `3px solid ${BRAND.green}`, padding: '10px 16px', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                  {r.notes}
                </div>
              )}

              {r.cues.length === 0 ? (
                <div style={{ padding: '16px 22px', color: '#9ca3af', fontStyle: 'italic' }}>Geen cues.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: BRAND.greyLight }}>
                      <th style={{ width: 28, textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', fontWeight: 700, padding: '8px 14px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>#</th>
                      <th style={{ textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', fontWeight: 700, padding: '8px 14px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>Cue</th>
                      <th style={{ width: 70, textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', fontWeight: 700, padding: '8px 14px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>Start</th>
                      <th style={{ width: 64, textAlign: 'right', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', fontWeight: 700, padding: '8px 14px', borderBottom: `1px solid ${BRAND.greyBorder}` }}>Duur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.cues.map((cue, idx) => {
                      const start = base ? addSecs(base, elapsed) : null
                      const color = TYPE_COLOR[cue.type] ?? '#374151'
                      const label = TYPE_LABEL[cue.type] ?? cue.type
                      elapsed += cue.duration_seconds
                      return (
                        <tr key={cue.id} style={{ background: idx % 2 === 0 ? BRAND.white : '#fafafa' }}>
                          <td style={{ padding: '9px 14px', color: '#d1d5db', fontSize: 11, borderBottom: `1px solid #f3f4f6`, verticalAlign: 'top', paddingTop: 11 }}>{idx + 1}</td>
                          <td style={{ padding: '9px 14px', borderBottom: `1px solid #f3f4f6`, verticalAlign: 'top' }}>
                            <div style={{ marginBottom: 2 }}>
                              <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: BRAND.white, background: color, padding: '2px 6px', borderRadius: 4 }}>{label}</span>
                            </div>
                            <div style={{ fontWeight: 600, color: BRAND.dark, fontSize: 13 }}>{cue.title}</div>
                            {cue.presenter  && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>👤 {cue.presenter}</div>}
                            {cue.location   && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>📍 {cue.location}</div>}
                            {cue.notes      && <div style={{ fontSize: 11, color: '#374151', marginTop: 3, whiteSpace: 'pre-line', lineHeight: 1.5 }}>💬 {cue.notes}</div>}
                            {cue.tech_notes && <div style={{ fontSize: 11, color: '#92400e', marginTop: 2, whiteSpace: 'pre-line', lineHeight: 1.5 }}>🔧 {cue.tech_notes}</div>}
                          </td>
                          <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: BRAND.green, textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `1px solid #f3f4f6`, verticalAlign: 'top', paddingTop: 11 }}>{start ?? '—'}</td>
                          <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `1px solid #f3f4f6`, verticalAlign: 'top', paddingTop: 11 }}>{formatDuration(cue.duration_seconds)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: BRAND.greyLight }}>
                      <td colSpan={2} style={{ padding: '8px 14px', borderTop: `2px solid ${BRAND.greyBorder}`, fontSize: 11, color: BRAND.grey }}>
                        {r.cues.length} onderdelen
                      </td>
                      <td colSpan={2} style={{ padding: '8px 14px', borderTop: `2px solid ${BRAND.greyBorder}`, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: BRAND.dark, fontSize: 12 }}>
                        {formatDuration(runSecs)}{base && ` · einde ~${addSecs(base, runSecs)}`}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )
        })}

        {/* ── Footer ── */}
        <div className="no-print" style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', padding: '20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <CueBoardLogo dark />
          <span>Gegenereerd op {generatedAt}</span>
        </div>

      </div>
    </div>
  )
}
