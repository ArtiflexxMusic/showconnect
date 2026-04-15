import { redirect } from 'next/navigation'

// Backward-compat: oude /cast-login?magic=TOKEN URLs worden doorgestuurd naar /green-room?magic=TOKEN
export default async function CastLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ magic?: string }>
}) {
  const { magic } = await searchParams
  if (magic) {
    redirect(`/green-room?magic=${magic}`)
  }
  redirect('/green-room')
}
