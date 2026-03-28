import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAvailableMethods, PLAN_VARIANTS } from '@/lib/mollie'
import { CheckoutClient } from '@/components/checkout/CheckoutClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Betalen – CueBoard' }

interface Props {
  searchParams: Promise<{ variant?: string }>
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { variant: variantKey } = await searchParams

  // Ongeldig plan → terug naar upgrade
  if (!variantKey || !PLAN_VARIANTS[variantKey]) redirect('/upgrade')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const variant = PLAN_VARIANTS[variantKey]

  // Haal alle ingeschakelde betaalmethoden op (zonder bedragfilter = incl. IN3)
  let methods = await getAvailableMethods().catch(() => [])

  // Fallback: lege lijst → toon alle bekende methoden
  if (methods.length === 0) methods = []

  return (
    <CheckoutClient
      variantKey={variantKey}
      variant={variant}
      methods={methods}
    />
  )
}
