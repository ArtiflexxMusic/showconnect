import { redirect } from 'next/navigation'

// Backward-compat: oude /cast/[token] URLs worden doorgestuurd naar /green-room/[token]
interface PageProps {
  params: Promise<{ token: string }>
}

export default async function CastPortalRedirect({ params }: PageProps) {
  const { token } = await params
  redirect(`/green-room/${token}`)
}
