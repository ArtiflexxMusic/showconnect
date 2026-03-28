import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingPage } from '@/components/billing/BillingPage'
import { listPayments, getSubscription } from '@/lib/mollie'
import type { Profile } from '@/lib/types/database'
import type { MolliePayment, MollieSubscription } from '@/lib/mollie'

export const metadata: Metadata = { title: 'Facturen & Abonnement – CueBoard' }

export default async function BillingRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileRaw) redirect('/login')
  const profile = profileRaw as unknown as Profile

  // Haal Mollie betalingshistorie op (alleen als klant bestaat)
  let payments: MolliePayment[] = []
  let subscription: MollieSubscription | null = null

  if (profile.mollie_customer_id) {
    payments = await listPayments(profile.mollie_customer_id)

    if (profile.mollie_subscription_id) {
      try {
        subscription = await getSubscription(
          profile.mollie_customer_id,
          profile.mollie_subscription_id
        )
      } catch {
        // Abonnement bestaat niet meer in Mollie
      }
    }
  }

  return (
    <BillingPage
      profile={profile}
      payments={payments}
      subscription={subscription}
    />
  )
}
