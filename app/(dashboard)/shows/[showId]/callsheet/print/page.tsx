import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string }>
}

export default async function CallsheetPrintPage({ params }: PageProps) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [showRes, rundownsRes, membersRes] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns').select('id, name, show_start_time').eq('show_id', showId).order('created_at'),
    supabase.from('show_members').select('role, profiles(full_name, email)').eq('show_id', showId),
  ])

  const show = showRes.data
  if (!show) redirect('/dashboard')

  // Laad cues per rundown
  const rundowns = await Promise.all(
    (rundownsRes.data ?? []).map(async (r) => {
      const { data: cues } = await supabase
        .from('cues')
        .select('id, title, type, duration_seconds, presenter, position')
        .eq('rundown_id', r.id)
        .order('position')
      return { ...r, cues: (cues ?? []) as Cue[] }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crew = (membersRes.data ?? []).map((m: any) => ({
    full_name: m.profiles?.full_name ?? null,
    email: m.profiles?.email ?? null,
    role: m.role as string,
  }))

  const roleLabel: Record<string, string> = {
    owner: 'Eigenaar', editor: 'Editor', viewer: 'Kijker',
    caller: 'Caller', crew: 'Crew', presenter: 'Presentator',
  }

  return (
    <html lang="nl">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Callsheet — {show.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; color: #111827; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            @page { margin: 20mm; }
          }
          .container { max-width: 800px; margin: 0 auto; padding: 32px 24px; }
          .header { background: #111827; color: white; padding: 24px 32px; border-radius: 12px 12px 0 0; margin-bottom: 0; }
          .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
          .header .meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #9ca3af; }
          .body { border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px; padding: 0 32px; }
          .section { padding: 20px 0; border-bottom: 1px solid #e5e7eb; }
          .section:last-child { border-bottom: none; }
          .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 10px; font-weight: 600; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
          .value { font-size: 14px; color: #111827; font-weight: 500; }
          .crew-list { display: flex; flex-direction: column; gap: 8px; }
          .crew-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
          .crew-item:last-child { border-bottom: none; }
          .role-badge { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 99px; }
          .cue-row { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          .cue-row:last-child { border-bottom: none; }
          .cue-num { color: #9ca3af; font-variant-numeric: tabular-nums; width: 24px; shrink: 0; }
          .cue-title { flex: 1; font-weight: 500; }
          .cue-presenter { color: #6b7280; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .cue-dur { font-variant-numeric: tabular-nums; color: #6b7280; font-family: monospace; }
          .total { text-align: right; font-size: 12px; color: #9ca3af; padding-top: 8px; }
          .print-btn { margin: 24px auto; display: block; padding: 10px 28px; background: #111827; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
          .generated { text-align: center; font-size: 11px; color: #d1d5db; padding: 16px 0; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <button onClick={() => window.print()} className="print-btn no-print">🖨️ Afdrukken / Opslaan als PDF</button>

          <div className="header">
            <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              CueBoard · Callsheet
            </p>
            <h1>{show.name}</h1>
            <div className="meta">
              {show.date && <span>📅 {formatDate(show.date)}</span>}
              {show.venue && <span>📍 {show.venue}</span>}
              {(show as { client?: string | null }).client && <span>💼 {(show as { client?: string | null }).client}</span>}
            </div>
          </div>

          <div className="body">
            {show.description && (
              <div className="section">
                <h2>Omschrijving</h2>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>{show.description}</p>
              </div>
            )}

            {/* Crew */}
            {crew.length > 0 && (
              <div className="section">
                <h2>Crew ({crew.length})</h2>
                <div className="crew-list">
                  {crew.map((m, i) => (
                    <div key={i} className="crew-item">
                      <div>
                        <span style={{ fontWeight: 500 }}>{m.full_name ?? '—'}</span>
                        <span className="role-badge" style={{ marginLeft: '8px' }}>{roleLabel[m.role] ?? m.role}</span>
                      </div>
                      {m.email && <span style={{ fontSize: '12px', color: '#6b7280' }}>{m.email}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rundowns */}
            {rundowns.map(r => (
              <div key={r.id} className="section">
                <h2>Programma: {r.name}{r.show_start_time ? ` — aanvang ${r.show_start_time.slice(0, 5)}` : ''}</h2>
                {r.cues.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>Geen cues.</p>
                ) : (
                  <>
                    {r.cues.map((cue, idx) => (
                      <div key={cue.id} className="cue-row">
                        <span className="cue-num">#{idx + 1}</span>
                        <span className="cue-title">{cue.title}</span>
                        {cue.presenter && <span className="cue-presenter">{cue.presenter}</span>}
                        <span className="cue-dur">{formatDuration(cue.duration_seconds)}</span>
                      </div>
                    ))}
                    <p className="total">
                      Totale duur: {formatDuration(r.cues.reduce((s, c) => s + c.duration_seconds, 0))}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          <p className="generated no-print">Gegenereerd via CueBoard · cueboard.nl</p>
        </div>
      </body>
    </html>
  )
}
