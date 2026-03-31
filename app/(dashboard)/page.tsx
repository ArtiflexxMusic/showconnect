import { redirect } from 'next/navigation'

// Server-side redirect — geen client JS nodig, veel sneller dan router.replace
export default function DashboardRootPage() {
  redirect('/dashboard')
}
