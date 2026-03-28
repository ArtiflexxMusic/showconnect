import Link from 'next/link'
import {
  Radio, Users, Monitor, Smartphone, Zap, Lock,
  CheckCircle, ArrowRight, Play, Clock, QrCode,
  LayoutList, Bell, Copy, ChevronRight, Star,
} from 'lucide-react'

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#07070f]/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Radio className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">CueBoard</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#hoe-het-werkt" className="hover:text-white transition-colors">Hoe het werkt</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
          >
            Inloggen
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Gratis starten
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      {/* Achtergrond glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="h-[600px] w-[900px] rounded-full bg-indigo-600/10 blur-[120px] -translate-y-1/4" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <Zap className="h-3.5 w-3.5" />
          Realtime show management voor live events
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.08] mb-6">
          Elke cue op tijd.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            Elke show perfect.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
          CueBoard is de professionele rundown-tool voor live evenementen. Caller, crew en presenter
          werken realtime samen — vanaf elk apparaat, zonder gedoe.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/50"
          >
            Gratis beginnen <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/70 hover:text-white px-8 py-3.5 rounded-xl font-medium text-base transition-all"
          >
            <Play className="h-4 w-4" /> Inloggen
          </Link>
        </div>

        {/* Mock rundown preview */}
        <div className="mt-20 relative mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-[#0e0e1a] shadow-2xl overflow-hidden">
            {/* Toolbar mock */}
            <div className="border-b border-white/5 bg-[#0a0a14] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
                <Radio className="h-3 w-3 text-green-400" />
                Live — 3 verbonden
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded bg-white/5" />
                <div className="h-6 w-20 rounded bg-indigo-600/40" />
              </div>
            </div>
            {/* Cue rijen */}
            <div className="divide-y divide-white/5">
              {[
                { num: '01', title: 'Intro video', type: 'Video', duration: '0:45', status: 'done', color: 'bg-blue-500' },
                { num: '02', title: 'Welkomstwoord CEO', type: 'Spreker', duration: '5:00', status: 'running', color: 'bg-green-500' },
                { num: '03', title: 'Productpresentatie', type: 'Presentatie', duration: '15:00', status: 'pending', color: 'bg-violet-500' },
                { num: '04', title: 'Pauze muziek', type: 'Audio', duration: '10:00', status: 'pending', color: 'bg-yellow-500' },
                { num: '05', title: 'Panel discussie', type: 'Live', duration: '20:00', status: 'pending', color: 'bg-indigo-500' },
              ].map((cue) => (
                <div
                  key={cue.num}
                  className={`flex items-center gap-4 px-5 py-3 text-sm ${
                    cue.status === 'running' ? 'bg-green-500/5' :
                    cue.status === 'done'    ? 'opacity-40' : ''
                  }`}
                >
                  <div className={`h-4 w-1 rounded-full shrink-0 ${cue.color}`} />
                  <span className="font-mono text-xs text-white/30 w-5">{cue.num}</span>
                  <span className={`flex-1 font-medium text-left ${cue.status === 'running' ? 'text-white' : 'text-white/70'}`}>
                    {cue.title}
                  </span>
                  <span className="text-xs text-white/30 w-24 text-left hidden sm:block">{cue.type}</span>
                  <span className="font-mono text-xs text-white/40 w-10 text-right">{cue.duration}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    cue.status === 'running' ? 'bg-green-500/20 text-green-400' :
                    cue.status === 'done'    ? 'bg-white/5 text-white/30' :
                                               'bg-white/5 text-white/40'
                  }`}>
                    {cue.status === 'running' ? '● Live' : cue.status === 'done' ? 'Klaar' : 'Wacht'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Glow onder de mock */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 h-32 w-3/4 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Radio,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    title: 'Caller View',
    desc: 'De regisseur ziet alle cues in realtime, geeft GO en beheert de voortgang van de volledige show.',
  },
  {
    icon: Monitor,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    title: 'Presenter View',
    desc: 'Een schone weergave van de huidige en volgende cue — op elk scherm, zonder inlog.',
  },
  {
    icon: Smartphone,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Crew View',
    desc: 'Technici volgen de rundown op hun eigen apparaat en kunnen notities achterlaten.',
  },
  {
    icon: Zap,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    title: 'Realtime sync',
    desc: 'Alle wijzigingen zijn direct zichtbaar voor iedereen. Geen F5, geen vertraging.',
  },
  {
    icon: Users,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    title: 'Rollen & toegang',
    desc: 'Owner, Editor, Caller, Crew, Presenter, Viewer — iedereen ziet precies wat hij nodig heeft.',
  },
  {
    icon: Clock,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    title: 'Tijdplanning',
    desc: 'Voer een aanvangstijd in en CueBoard berekent automatisch de verwachte starttijd per cue.',
  },
  {
    icon: QrCode,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    title: 'QR-codes',
    desc: 'Deel links razendsnel via QR. Scan en je zit direct in de Presenter of Crew view.',
  },
  {
    icon: Lock,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    title: 'Vergrendelen & snapshots',
    desc: 'Vergrendel de rundown tijdens de show en sla tussentijdse versies op als snapshot.',
  },
  {
    icon: Copy,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    title: 'Templates & dupliceren',
    desc: 'Sla rundowns op als template of dupliceer een show in één klik voor een volgende editie.',
  },
]

function Features() {
  return (
    <section id="features" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">Features</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Alles wat je nodig hebt voor een vlekkeloze show
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Van de eerste cue tot het slotapplaus — CueBoard houdt iedereen op één lijn.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.bg} mb-4`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Hoe het werkt ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    icon: LayoutList,
    title: 'Maak je show aan',
    desc: 'Voeg een show toe, maak een rundown en vul je cues in — met titel, type, duur en notities. Gebruik een template of begin blanco.',
  },
  {
    num: '02',
    icon: Users,
    title: 'Nodig je team uit',
    desc: 'Stuur een uitnodigingslink of e-mail naar je caller, crew en presentatoren. Iedereen krijgt precies de juiste toegang.',
  },
  {
    num: '03',
    icon: Bell,
    title: 'Run de show',
    desc: 'De caller drukt GO, de presentator ziet zijn cue, de crew volgt mee. Alles in realtime, zonder extra hardware.',
  },
]

function HowItWorks() {
  return (
    <section id="hoe-het-werkt" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">Hoe het werkt</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            In drie stappen live
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Geen installatie, geen IT-afdeling. Open je browser en je bent klaar.
          </p>
        </div>

        <div className="relative">
          {/* Verbindingslijn desktop */}
          <div className="hidden md:block absolute top-[27px] left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {STEPS.map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="h-[56px] w-[56px] rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold text-indigo-300 bg-indigo-900/80 border border-indigo-500/40 rounded-full px-1.5 py-0.5">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-3">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free',
    price: '€0',
    period: 'voor altijd',
    desc: 'Perfect om te ontdekken of CueBoard bij je past.',
    highlight: false,
    cta: 'Gratis starten',
    href: '/register',
    features: [
      '3 shows',
      '1 rundown per show',
      'Tot 30 cues per rundown',
      'Caller, Presenter & Crew view',
      'Realtime samenwerking',
      'Uitnodigen via link',
    ],
  },
  {
    name: 'Pro',
    price: '€12',
    period: 'per maand',
    desc: 'Voor professionals en freelancers die meerdere shows draaien.',
    highlight: true,
    cta: 'Pro proberen',
    href: '/register?plan=pro',
    features: [
      'Onbeperkt shows',
      'Onbeperkt rundowns',
      'Onbeperkt cues',
      'Versiegeschiedenis & snapshots',
      'E-mail uitnodigingen',
      'Templates bibliotheek',
      'Bitfocus Companion integratie',
      'Prioriteit support',
    ],
  },
  {
    name: 'Team',
    price: '€39',
    period: 'per maand',
    desc: 'Voor AV-bureaus en productieteams die samenwerken.',
    highlight: false,
    cta: 'Contact opnemen',
    href: 'mailto:info@artiflexx.nl',
    features: [
      'Alles uit Pro',
      'Tot 10 gebruikers inbegrepen',
      'Teambeheerpaneel',
      'Centrale show bibliotheek',
      'SSO / Single Sign-On',
      'Dedicated support',
    ],
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Eenvoudige, transparante prijzen
          </h2>
          <p className="text-white/50 max-w-xl mx-auto">
            Start gratis. Upgrade wanneer je klaar bent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? 'border-indigo-500/50 bg-indigo-950/40 shadow-xl shadow-indigo-900/20'
                  : 'border-white/8 bg-white/[0.02]'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded-full">
                    <Star className="h-3 w-3" /> Meest gekozen
                  </span>
                </div>
              )}
              <div className="mb-6">
                <p className="text-sm font-semibold text-white/60 mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/40 mb-1">/{plan.period}</span>
                </div>
                <p className="text-sm text-white/50">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
                    : 'border border-white/10 hover:border-white/20 text-white/80 hover:text-white'
                }`}
              >
                {plan.cta} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-white/30 mt-8">
          Alle prijzen zijn excl. BTW. Jaarlijks betalen geeft 20% korting.
        </p>
      </div>
    </section>
  )
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
function CtaBanner() {
  return (
    <section className="py-24 border-t border-white/5">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/30 p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar voor je eerste show?
          </h2>
          <p className="text-white/50 mb-8 text-lg">
            Maak gratis een account aan en heb je eerste rundown in minder dan 5 minuten klaar.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-semibold text-base transition-all shadow-lg shadow-indigo-900/40"
          >
            Gratis beginnen <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Radio className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white">CueBoard</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/40">
          <Link href="/login" className="hover:text-white/70 transition-colors">Inloggen</Link>
          <Link href="/register" className="hover:text-white/70 transition-colors">Registreren</Link>
          <a href="mailto:info@artiflexx.nl" className="hover:text-white/70 transition-colors">Contact</a>
        </div>
        <p className="text-sm text-white/20">© {new Date().getFullYear()} Artiflexx. Alle rechten voorbehouden.</p>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070f] text-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  )
}
