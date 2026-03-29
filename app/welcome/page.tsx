import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, LayoutList, Users, Radio, Zap } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welkom bij CueBoard' }

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan')
    .eq('id', user.id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] ?? 'daar'

  const steps = [
    {
      num: '01',
      icon: LayoutList,
      title: 'Bouw je rundown',
      desc: 'Maak een show aan en voeg cues toe met type, duur, notities en media. Je eerste rundown staat in minder dan 5 minuten klaar.',
      cta: 'Nieuwe show aanmaken',
      href: '/shows/new',
      primary: true,
    },
    {
      num: '02',
      icon: Users,
      title: 'Nodig je team uit',
      desc: 'Deel een Magic Link of stuur een invite. Caller, crew en presentator — iedereen krijgt zijn eigen view.',
      cta: 'Naar dashboard',
      href: '/dashboard',
      primary: false,
    },
    {
      num: '03',
      icon: Radio,
      title: 'GO.',
      desc: 'Druk op GO. De cue gaat live. Iedereen ziet het meteen — in de browser, zonder app, zonder hardware.',
      cta: null,
      href: null,
      primary: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[#050f09] text-white flex flex-col">
      {/* Achtergrond glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/[0.04] blur-[80px]" />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Account geactiveerd
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-center font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)' }}>
            Welkom,<br />
            <span className="text-emerald-400">{firstName}.</span>
          </h1>
          <p className="text-center text-white/40 text-base leading-relaxed mb-14 max-w-md mx-auto">
            Je CueBoard-account is klaar. Volg de drie stappen hieronder om
            je eerste show live te brengen.
          </p>

          {/* Stappen */}
          <div className="space-y-0 mb-12">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex gap-6">
                {/* Verbindingslijn */}
                {i < steps.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-px bg-emerald-500/15" />
                )}
                {/* Icoon */}
                <div className="relative shrink-0 h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-500/8 flex items-center justify-center mt-1">
                  <step.icon className="h-4 w-4 text-emerald-400" />
                </div>
                {/* Content */}
                <div className="pb-10 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-emerald-400/50 uppercase tracking-widest">{step.num}</span>
                    <h3 className={`font-extrabold uppercase ${step.num === '03' ? 'text-2xl text-emerald-400' : 'text-sm text-white'}`}>
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-white/40 leading-relaxed mb-4 max-w-sm">{step.desc}</p>
                  {step.cta && step.href && (
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all uppercase tracking-wide ${
                        step.primary
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_24px_rgba(16,185,129,0.35)]'
                          : 'border border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                      }`}
                    >
                      {step.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pro upgrade banner */}
          {profile?.plan === 'free' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Meer uit CueBoard halen?</span>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">
                  Met het Team plan krijg je meerdere shows, presentatie-uploads en Companion-koppeling — vanaf €9,99/maand.
                </p>
              </div>
              <Link
                href="/upgrade"
                className="shrink-0 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition-all uppercase tracking-wider"
              >
                Plannen bekijken <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Skip link */}
          <div className="text-center mt-8">
            <Link
              href="/dashboard"
              className="text-xs text-white/20 hover:text-white/40 transition-colors underline underline-offset-2"
            >
              Doorgaan naar dashboard
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
