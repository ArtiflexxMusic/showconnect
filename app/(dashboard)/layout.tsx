import { redirect } from 'next/navigation'
import { getCachedUser } from '@/lib/supabase/get-user'
import { getCachedProfile } from '@/lib/supabase/get-profile'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { isTrialActive } from '@/lib/plans'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getCachedUser() + getCachedProfile() delen het resultaat met alle server
  // components in dezelfde request via React.cache(), dus geen dubbele query's.
  const user = await getCachedUser()
  if (!user) redirect('/login')

  const profile = await getCachedProfile()

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
