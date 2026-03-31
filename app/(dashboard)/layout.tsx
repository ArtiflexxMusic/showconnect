import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/get-user'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { isTrialActive } from '@/lib/plans'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getCachedUser() deelt het resultaat met alle server components in dezelfde request
  const user = await getCachedUser()
  if (!user) redirect('/login')

  // Profiel parallel ophalen — we hebben user.id, kunnen meteen starten
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const showTrialBanner =
    profile?.plan === 'free' &&
    isTrialActive(profile?.trial_ends_at)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader user={profile} isAdmin={profile?.role === 'admin' || profile?.role === 'beheerder'} />
      {showTrialBanner && (
        <TrialBanner trialEndsAt={profile!.trial_ends_at!} />
      )}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar isAdmin={profile?.role === 'admin' || profile?.role === 'beheerder'} />
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
