import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB (presentaties kunnen groot zijn)
const BUCKET   = 'presentations'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const formData  = await request.formData()
    const file      = formData.get('file') as File | null
    const rundownId = formData.get('rundownId') as string | null

    if (!file)      return NextResponse.json({ error: 'Geen bestand' },    { status: 400 })
    if (!rundownId) return NextResponse.json({ error: 'Geen rundownId' },  { status: 400 })
    if (file.type !== 'application/pdf')
      return NextResponse.json({ error: 'Alleen PDF is toegestaan voor het output-scherm. Exporteer je PPTX als PDF vanuit PowerPoint.' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'Bestand te groot (max 100 MB)' }, { status: 400 })

    const path   = `${user.id}/rundown-${rundownId}.pdf`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) throw uploadErr

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      url:      urlData.publicUrl,
      path,
      filename: file.name,
      size:     file.size,
    })
  } catch (err) {
    console.error('[upload-rundown-slide]', err)
    return NextResponse.json({ error: 'Upload mislukt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const { path } = await request.json()
    if (!path) return NextResponse.json({ error: 'Geen path' }, { status: 400 })

    await supabase.storage.from(BUCKET).remove([path])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delete-rundown-slide]', err)
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }
}
