import { redirect } from 'next/navigation'

// Root → middleware handelt redirect af:
// ingelogd → /dashboard, niet ingelogd → /login
export default function RootPage() {
  redirect('/login')
}
