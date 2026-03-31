import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'

// Backward-compat: oude /cast-login?magic=TOKEN URLs worden doorgestuurd naar /green-room?magic=TOKEN
export default function CastLoginRedirect({
  searchParams,
}: {
  searchParams: { magic?: string }
}) {
  const magic = searchParams?.magic
  if (magic) {
    redirect(`/green-room?magic=${magic}`)
  }
  redirect('/green-room')
}
