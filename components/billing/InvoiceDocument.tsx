'use client'

import { useEffect } from 'react'
import { PLAN_LABELS } from '@/lib/plans'
import type { MolliePayment } from '@/lib/mollie'
import type { Profile } from '@/lib/types/database'

// ── Bedrijfsgegevens Artiflexx ────────────────────────────────────────────────
const SELLER = {
  tradeName:   'CueBoard',
  legalName:   'Artiflexx Music Entertainment',
  kvk:         '67929184',
  address:     'Populierenlaan 62',
  postalCity:  '1943 GH Beverwijk',
  country:     'Nederland',
  email:       'info@artiflexx.nl',
  website:     'cueboard.app',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEuro(value: number): string {
  return `€\u202F${value.toFixed(2).replace('.', ',')}`
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function invoiceNumber(paymentId: string, createdAt?: string): string {
  const date = createdAt ? new Date(createdAt) : new Date()
  const year  = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const short = paymentId.replace('tr_', '').slice(-6).toUpperCase()
  return `FACT-${year}${month}-${short}`
}

function planDescription(payment: MolliePayment): string {
  const plan     = payment.metadata?.plan
  const interval = payment.metadata?.interval
  if (plan) {
    const label    = PLAN_LABELS[plan as 'pro' | 'team'] ?? plan
    const periode  = interval === 'yearly' ? 'jaarlijks' : 'maandelijks'
    return `CueBoard ${label} – abonnement (${periode})`
  }
  return payment.description ?? 'CueBoard abonnement'
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────
interface InvoiceDocumentProps {
  payment: MolliePayment
  profile: Profile
}

export function InvoiceDocument({ payment, profile }: InvoiceDocumentProps) {
  const totalIncl = parseFloat(payment.amount.value)
  const exclBTW   = totalIncl / 1.21
  const btwAmount = totalIncl - exclBTW
  const date      = payment.paidAt ?? payment.createdAt
  const invNr     = invoiceNumber(payment.id, payment.createdAt)
  const desc      = planDescription(payment)
  const isPaid    = payment.status === 'paid'

  // Zet document-titel voor printen
  useEffect(() => {
    const prev = document.title
    document.title = `${invNr} – CueBoard`
    return () => { document.title = prev }
  }, [invNr])

  return (
    <>
      {/* Print CSS — verbergt alles behalve de factuur bij afdrukken */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; padding: 2cm 2cm !important; max-width: 100% !important; }
          @page { margin: 0; size: A4; }
        }
        @media screen {
          body { background: #f3f4f6; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <a href="/billing" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
            ← Terug naar facturen
          </a>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-700">{invNr}</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#0d4a2e] hover:bg-[#0a3a23] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Downloaden als PDF
        </button>
      </div>

      {/* Factuurpagina */}
      <div className="min-h-screen py-10 px-4">
        <div
          className="invoice-page bg-white mx-auto max-w-[794px] shadow-xl rounded-lg overflow-hidden"
          style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
        >
          {/* Header */}
          <div style={{ background: '#0d1a12', padding: '40px 48px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Logo + handelsnaam */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  {/* CueBoard logo-achtige mark */}
                  <div style={{
                    width: '32px', height: '32px', background: '#22c55e', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="3" rx="1.5" fill="white" opacity="0.9"/>
                      <rect x="3" y="10.5" width="12" height="3" rx="1.5" fill="white" opacity="0.7"/>
                      <rect x="3" y="16" width="15" height="3" rx="1.5" fill="white" opacity="0.5"/>
                    </svg>
                  </div>
                  <span style={{ color: 'white', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
                    CueBoard
                  </span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>door {SELLER.legalName}</div>
              </div>
              {/* Factuurtitel + status */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                  Factuur
                </div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 700 }}>{invNr}</div>
                {isPaid && (
                  <div style={{
                    display: 'inline-block', marginTop: '8px',
                    background: '#14532d', color: '#4ade80',
                    fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                    borderRadius: '99px', border: '1px solid #166534',
                  }}>
                    BETAALD
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Factuurinfo blokken */}
          <div style={{ padding: '36px 48px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>

              {/* Van */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                  Van
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: '#111827' }}>
                  <strong>{SELLER.tradeName}</strong><br />
                  {SELLER.legalName}<br />
                  {SELLER.address}<br />
                  {SELLER.postalCity}<br />
                  {SELLER.country}<br />
                  <span style={{ color: '#6b7280' }}>{SELLER.email}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                  KvK {SELLER.kvk}
                </div>
              </div>

              {/* Aan */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                  Aan
                </div>
                <div style={{ fontSize: '13px', lineHeight: '1.7', color: '#111827' }}>
                  <strong>{profile.full_name ?? profile.email}</strong><br />
                  <span style={{ color: '#6b7280' }}>{profile.email}</span>
                </div>
              </div>

              {/* Details */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                  Details
                </div>
                <div style={{ fontSize: '13px', lineHeight: '2', color: '#111827' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Factuurnr.</span>
                    <span style={{ fontWeight: 600 }}>{invNr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Datum</span>
                    <span>{formatDate(date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280' }}>Status</span>
                    <span style={{ color: isPaid ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                      {isPaid ? 'Betaald' : 'Openstaand'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regeloverzicht */}
          <div style={{ padding: '0 48px' }}>
            {/* Tabelkop */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              gap: '16px', padding: '14px 0', borderBottom: '2px solid #111827',
              fontSize: '10px', fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.8px',
            }}>
              <span>Omschrijving</span>
              <span style={{ textAlign: 'right' }}>Aantal</span>
              <span style={{ textAlign: 'right', minWidth: '100px' }}>Stukprijs excl.</span>
              <span style={{ textAlign: 'right', minWidth: '100px' }}>Totaal excl.</span>
            </div>

            {/* Regel */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              gap: '16px', padding: '20px 0', borderBottom: '1px solid #f3f4f6',
              fontSize: '14px', color: '#111827',
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{desc}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '3px' }}>
                  Betaald via Mollie · {payment.id}
                </div>
              </div>
              <span style={{ textAlign: 'right', alignSelf: 'center' }}>1</span>
              <span style={{ textAlign: 'right', alignSelf: 'center', minWidth: '100px', fontFamily: 'monospace' }}>
                {formatEuro(exclBTW)}
              </span>
              <span style={{ textAlign: 'right', alignSelf: 'center', minWidth: '100px', fontFamily: 'monospace' }}>
                {formatEuro(exclBTW)}
              </span>
            </div>
          </div>

          {/* Totalen */}
          <div style={{ padding: '24px 48px 40px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '260px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: '#374151' }}>
                <span>Subtotaal (excl. BTW)</span>
                <span style={{ fontFamily: 'monospace' }}>{formatEuro(exclBTW)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', color: '#374151' }}>
                <span>BTW 21%</span>
                <span style={{ fontFamily: 'monospace' }}>{formatEuro(btwAmount)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '16px', fontWeight: 700, padding: '12px 0',
                borderTop: '2px solid #111827', marginTop: '4px', color: '#111827',
              }}>
                <span>Totaal incl. BTW</span>
                <span style={{ fontFamily: 'monospace' }}>{formatEuro(totalIncl)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            background: '#f9fafb', borderTop: '1px solid #f3f4f6',
            padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              {SELLER.tradeName} · {SELLER.website} · {SELLER.email}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              KvK {SELLER.kvk}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
