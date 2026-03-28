import Link from 'next/link'
import {
  Radio, Users, Monitor, Smartphone, Zap, Lock,
  CheckCircle, ArrowRight, Clock, QrCode, Copy,
  ChevronRight, Star, LayoutList,
} from 'lucide-react'

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050f09]/90 backdrop-blur-md border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
          <span className="font-black text-xl tracking-tight text-white uppercase">CueBoard</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/50 uppercase tracking-widest">
          <a href="#features"      className="hover:text-white transition-colors">Features</a>
          <a href="#hoe-het-werkt" className="hover:text-white transition-colors">Hoe het werkt</a>
          <a href="#pricing"       className="hover:text-white transition-colors">Pricing</a>
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link href="/login"
            className="hidden sm:block text-sm text-white/50 hover:text-white transition-colors px-4 py-2 font-medium">
            Inloggen
          </Link>
          <Link href="/register"
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-5 py-2 rounded-lg transition-colors">
            Gratis starten <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────
// HERO — split layout, monitor mock rechts
// ─────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Achtergrond glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-emerald-500/6 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-emerald-500/4 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 w-full py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Links: tekst */}
        <div>
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live show management
          </div>

          {/* Hoofdkop */}
          <h1 className="font-black uppercase leading-[0.92] tracking-tight text-white mb-6"
              style={{ fontSize: 'clamp(3.5rem, 7vw, 5.5rem)' }}>
            Jouw
            <br />
            show.
            <br />
            <span className="text-emerald-400">Op cue.</span>
          </h1>

          <p className="text-lg text-white/50 leading-relaxed mb-10 max-w-md">
            CueBoard is het professionele rundown-systeem voor live evenementen.
            Caller, crew en presentatoren — realtime gesynchroniseerd, op elk apparaat.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/register"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-base px-8 py-3.5 rounded-xl transition-all uppercase tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]">
              Start gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium text-base px-8 py-3.5 rounded-xl transition-all">
              Inloggen
            </Link>
          </div>

          {/* Micro-stats */}
          <div className="mt-12 flex gap-8 text-sm">
            {[
              { val: '<50ms', label: 'Sync vertraging' },
              { val: '3',     label: 'View-modes' },
              { val: '∞',     label: 'Cues per show' },
            ].map(({ val, label }) => (
              <div key={label}>
                <p className="font-black text-2xl text-white font-mono">{val}</p>
                <p className="text-white/35 text-xs uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rechts: app-mock als broadcast monitor */}
        <div className="relative">
          {/* Monitor frame */}
          <div className="relative rounded-2xl overflow-hidden border border-emerald-500/15 bg-[#080f0a] shadow-[0_0_80px_rgba(16,185,129,0.08)]">
            {/* Monitor topbalk */}
            <div className="bg-[#060d08] border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span className="text-xs text-white/30 font-mono uppercase tracking-widest">Live — Avondshow 2024</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-emerald-400/70">● REC</span>
                <span className="text-[10px] font-mono text-white/20 ml-2">20:03:41</span>
              </div>
            </div>

            {/* Lege kolom headers */}
            <div className="px-4 py-1.5 border-b border-white/5 grid grid-cols-[2rem_1fr_6rem_5rem_6rem] gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
              <span>#</span>
              <span>Cue</span>
              <span>Type</span>
              <span className="text-right">Duur</span>
              <span className="text-right">Status</span>
            </div>

            {/* Cue rijen */}
            {[
              { n:'01', title:'Openingsfilm',      type:'VIDEO',     dur:'1:30', st:'done'    },
              { n:'02', title:'Welkomstwoord CEO',  type:'SPREKER',   dur:'5:00', st:'running' },
              { n:'03', title:'Productlancering',   type:'PRESENTATIE', dur:'12:00', st:'next' },
              { n:'04', title:'Pauze / netwerken',  type:'PAUZE',     dur:'15:00', st:'pending'},
              { n:'05', title:'Keynote gastspreker',type:'SPREKER',   dur:'20:00', st:'pending'},
              { n:'06', title:'Awards uitreiking',  type:'LIVE',      dur:'10:00', st:'pending'},
            ].map((cue) => (
              <div key={cue.n}
                className={`grid grid-cols-[2rem_1fr_6rem_5rem_6rem] gap-2 items-center px-4 py-2.5 border-b border-white/[0.04] text-sm ${
                  cue.st === 'running' ? 'bg-emerald-500/8 border-l-2 border-l-emerald-500' :
                  cue.st === 'done'    ? 'opacity-30' :
                  cue.st === 'next'    ? 'bg-white/[0.02]' : ''
                }`}>
                <span className="font-mono text-xs text-white/25">{cue.n}</span>
                <span className={`font-medium truncate ${cue.st === 'running' ? 'text-white' : 'text-white/60'}`}>
                  {cue.title}
                </span>
                <span className="text-[10px] text-white/25 font-mono">{cue.type}</span>
                <span className="font-mono text-xs text-white/35 text-right">{cue.dur}</span>
                <div className="flex justify-end">
                  {cue.st === 'running' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">● Live</span>
                  )}
                  {cue.st === 'next' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/40 uppercase">Next</span>
                  )}
                  {cue.st === 'done' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-white/25 uppercase">✓</span>
                  )}
                  {cue.st === 'pending' && (
                    <span className="text-[10px] text-white/15 uppercase">—</span>
                  )}
                </div>
              </div>
            ))}

            {/* GO knop onderaan */}
            <div className="px-4 py-3 flex items-center justify-between bg-[#060d08]">
              <span className="text-xs text-white/25 font-mono">Caller mode • 4 verbonden</span>
              <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm px-6 py-2 rounded-lg uppercase tracking-wider transition-colors shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                GO →
              </button>
            </div>
          </div>

          {/* Floating badge: Presenter view */}
          <div className="absolute -bottom-4 -left-4 bg-[#0a160c] border border-emerald-500/20 rounded-xl px-4 py-3 shadow-xl hidden sm:block">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Presenter view</p>
            <p className="text-sm font-bold text-white">Welkomstwoord CEO</p>
            <p className="text-xs text-emerald-400">▶ Nu live</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// FEATURES — twee kolommen, icon + tekst
// ─────────────────────────────────────────────
const FEATURES = [
  { icon: Radio,      color: 'text-emerald-400', bg: 'bg-emerald-500/10',  title: 'Caller View',               desc: 'Volledige show-controle. De caller geeft GO, volgt de voortgang en past cues aan — realtime, vanuit de browser.' },
  { icon: Monitor,    color: 'text-white',        bg: 'bg-white/5',         title: 'Presenter View',             desc: 'Schoon, groot scherm met de huidige en volgende cue. Geen inlog, geen afleiding — direct via QR-code.' },
  { icon: Smartphone, color: 'text-white/60',     bg: 'bg-white/5',         title: 'Crew View',                  desc: 'Technici en stagemanagers volgen alles op hun eigen apparaat en laten notities achter zonder de flow te verstoren.' },
  { icon: Zap,        color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  title: 'Realtime — geen F5',         desc: 'Alle cue-updates zijn in minder dan 50ms zichtbaar voor iedereen. Supabase Realtime houdt elk scherm synchroon.' },
  { icon: Users,      color: 'text-white/60',     bg: 'bg-white/5',         title: 'Rollen & toegang',           desc: 'Owner, Editor, Caller, Crew, Presenter of Viewer. Iedereen krijgt precies de juiste weergave en rechten.' },
  { icon: Clock,      color: 'text-white/60',     bg: 'bg-white/5',         title: 'Tijdberekening',             desc: 'Voer een aanvangstijd in en CueBoard toont per cue wanneer die verwacht begint. Altijd grip op de klok.' },
  { icon: QrCode,     color: 'text-emerald-400',  bg: 'bg-emerald-500/10',  title: 'QR-codes',                   desc: 'Genereer direct een QR voor elke view-link. Scan met je telefoon en je bent live — zonder typen of inloggen.' },
  { icon: Lock,       color: 'text-white/60',     bg: 'bg-white/5',         title: 'Vergrendelen & snapshots',   desc: 'Slot de rundown tijdens de show en sla versies op als snapshot. Herstel met één klik naar een eerdere staat.' },
  { icon: Copy,       color: 'text-white/60',     bg: 'bg-white/5',         title: 'Templates & dupliceren',     desc: 'Bewaar rundowns als herbruikbaar template of kopieer een complete show voor een volgende editie.' },
]

function Features() {
  return (
    <section id="features" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.25em] mb-3">Wat je krijgt</p>
          <h2 className="font-black uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Alles wat een<br />professionele show vraagt.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className={`bg-[#050f09] p-6 hover:bg-[#071409] transition-colors ${i === 0 || i === 3 || i === 6 ? 'border-l-2 border-l-emerald-500/40' : ''}`}>
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${f.bg} mb-4`}>
                <f.icon className={`h-4.5 w-4.5 ${f.color}`} style={{ width: '1.125rem', height: '1.125rem' }} />
              </div>
              <h3 className="font-bold text-white mb-1.5 text-sm uppercase tracking-wide">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// HOE HET WERKT — verticale timeline
// ─────────────────────────────────────────────
const STEPS = [
  { num: '01', icon: LayoutList, title: 'Bouw je rundown', desc: 'Maak een show aan, voeg cues toe met titel, type, duur en notities. Begin blanco of laad een van je eigen templates.' },
  { num: '02', icon: Users,      title: 'Nodig je team uit', desc: 'Deel een link of stuur een e-mail. Iedereen krijgt de rol die bij hem past — caller, crew, presenter of viewer.' },
  { num: '03', icon: Radio,      title: 'GO', desc: 'De caller drukt op GO. De presentator ziet zijn cue. De crew volgt mee. Alles in realtime, zonder extra hardware of installatie.' },
]

function HowItWorks() {
  return (
    <section id="hoe-het-werkt" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Links: tekst */}
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.25em] mb-3">Workflow</p>
            <h2 className="font-black uppercase text-white leading-tight mb-12" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Van voorbereiding<br />tot applaus.
            </h2>

            <div className="space-y-0">
              {STEPS.map((step, i) => (
                <div key={step.num} className="relative flex gap-6">
                  {/* Lijn */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-emerald-500/15" />
                  )}
                  {/* Nummer-cirkel */}
                  <div className="relative shrink-0 h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center mt-1">
                    <step.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="pb-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-widest">{step.num}</span>
                      <h3 className={`font-black uppercase text-white ${step.num === '03' ? 'text-2xl text-emerald-400' : 'text-base'}`}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-white/45 leading-relaxed max-w-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rechts: quote/call-out */}
          <div className="relative">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-10">
              <p className="text-5xl font-black text-emerald-400 mb-4 leading-none">&ldquo;</p>
              <p className="text-xl font-bold text-white leading-relaxed mb-6">
                Geen gedoe met WhatsApp, printjes of handgebaren.
                Iedereen weet wat er nu is. Wat er daarna komt. En wanneer te gaan.
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Show Caller</p>
                  <p className="text-xs text-white/35">Live event productie</p>
                </div>
              </div>
            </div>
            {/* Decoratief */}
            <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]" />
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free',
    price: '€0',
    period: 'voor altijd',
    desc: 'Probeer CueBoard zonder risico.',
    highlight: false,
    cta: 'Gratis starten',
    href: '/register',
    features: ['3 shows', '1 rundown per show', 'Tot 30 cues', 'Caller · Presenter · Crew view', 'Realtime samenwerking', 'Uitnodigen via link'],
  },
  {
    name: 'Pro',
    price: '€12',
    period: 'per maand',
    desc: 'Voor professionals die meerdere shows draaien.',
    highlight: true,
    cta: 'Pro proberen',
    href: '/register?plan=pro',
    features: ['Onbeperkt shows & rundowns', 'Onbeperkt cues', 'Versiegeschiedenis', 'E-mail uitnodigingen', 'Templates bibliotheek', 'Companion integratie', 'Prioriteit support'],
  },
  {
    name: 'Team',
    price: '€39',
    period: 'per maand',
    desc: 'Voor AV-bureaus en productieteams.',
    highlight: false,
    cta: 'Contact opnemen',
    href: 'mailto:info@artiflexx.nl',
    features: ['Alles uit Pro', 'Tot 10 gebruikers', 'Teambeheerpaneel', 'Centrale show bibliotheek', 'SSO', 'Dedicated support'],
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.25em] mb-3">Prijzen</p>
          <h2 className="font-black uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Eenvoudig.<br />Transparant.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col border ${
                plan.highlight
                  ? 'border-emerald-500/40 bg-emerald-500/8 shadow-[0_0_60px_rgba(16,185,129,0.08)]'
                  : 'border-white/5 bg-white/[0.02]'
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="flex items-center gap-1 text-[11px] font-black bg-emerald-500 text-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    <Star className="h-3 w-3" /> Populairste keuze
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-white/30 mb-1 font-mono">/ {plan.period}</span>
                </div>
                <p className="text-sm text-white/45">{plan.desc}</p>
              </div>

              <ul className="space-y-2 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.href}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all ${
                  plan.highlight
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                }`}>
                {plan.cta} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20 mt-6 text-center font-mono uppercase tracking-widest">
          Exclusief BTW · Jaarlijks betalen = 20% korting
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// CTA SLOT
// ─────────────────────────────────────────────
function CtaSlot() {
  return (
    <section className="py-32 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative rounded-3xl border border-emerald-500/15 bg-emerald-500/5 overflow-hidden px-8 py-16 text-center">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-emerald-500/15 blur-[80px]" />
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-4">Klaar?</p>
            <h2 className="font-black uppercase text-white mb-6" style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>
              GO.
            </h2>
            <p className="text-lg text-white/45 mb-10 max-w-md mx-auto">
              Maak gratis een account aan. Je eerste rundown staat in minder dan 5 minuten klaar.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-lg px-10 py-4 rounded-2xl uppercase tracking-wide transition-all shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.6)]">
              Gratis beginnen <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-black text-white uppercase tracking-tight">CueBoard</span>
        </div>
        <div className="flex items-center gap-6 text-xs font-medium text-white/30 uppercase tracking-widest">
          <Link href="/login"    className="hover:text-white transition-colors">Inloggen</Link>
          <Link href="/register" className="hover:text-white transition-colors">Registreren</Link>
          <a href="mailto:info@artiflexx.nl" className="hover:text-white transition-colors">Contact</a>
        </div>
        <p className="text-xs text-white/15 font-mono">
          © {new Date().getFullYear()} Artiflexx
        </p>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050f09] text-white antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaSlot />
      </main>
      <Footer />
    </div>
  )
}
