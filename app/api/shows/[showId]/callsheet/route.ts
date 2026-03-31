import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

interface Recipient {
  full_name: string | null
  email: string
  role: string
}

interface CallsheetNotes {
  briefing: string
  location: string
  parking: string
  catering: string
  technical: string
  contacts: string
  extra: string
}

function notesHtml(notes: CallsheetNotes, showName: string, showDate: string | null, showVenue: string | null, showClient: string | null): string {
  const sections: string[] = []

  const addSection = (title: string, content: string) => {
    if (!content?.trim()) return
    sections.push(`
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <h3 style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${title}</h3>
          <p style="margin: 0; font-size: 15px; color: #111827; white-space: pre-line; line-height: 1.6;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </td>
      </tr>
    `)
  }

  addSection('Briefing / Algemene info', notes.briefing)
  addSection('Locatie & Bereikbaarheid', notes.location)
  addSection('Parkeren', notes.parking)
  addSection('Catering', notes.catering)
  addSection('Technische info', notes.technical)
  addSection('Contactpersonen', notes.contacts)
  addSection('Extra notities', notes.extra)

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Callsheet — ${showName}</title>
</head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: #111827; padding: 28px 32px;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">CueBoard · Callsheet</p>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">${showName}</h1>
              <div style="margin-top: 12px; display: flex; gap: 20px; flex-wrap: wrap;">
                ${showDate ? `<span style="font-size: 13px; color: #9ca3af;">📅 ${showDate}</span>` : ''}
                ${showVenue ? `<span style="font-size: 13px; color: #9ca3af;">📍 ${showVenue}</span>` : ''}
                ${showClient ? `<span style="font-size: 13px; color: #9ca3af;">💼 ${showClient}</span>` : ''}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${sections.join('')}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                Verstuurd via CueBoard · cueboard.nl
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ showId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { showId } = await params
    const body = await req.json()
    const { notes, recipients } = body as { notes: CallsheetNotes; recipients: Recipient[] }

    if (!recipients?.length) {
      return NextResponse.json({ error: 'Geen ontvangers opgegeven' }, { status: 400 })
    }

    // Haal show op voor e-mail subject
    const { data: show } = await supabase
      .from('shows')
      .select('name, date, venue')
      .eq('id', showId)
      .single()

    if (!show) return NextResponse.json({ error: 'Show niet gevonden' }, { status: 404 })

    const showClient = (show as { client?: string | null }).client ?? null
    const html = notesHtml(notes, show.name, show.date, show.venue, showClient)
    const subject = `📋 Callsheet: ${show.name}${show.date ? ` — ${show.date}` : ''}`

    // Stuur naar alle ontvangers
    const results = await Promise.all(
      recipients.map(r =>
        sendEmail({
          to:      r.email,
          subject,
          html,
        })
      )
    )

    const failures = results.filter(r => !r.ok)
    if (failures.length > 0) {
      console.error('[callsheet/send] Sommige e-mails niet verstuurd:', failures)
      return NextResponse.json({
        ok: false,
        sent: results.length - failures.length,
        failed: failures.length,
        error: `${failures.length} e-mail(s) niet verstuurd.`,
      }, { status: 207 })
    }

    return NextResponse.json({ ok: true, sent: results.length })
  } catch (err) {
    console.error('[callsheet/send]', err)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
