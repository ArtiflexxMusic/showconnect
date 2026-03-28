/**
 * Mollie API – lightweight fetch-based client
 *
 * Geen externe SDK nodig; alle aanroepen gaan via de Mollie REST API v2.
 * Docs: https://docs.mollie.com/reference/v2
 */

import type { Plan, PlanInterval } from '@/lib/plans'

const MOLLIE_BASE = 'https://api.mollie.com/v2'

function getApiKey(): string {
  const key = process.env.MOLLIE_API_KEY
  if (!key) throw new Error('MOLLIE_API_KEY is niet ingesteld')
  return key
}

async function mollieRequest<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${MOLLIE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    // Geen cache voor betalingen
    cache: 'no-store',
  })

  const data = await res.json()

  if (!res.ok) {
    const msg = (data as { detail?: string; title?: string })?.detail
      ?? (data as { title?: string })?.title
      ?? `Mollie API fout (${res.status})`
    throw new Error(msg)
  }

  return data as T
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MollieCustomer {
  id: string
  name: string
  email: string
}

export interface MolliePayment {
  id: string
  status: 'open' | 'canceled' | 'pending' | 'authorized' | 'expired' | 'failed' | 'paid'
  sequenceType: 'oneoff' | 'first' | 'recurring'
  customerId?: string
  mandateId?: string
  subscriptionId?: string
  amount: { currency: string; value: string }
  metadata?: Record<string, string>
  _links: {
    checkout?: { href: string }
    self: { href: string }
  }
}

export interface MollieMethod {
  id: string
  description: string
  image: {
    size1x: string
    size2x: string
    svg:    string
  }
  minimumAmount?: { value: string; currency: string }
  maximumAmount?: { value: string; currency: string } | null
}

export interface MollieSubscription {
  id: string
  customerId: string
  status: 'pending' | 'active' | 'canceled' | 'suspended' | 'completed'
  amount: { currency: string; value: string }
  interval: string
  nextPaymentDate?: string
}

// ─── Plan configuratie ─────────────────────────────────────────────────────────

export interface PlanVariant {
  plan: Plan
  interval: PlanInterval
  amount: string          // "9.95" – Mollie verwacht string met punt
  description: string
  mollieInterval: string  // "1 month" of "1 year"
}

export const PLAN_VARIANTS: Record<string, PlanVariant> = {
  pro_monthly: {
    plan: 'pro', interval: 'monthly',
    amount: '9.95', description: 'CueBoard Pro – maandelijks',
    mollieInterval: '1 month',
  },
  pro_yearly: {
    plan: 'pro', interval: 'yearly',
    amount: '99.99', description: 'CueBoard Pro – jaarlijks',
    mollieInterval: '1 year',
  },
  team_monthly: {
    plan: 'team', interval: 'monthly',
    amount: '29.99', description: 'CueBoard Team – maandelijks',
    mollieInterval: '1 month',
  },
  team_yearly: {
    plan: 'team', interval: 'yearly',
    amount: '299.99', description: 'CueBoard Team – jaarlijks',
    mollieInterval: '1 year',
  },
}

// ─── API helpers ───────────────────────────────────────────────────────────────

/**
 * Haal beschikbare betaalmethoden op voor het Mollie-account.
 * Geen bedragfilter zodat alle ingeschakelde methoden terugkomen (incl. IN3).
 * locale=nl_NL zorgt voor Nederlandse namen.
 */
export async function getAvailableMethods(): Promise<MollieMethod[]> {
  const params = new URLSearchParams({
    sequenceType: 'oneoff',
    locale:       'nl_NL',
  })
  const data = await mollieRequest<{
    _embedded?: { methods: MollieMethod[] }
    count:      number
  }>('GET', `/methods?${params.toString()}`)
  return data._embedded?.methods ?? []
}

/** Maak of haal een Mollie klant op */
export async function createCustomer(name: string, email: string): Promise<MollieCustomer> {
  return mollieRequest<MollieCustomer>('POST', '/customers', { name: name || email, email })
}

/**
 * Maak een betaling aan voor planactivatie.
 * Gebruikt sequenceType 'oneoff' zodat alle betaalmethoden werken (iDEAL, creditcard, etc.).
 */
export async function createFirstPayment(opts: {
  customerId:  string
  variant:     PlanVariant
  redirectUrl: string
  webhookUrl:  string
  userId:      string
  method?:     string   // bijv. 'ideal' | 'bancontact' | 'applepay' | 'in3' | 'directdebit' | 'creditcard'
}): Promise<MolliePayment> {
  const body: Record<string, unknown> = {
    amount:       { currency: 'EUR', value: opts.variant.amount },
    customerId:   opts.customerId,
    sequenceType: 'oneoff',
    description:  opts.variant.description,
    redirectUrl:  opts.redirectUrl,
    webhookUrl:   opts.webhookUrl,
    metadata: {
      userId:   opts.userId,
      plan:     opts.variant.plan,
      interval: opts.variant.interval,
    },
  }
  if (opts.method) body.method = opts.method
  return mollieRequest<MolliePayment>('POST', '/payments', body)
}

/** Haal een betaling op */
export async function getPayment(id: string): Promise<MolliePayment> {
  return mollieRequest<MolliePayment>('GET', `/payments/${id}`)
}

/** Haal betalingsgeschiedenis op voor een klant (max 50 recentste) */
export async function listPayments(customerId: string): Promise<MolliePayment[]> {
  try {
    const data = await mollieRequest<{
      _embedded?: { payments: MolliePayment[] }
      count: number
    }>('GET', `/payments?customerId=${customerId}&limit=50&sort=desc`)
    return data._embedded?.payments ?? []
  } catch {
    return []
  }
}

/** Maak een terugkerend abonnement aan na de eerste betaling */
export async function createSubscription(opts: {
  customerId: string
  variant: PlanVariant
  webhookUrl: string
  startDate: string   // ISO datum "YYYY-MM-DD" – wanneer het eerste terugkerende bedrag afgeschreven wordt
  userId: string
}): Promise<MollieSubscription> {
  return mollieRequest<MollieSubscription>(
    'POST',
    `/customers/${opts.customerId}/subscriptions`,
    {
      amount:      { currency: 'EUR', value: opts.variant.amount },
      interval:    opts.variant.mollieInterval,
      description: opts.variant.description,
      webhookUrl:  opts.webhookUrl,
      startDate:   opts.startDate,
      metadata: {
        userId:   opts.userId,
        plan:     opts.variant.plan,
        interval: opts.variant.interval,
      },
    }
  )
}

/** Opzeg abonnement */
export async function cancelSubscription(customerId: string, subscriptionId: string): Promise<void> {
  await mollieRequest('DELETE', `/customers/${customerId}/subscriptions/${subscriptionId}`)
}

/** Haal abonnement op */
export async function getSubscription(customerId: string, subscriptionId: string): Promise<MollieSubscription> {
  return mollieRequest<MollieSubscription>('GET', `/customers/${customerId}/subscriptions/${subscriptionId}`)
}

/** Voeg het aantal periodes toe aan een datum en geef de volgende vervaldatum terug */
export function nextExpiryDate(interval: PlanInterval): Date {
  const d = new Date()
  if (interval === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  } else {
    d.setFullYear(d.getFullYear() + 1)
  }
  return d
}

/** Zet datum om naar "YYYY-MM-DD" voor Mollie startDate */
export function toMollieDate(date: Date): string {
  return date.toISOString().split('T')[0]
}
