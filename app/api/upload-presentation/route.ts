import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { rateLimit, getIp } from '@/lib/rate-limit'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED  = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
const BUCKET   = 'presentations'

export async function POST(request: NextRequest) {
  // Rate limit: max 15 presentation uploads per minute per IP
  const rl = rateLimit(`presentation-upload:${getIp(request)}`, { limit: 15, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Te veel uploads. Probeer het over een minuut opnieuw.' }, { status: 429 })
  }

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const cueId    = formData.get('cueId') as string | null

    if (!file)  return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })
    if (!cueId) return NextResponse.json({ error: 'Geen cueId' },   { status: 400 })

    if (!ALLOWED.includes(file.type))
      return NextResponse.json({ error: 'Alleen PDF en PPTX zijn toegestaan' }, { status: 400 })

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'Bestand te groot (max 50 MB)' }, { status: 400 })

    const ext      = file.type === 'application/pdf' ? 'pdf' : 'pptx'
    const path     = `${user.id}/${cueId}.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())

    // Upload naar Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    // Publieke URL ophalen
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      url:      urlData.publicUrl,
      path,
      type:     ext as 'pdf' | 'pptx',
      filename: file.name,
      size:     file.size,
    })
  } catch (err) {
    console.error('[upload-presentation]', err)
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

    await supabase.storage.from('presentations').remove([path])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delete-presentation]', err)
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }
}
