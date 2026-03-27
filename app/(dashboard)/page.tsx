import { redirect } from 'next/navigation'

// Dit bestand bestaat niet meer als actieve pagina – redirect naar /dashboard
export default function OldDashboardRoot() {
  redirect('/dashboard')
}
