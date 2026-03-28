import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpgradeClient } from '@/components/upgrade/UpgradeClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Plannen – CueBoard' }

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_source, plan_expires_at, plan_interval, mollie_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <UpgradeClient
      currentPlan={profile.plan as 'free' | 'pro' | 'team'}
      planSource={profile.plan_source as 'free' | 'gift' | 'paid' | null}
      planExpiresAt={profile.plan_expires_at}
      planInterval={profile.plan_interval as 'monthly' | 'yearly' | null}
      hasSubscription={!!profile.mollie_subscription_id}
    />
  )
}
