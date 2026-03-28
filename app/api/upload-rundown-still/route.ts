import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const BUCKET   = 'presentations'

const ALLOWED_TYPES: Record<string, string> = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

export const config = {
  api: { bodyParser: false },
}

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

    if (!file)      return NextResponse.json({ error: 'Geen bestand gevonden' }, { status: 400 })
    if (!rundownId) return NextResponse.json({ error: 'Geen rundownId' }, { status: 400 })

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json({
        error: `Bestandstype "${file.type || 'onbekend'}" wordt niet ondersteund. Upload een PNG, JPG of WebP.`,
      }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({
        error: `Bestand te groot (${Math.round(file.size / 1024 / 1024)} MB). Maximum is 20 MB.`,
      }, { status: 400 })
    }

    const path   = `${user.id}/still-${rundownId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('[upload-rundown-still] Storage error:', uploadErr)
      return NextResponse.json({
        error: `Upload naar storage mislukt: ${uploadErr.message}`,
      }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      url:      urlData.publicUrl,
      path,
      filename: file.name,
      size:     file.size,
    })
  } catch (err) {
    console.error('[upload-rundown-still]', err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Upload mislukt',
    }, { status: 500 })
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
    console.error('[delete-rundown-still]', err)
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }
}
