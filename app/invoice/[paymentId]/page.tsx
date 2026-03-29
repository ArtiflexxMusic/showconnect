import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getPayment } from '@/lib/mollie'
import { InvoiceDocument } from '@/components/billing/InvoiceDocument'
import type { Profile } from '@/lib/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Factuur – CueBoard' }

interface PageProps {
  params: Promise<{ paymentId: string }>
}

export default async function InvoicePage({ params }: PageProps) {
  const { paymentId } = await params

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

  // Haal betaling op uit Mollie
  let payment
  try {
    payment = await getPayment(paymentId)
  } catch {
    notFound()
  }

  // Zorg dat de betaling van deze klant is
  if (payment.customerId && profile.mollie_customer_id !== payment.customerId) {
    notFound()
  }

  return <InvoiceDocument payment={payment} profile={profile} />
}
