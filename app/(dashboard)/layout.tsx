import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { isTrialActive } from '@/lib/plans'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Haal profiel op
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
