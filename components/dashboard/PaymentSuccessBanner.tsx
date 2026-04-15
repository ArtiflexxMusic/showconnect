'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

interface Props {
  plan: string | null
  interval: string | null
}

const PLAN_LABELS: Record<string, string> = { pro: 'Team', team: 'Business' }

export function PaymentSuccessBanner({ plan, interval }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const planLabel = plan && PLAN_LABELS[plan] ? PLAN_LABELS[plan] : 'betaalde'
  const intervalLabel = interval === 'monthly' ? 'per maand' : interval === 'yearly' ? 'per jaar' : ''

  // Verwijder de query params uit de URL zodat een refresh de banner niet opnieuw toont
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    url.searchParams.delete('plan')
    url.searchParams.delete('interval')
    window.history.replaceState({}, '', url.toString())
  }, [router])

  if (!open) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-emerald-300">Betaling ontvangen — bedankt!</p>
        <p className="text-emerald-200/80 mt-0.5">
          Je {planLabel}-plan {intervalLabel} is direct geactiveerd. Een bevestiging is naar je inbox onderweg.
        </p>
      </div>
      <button
        onClick={() => setOpen(false)}
        className="text-emerald-300/60 hover:text-emerald-300 transition-colors"
        aria-label="Sluiten"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
