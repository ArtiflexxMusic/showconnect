'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Star, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Free',
    highlight: false,
    price: { monthly: '€0', yearly: '€0' },
    period: { monthly: 'voor altijd', yearly: 'voor altijd' },
    yearlyTotal: null,
    saving: null,
    desc: '3 dagen volledige toegang, daarna altijd gratis.',
    trial: '3 dagen gratis',
    cta: 'Gratis starten',
    href: { monthly: '/register', yearly: '/register' },
    features: [
      '3 dagen volledige Pro-toegang',
      '1 show',
      '1 rundown per show',
      'Tot 15 cues',
      'Caller · Presenter · Crew',
      'Realtime samenwerking',
      'Uitnodigen via link',
    ],
  },
  {
    name: 'Pro',
    highlight: true,
    price: { monthly: '€9,99', yearly: '€8,33' },
    period: { monthly: 'per maand', yearly: 'per maand' },
    yearlyTotal: '€99,99/jaar',
    saving: 'Bespaar €20',
    desc: 'Voor professionals die meerdere shows draaien.',
    trial: null,
    cta: 'Word Pro',
    href: { monthly: '/register?plan=pro', yearly: '/checkout?variant=pro_yearly' },
    features: [
      'Onbeperkt shows & rundowns',
      'Onbeperkt cues',
      'Versiegeschiedenis',
      'Cast Portal & Magic Links',
      'Presentaties & slides per cue',
      'Companion integratie',
      'Prioriteit support',
    ],
  },
  {
    name: 'Team',
    highlight: false,
    price: { monthly: '€29,99', yearly: '€25,00' },
    period: { monthly: 'per maand', yearly: 'per maand' },
    yearlyTotal: '€299,99/jaar',
    saving: 'Bespaar €60',
    desc: 'Voor AV-bureaus en productieteams.',
    trial: null,
    cta: 'Team starten',
    href: { monthly: '/register?plan=team', yearly: '/checkout?variant=team_yearly' },
    features: [
      'Alles uit Pro',
      'Tot 10 gebruikers',
      'Teambeheerpaneel',
      'Centrale show bibliotheek',
      'Mic Patch & audio beheer',
      'SSO',
      'Dedicated support',
    ],
  },
]

export function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="py-24 border-t border-white/5 bg-[#040c06]">
      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3">Prijzen</p>
          <h2 className="font-extrabold uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Eenvoudig.<br />Transparant.
          </h2>
        </div>

        {/* Maandelijks / Jaarlijks toggle */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => setYearly(false)}
            className={cn(
              'text-sm font-bold px-4 py-2 rounded-lg transition-all',
              !yearly ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/55'
            )}
          >
            Maandelijks
          </button>
          <button
            onClick={() => setYearly(true)}
            className={cn(
              'flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg transition-all',
              yearly ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/55'
            )}
          >
            Jaarlijks
            <span className="text-[10px] font-extrabold bg-emerald-500 text-black px-2 py-0.5 rounded-full uppercase tracking-wide">
              −20%
            </span>
          </button>
        </div>

        {/* Plan kaarten */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative rounded-2xl p-7 flex flex-col border transition-all',
                plan.highlight
                  ? 'border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_rgba(16,185,129,0.07)]'
                  : 'border-white/[0.06] bg-white/[0.015]'
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="flex items-center gap-1 text-[11px] font-extrabold bg-emerald-500 text-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    <Star className="h-3 w-3" /> Populairste keuze
                  </span>
                </div>
              )}
              {plan.trial && !plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="flex items-center gap-1 text-[11px] font-extrabold bg-white/10 text-white border border-white/15 px-3 py-0.5 rounded-full uppercase tracking-wide">
                    {plan.trial}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-[11px] font-bold text-white/35 uppercase tracking-[0.2em] mb-2">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-4xl font-extrabold text-white tabular-nums">
                    {yearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-sm text-white/25 mb-1 font-mono">
                    / {yearly ? plan.period.yearly : plan.period.monthly}
                  </span>
                </div>
                {/* Jaarlijkse info */}
                {yearly && plan.yearlyTotal && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/30 font-mono">{plan.yearlyTotal}</span>
                    {plan.saving && (
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                        {plan.saving}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-white/40">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/55">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={yearly ? plan.href.yearly : plan.href.monthly}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all',
                  plan.highlight
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                )}
              >
                {plan.cta} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/15 mt-6 text-center font-mono uppercase tracking-widest">
          Exclusief BTW · Jaarlijks betalen = 20% korting · Opzegbaar per periode
        </p>
      </div>
    </section>
  )
}
