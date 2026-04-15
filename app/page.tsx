// Statisch gegenereerd bij build — geen server-rendering per request nodig.
// Vercel serveert dit als een CDN-bestand: razendsnel overal ter wereld.
export const dynamic = 'force-static'

import Link from 'next/link'
import {
  Radio, Users, Monitor, Smartphone, Zap, Lock,
  CheckCircle, ArrowRight, Clock, QrCode,
  ChevronRight, Star, LayoutList, Mic, Link2,
  ShieldCheck, Layers, BarChart2, Volume2,
} from 'lucide-react'
import { FeatureSlideshow } from '@/components/landing/FeatureSlideshow'
import { PricingSection } from '@/components/landing/PricingSection'

// ─────────────────────────────────────────────
// LOGO COMPONENT (herbruikbaar)
// ─────────────────────────────────────────────
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dot = size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5'
  const text = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base'
  return (
    <div className="flex items-center gap-2.5">
      <span className={`inline-block ${dot} rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.55)]`} />
      <span className={`font-extrabold ${text} tracking-tight text-white uppercase leading-none`}>Cue<span className="text-emerald-400">Board</span></span>
    </div>
  )
}

// ─────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050f09]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Logo />
        <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-white/40 uppercase tracking-[0.18em]">
          <a href="#views"    className="hover:text-white transition-colors">Views</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/green-room" className="hidden sm:flex items-center gap-1.5 text-xs text-white/40 hover:text-emerald-400 transition-colors px-4 py-2 font-semibold uppercase tracking-wider border border-white/10 hover:border-emerald-500/40 rounded-lg">
            Green Room
          </Link>
          <Link href="/login" className="hidden sm:block text-xs text-white/40 hover:text-white transition-colors px-4 py-2 font-semibold uppercase tracking-wider">
            Inloggen
          </Link>
          <a href="#pricing" className="md:hidden text-xs text-white/40 hover:text-emerald-400 transition-colors px-3 py-2 font-semibold uppercase tracking-wider">
            Prijzen
          </a>
          <Link href="/register" className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider">
            Gratis starten <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─────────────────────────────────────────────
// HERO — full broadcast control room feel
// ─────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden bg-[#050f09]">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(52,211,153,1) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
      {/* Glow orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/4 h-[600px] w-[600px] rounded-full bg-emerald-500/[0.055] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 w-full py-24 flex flex-col items-center text-center gap-8">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Show OS · Real-time
        </div>

        {/* Headline */}
        <h1 className="font-extrabold uppercase text-white leading-[0.9] tracking-tight"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 7.5rem)' }}>
          Elke cue.<br />
          <span className="text-emerald-400">Precies op tijd.</span>
        </h1>

        <p className="text-lg text-white/45 leading-relaxed max-w-2xl">
          CueBoard is het volledige besturingssysteem voor live events.
          Van caller tot cast, van rundown tot mic-patch —
          alles realtime gesynchroniseerd in één dashboard.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/register"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-8 py-3.5 rounded-xl transition-all uppercase tracking-wide shadow-[0_0_40px_rgba(16,185,129,0.35)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5)]">
            Gratis starten <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login"
            className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-sm font-medium px-8 py-3.5 rounded-xl transition-all">
            Inloggen
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center justify-center gap-8 pt-4 text-center">
          {[
            { val: '<50ms', label: 'Realtime sync' },
            { val: '6',     label: 'Rollen & views' },
            { val: '∞',     label: 'Cues per show' },
            { val: '100%',  label: 'Browser-based' },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="font-extrabold text-2xl text-white font-mono tabular-nums">{val}</span>
              <span className="text-white/30 text-xs uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>

        {/* Big dashboard mockup */}
        <div className="w-full max-w-5xl mt-8">
          <div className="relative rounded-2xl overflow-hidden border border-emerald-500/15 bg-[#060d08] shadow-[0_0_100px_rgba(16,185,129,0.07),0_40px_80px_rgba(0,0,0,0.6)]">

            {/* Top bar */}
            <div className="bg-[#040a06] border-b border-white/5 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span className="text-xs text-white/30 font-mono uppercase tracking-widest">CueBoard · Gala Avondshow 2025</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-emerald-400/70 font-mono">● LIVE</span>
                <span className="text-[11px] font-mono text-white/20">20:41:09</span>
                <span className="text-[11px] font-mono text-white/15 border border-white/10 px-2 py-0.5 rounded">4 verbonden</span>
              </div>
            </div>

            {/* Column headers */}
            <div className="px-5 py-2 border-b border-white/5 grid grid-cols-[2.5rem_1fr_7rem_5rem_7rem] gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
              <span>#</span><span>Cue</span><span>Type</span><span className="text-right">Duur</span><span className="text-right">Status</span>
            </div>

            {/* Cue rows */}
            {[
              { n:'01', title:'Openingsfilm + intro VJ',  type:'Video',      dur:'02:00', st:'done'    },
              { n:'02', title:'Welkomstwoord — CEO',      type:'Spreker',    dur:'06:00', st:'done'    },
              { n:'03', title:'Productonthulling + Q&A',  type:'Presentatie',dur:'14:00', st:'running', time:'08:42', pct:62 },
              { n:'04', title:'Pauze & netwerken',        type:'Pauze',      dur:'20:00', st:'next'    },
              { n:'05', title:'Keynote gastspreker',      type:'Spreker',    dur:'25:00', st:'pending' },
              { n:'06', title:'Awards uitreiking',        type:'Live',       dur:'12:00', st:'pending' },
            ].map((cue) => (
              <div key={cue.n}
                className={`grid grid-cols-[2.5rem_1fr_7rem_5rem_7rem] gap-3 items-center px-5 py-3 border-b border-white/[0.04] text-sm ${
                  cue.st === 'running' ? 'bg-emerald-500/[0.07]' :
                  cue.st === 'done'    ? 'opacity-25' :
                  cue.st === 'next'    ? 'bg-white/[0.015]' : ''
                } ${cue.st === 'running' ? 'border-l-2 border-l-emerald-500/60' : ''}`}>
                <span className="font-mono text-xs text-white/25">{cue.n}</span>
                <div className="min-w-0">
                  <span className={`font-medium truncate block ${cue.st === 'running' ? 'text-white' : 'text-white/55'}`}>{cue.title}</span>
                  {cue.st === 'running' && cue.pct !== undefined && (
                    <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden w-full">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${cue.pct}%` }} />
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-white/25 font-mono uppercase">{cue.type}</span>
                <span className="font-mono text-xs text-white/30 text-right">
                  {cue.st === 'running' && cue.time ? <span className="text-emerald-400 font-bold">{cue.time}</span> : cue.dur}
                </span>
                <div className="flex justify-end">
                  {cue.st === 'running' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 uppercase tracking-wide">● Live</span>}
                  {cue.st === 'next'    && <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-white/5 text-white/40 uppercase">→ Next</span>}
                  {cue.st === 'done'    && <span className="text-[11px] px-2 text-white/20">✓</span>}
                  {cue.st === 'pending' && <span className="text-[11px] text-white/15">—</span>}
                </div>
              </div>
            ))}

            {/* Control bar */}
            <div className="px-5 py-4 flex items-center justify-between bg-[#040a06] border-t border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/20 font-mono uppercase tracking-widest">Caller mode</span>
                <span className="text-xs text-white/15">·</span>
                <span className="text-xs text-emerald-400/50 font-mono">Resterende tijd: -52:00</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs text-white/20 border border-white/10 px-4 py-2 rounded-lg font-medium hover:border-white/20 transition-colors">
                  ← Vorige
                </button>
                <button className="bg-emerald-500 text-black font-extrabold text-sm px-8 py-2.5 rounded-xl uppercase tracking-wider shadow-[0_0_24px_rgba(16,185,129,0.45)]">
                  GO →
                </button>
                <button className="text-xs text-yellow-500/50 border border-yellow-500/15 px-4 py-2 rounded-lg font-medium">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// VIEWS STRIP — de drie schermen
// ─────────────────────────────────────────────
function ViewsStrip() {
  return (
    <section id="views" className="py-24 bg-[#040c06]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3">Elk scherm. Elke rol.</p>
          <h2 className="font-extrabold uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Één systeem.<br />Drie views.
          </h2>
          <p className="text-white/35 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            Caller, presenter en crew — iedereen ziet precies wat hij nodig heeft.
            Geopend in de browser, via link of QR.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Caller View */}
          <div className="rounded-2xl overflow-hidden border border-emerald-500/20 bg-[#050f09] flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Caller View</span>
              <span className="ml-auto text-[10px] font-mono text-emerald-400/60">● LIVE</span>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Nu live — Cue #3</p>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <p className="text-xs font-bold text-emerald-400 mb-2">PRESENTATIE</p>
                <p className="text-lg font-extrabold text-white mb-3">Productonthulling</p>
                <p className="text-4xl font-extrabold text-center text-emerald-400 font-mono tabular-nums">08:42</p>
                <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                <span className="text-xs text-white/40">Volgende: Pauze & netwerken</span>
              </div>
              <div className="flex justify-center">
                <div className="bg-emerald-500 text-black font-extrabold text-xs px-8 py-2.5 rounded-xl uppercase tracking-wider">GO →</div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-white/20 text-center">Volledig show-controle. In de browser.</p>
            </div>
          </div>

          {/* Presenter View */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-white/50" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Presenter View</span>
              <span className="ml-auto text-[10px] font-mono text-white/20">PIN: ****</span>
            </div>
            <div className="p-5 flex-1 flex flex-col items-center justify-center gap-5 py-8">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Nu actief</p>
              <h3 className="text-3xl font-extrabold text-white text-center">Productonthulling</h3>
              <p className="text-5xl font-extrabold font-mono tabular-nums text-yellow-400">08:42</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '62%' }} />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-center w-full">
                <p className="text-white/60 text-sm">Vergeet niet de video op slide 8 te starten</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-white/20 text-center">Groot en helder. Op elk scherm.</p>
            </div>
          </div>

          {/* Crew View */}
          <div className="rounded-2xl overflow-hidden border border-white/8 bg-[#080808] flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-white/40" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Crew View</span>
              <span className="ml-auto text-[10px] font-mono text-white/15">Lezen + noteren</span>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-3">
              {[
                { n:'#3', title:'Productonthulling',   dur:'14:00', st:'running' },
                { n:'#4', title:'Pauze & netwerken',   dur:'20:00', st:'next'    },
                { n:'#5', title:'Keynote gastspreker', dur:'25:00', st:'pending' },
              ].map((c) => (
                <div key={c.n} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  c.st === 'running' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'
                }`}>
                  <span className="text-[11px] font-mono text-white/25">{c.n}</span>
                  <span className={`text-sm flex-1 ${c.st === 'running' ? 'text-white font-semibold' : 'text-white/40'}`}>{c.title}</span>
                  <span className="text-[11px] font-mono text-white/25">{c.dur}</span>
                  {c.st === 'running' && <span className="text-[10px] text-emerald-400 font-bold">●</span>}
                </div>
              ))}
              <div className="mt-2 border border-white/5 rounded-lg px-3 py-2 bg-yellow-500/5">
                <p className="text-[11px] text-yellow-400/70">🔔 Caller: mic check voor Mayer</p>
              </div>
              <button className="w-full mt-1 py-2 rounded-lg border border-emerald-500/20 text-xs text-emerald-400/70 font-semibold uppercase tracking-wide">
                ✓ Bevestigd
              </button>
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-white/20 text-center">Altijd bij, nooit in de weg.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// GREEN ROOM — magic links highlight
// ─────────────────────────────────────────────
function CastPortal() {
  return (
    <section className="py-24 border-t border-white/5 bg-[#050f09]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Links: tekst */}
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-4">Green Room</p>
            <h2 className="font-extrabold uppercase text-white leading-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Je gasten.<br />Direct verbonden.
            </h2>
            <p className="text-white/45 text-base leading-relaxed mb-8 max-w-md">
              Genereer een Magic Link voor elke gast of spreker. Geen account, geen app, geen wachtwoord.
              Eén klik — en ze zien hun cues realtime in de browser.
            </p>
            <div className="space-y-4">
              {[
                { icon: Link2,      title: 'Magic Links',        desc: 'Unieke URL per persoon, geldig voor één of meerdere shows' },
                { icon: QrCode,     title: 'QR op deur',         desc: 'Print QR op de kleedkamerdeur — direct live zonder typen' },
                { icon: ShieldCheck,title: 'Optionele PIN',       desc: 'Bescherm de link met een 4-cijferige PIN voor extra veiligheid' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{title}</p>
                    <p className="text-white/40 text-sm mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rechts: mockup cast portal */}
          <div className="relative">
            {/* Main card */}
            <div className="rounded-2xl border border-emerald-500/15 bg-[#060e08] overflow-hidden shadow-[0_0_60px_rgba(16,185,129,0.07)]">
              <div className="bg-[#040a05] border-b border-white/5 px-5 py-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Green Room · Gala 2025</span>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { name: 'Sofie de Vries',  role: 'Gastvrouw', cue: '#2 Welkomstwoord', status: 'done',   color: '#10b981' },
                  { name: 'Marc Dijkstra',   role: 'Spreker',   cue: '#3 Productlancering', status: 'now', color: '#f59e0b' },
                  { name: 'Dr. Lisa Maas',   role: 'Keynote',   cue: '#5 Keynote',       status: 'next',  color: '#3b82f6' },
                ].map((person) => (
                  <div key={person.name} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-black shrink-0"
                      style={{ backgroundColor: person.color + '40', color: person.color }}
                    >
                      {person.name.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{person.name}</p>
                      <p className="text-xs text-white/35">{person.role} · {person.cue}</p>
                    </div>
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                      person.status === 'now'  ? 'bg-yellow-500/20 text-yellow-400' :
                      person.status === 'next' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-white/5 text-white/20'
                    }`}>
                      {person.status === 'now' ? '● Nu' : person.status === 'next' ? '→ Next' : '✓'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Magic link generator */}
              <div className="border-t border-white/5 p-4 bg-[#040a05]">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-bold">Magic Link genereren</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-400/70 truncate border border-emerald-500/15">
                    cueboard.app/green-room/gala25
                  </div>
                  <button className="shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-2 rounded-lg text-xs font-bold uppercase">
                    Kopieer
                  </button>
                </div>
              </div>
            </div>

            {/* Floating mobile card */}
            <div className="absolute -bottom-6 -right-6 w-52 bg-[#050f09] border border-emerald-500/20 rounded-2xl p-4 shadow-xl hidden sm:block">
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-bold">Jouw cues</p>
              <p className="text-base font-extrabold text-white">Keynote</p>
              <p className="text-xs text-white/35 mb-3">Dr. Lisa Maas · 25 minuten</p>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold">Over ±40 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// FEATURES GRID
// ─────────────────────────────────────────────
const FEATURES = [
  { icon: Radio,      label: 'emerald', title: 'Caller View',          desc: 'Volledige show-controle. GO, Prev, Skip — keyboard shortcuts inbegrepen.' },
  { icon: Monitor,    label: 'white',   title: 'Presenter View',        desc: 'Groot, helder scherm voor de spreker. PIN-beveiliging optioneel.' },
  { icon: Smartphone, label: 'white',   title: 'Crew View',             desc: 'Technici en stagemanagers volgen alles op hun eigen apparaat.' },
  { icon: Zap,        label: 'emerald', title: 'Realtime — <50ms',      desc: 'Supabase Realtime. Geen polling. Alles synchroon, zonder F5.' },
  { icon: Link2,      label: 'emerald', title: 'Green Room',            desc: 'Magic links voor gasten en sprekers. Geen account nodig.' },
  { icon: Mic,        label: 'white',   title: 'Mic Patch',             desc: 'Per cue: welke microfoon, IEM of tafelmic? Conflicten direct gesignaleerd.' },
  { icon: Clock,      label: 'white',   title: 'Tijdberekening',        desc: 'Voer aanvangstijd in — CueBoard toont per cue de verwachte starttijd.' },
  { icon: Volume2,    label: 'white',   title: 'Media per cue',         desc: 'Audio en video direct vanuit de cue. Autoplay, loop, volume instelbaar.' },
  { icon: Layers,     label: 'emerald', title: 'Presentaties & slides', desc: 'PDF of PPTX per cue. Caller of presenter bedient de slides realtime.' },
  { icon: Lock,       label: 'white',   title: 'Vergrendelen',          desc: 'Slot de rundown tijdens de show en sla versies op als snapshot.' },
  { icon: BarChart2,  label: 'white',   title: 'Showverloop',           desc: 'Live voortgangsbalk, show-klok en resterende tijd altijd in beeld.' },
  { icon: Users,      label: 'white',   title: 'Rollen & toegang',      desc: 'Owner, Editor, Caller, Crew, Presenter of Viewer — elk hun eigen view.' },
]

function FeaturesGrid() {
  return (
    <section id="features" className="py-24 border-t border-white/5 bg-[#040c06]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3">Wat je krijgt</p>
          <h2 className="font-extrabold uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Alles wat een<br />professionele show vraagt.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.04]">
          {FEATURES.map((f, i) => (
            <div key={f.title}
              className={`bg-[#040c06] p-5 hover:bg-[#060f08] transition-colors group ${
                f.label === 'emerald' ? 'border-l border-l-emerald-500/30' : ''
              }`}>
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg mb-4 ${
                f.label === 'emerald' ? 'bg-emerald-500/12' : 'bg-white/[0.04]'
              }`}>
                <f.icon className={`h-4 w-4 ${f.label === 'emerald' ? 'text-emerald-400' : 'text-white/45'}`} style={{ width:'1rem', height:'1rem' }} />
              </div>
              <h3 className="font-bold text-white text-xs uppercase tracking-wide mb-1.5">{f.title}</h3>
              <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// HOE HET WERKT
// ─────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', icon: LayoutList, title: 'Bouw je rundown', desc: 'Maak een show aan, voeg cues toe met type, duur, notities en media. Gebruik je eigen template of start blanco.' },
    { num: '02', icon: Users,      title: 'Nodig je team uit', desc: 'Deel een link of stuur een invite. Caller, crew, cast, presentator — iedereen krijgt zijn view en rechten.' },
    { num: '03', icon: Radio,      title: 'GO.', desc: 'De caller drukt op GO. De cue gaat live. Iedereen ziet het meteen. Zonder app, zonder hardware.' },
  ]
  return (
    <section id="hoe-het-werkt" className="py-24 border-t border-white/5 bg-[#050f09]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-4">Workflow</p>
            <h2 className="font-extrabold uppercase text-white leading-tight mb-12"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              Van voorbereiding<br />tot applaus.
            </h2>
            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={step.num} className="relative flex gap-6">
                  {i < steps.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-emerald-500/15" />
                  )}
                  <div className="relative shrink-0 h-10 w-10 rounded-full border border-emerald-500/30 bg-emerald-500/8 flex items-center justify-center mt-1">
                    <step.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="pb-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-emerald-400/50 uppercase tracking-widest">{step.num}</span>
                      <h3 className={`font-extrabold uppercase ${step.num === '03' ? 'text-2xl text-emerald-400' : 'text-sm text-white'}`}>{step.title}</h3>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed max-w-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-10">
              <p className="text-5xl font-extrabold text-emerald-400 mb-4 leading-none">&ldquo;</p>
              <p className="text-xl font-bold text-white leading-relaxed mb-6">
                Geen gedoe met WhatsApp-groepen, printjes of handgebaren. Iedereen weet wat er nu speelt, wat er daarna komt — en wanneer te gaan.
              </p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Show Caller</p>
                  <p className="text-xs text-white/30">Live event productie</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.9)]" />
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
    name: 'Individual',
    price: '€0',
    period: 'voor altijd',
    desc: 'Probeer CueBoard zonder risico.',
    highlight: false,
    cta: 'Gratis starten',
    href: '/register',
    features: ['1 show', '1 rundown per show', 'Tot 15 cues', '2 teamleden per show', 'Caller · Presenter · Crew', 'Realtime samenwerking'],
  },
  {
    name: 'Team',
    price: '€9,99',
    period: 'per maand',
    desc: 'Voor professionals die meerdere shows draaien.',
    highlight: true,
    cta: 'Team starten',
    href: '/register?plan=pro',
    features: ['Tot 5 shows', 'Tot 3 rundowns per show', 'Onbeperkt cues', 'Tot 5 teamleden per show', 'Presentatie-upload (PDF / PPTX)', 'Companion integratie', 'Mic patch panel'],
  },
  {
    name: 'Business',
    price: '€29,99',
    period: 'per maand',
    desc: 'Voor AV-bureaus en productieteams.',
    highlight: false,
    cta: 'Business starten',
    href: '/register?plan=team',
    features: ['Onbeperkt shows & rundowns', 'Onbeperkt cues', 'Onbeperkt teamleden', 'Onbeperkt Green Room gasten', 'Mic Patch & audio beheer', 'Alles van Team', 'Prioriteitsondersteuning'],
  },
]

function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t border-white/5 bg-[#040c06]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3">Prijzen</p>
          <h2 className="font-extrabold uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Eenvoudig.<br />Transparant.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col border transition-all ${
                plan.highlight
                  ? 'border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_rgba(16,185,129,0.07)]'
                  : 'border-white/[0.06] bg-white/[0.015]'
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-6">
                  <span className="flex items-center gap-1 text-[11px] font-extrabold bg-emerald-500 text-black px-3 py-0.5 rounded-full uppercase tracking-wide">
                    <Star className="h-3 w-3" /> Populairste keuze
                  </span>
                </div>
              )}
              <div className="mb-6">
                <p className="text-[11px] font-bold text-white/35 uppercase tracking-[0.2em] mb-2">{plan.name}</p>
                <div className="flex items-end gap-1.5 mb-2">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-sm text-white/25 mb-1 font-mono">/ {plan.period}</span>
                </div>
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
              <Link href={plan.href}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  plan.highlight
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border border-white/10 hover:border-white/20 text-white/60 hover:text-white'
                }`}>
                {plan.cta} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/15 mt-6 text-center font-mono uppercase tracking-widest">
          Inclusief BTW · Jaarlijks betalen = 20% korting
        </p>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────
function Cta() {
  return (
    <section className="py-32 border-t border-white/5 bg-[#050f09]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.04] overflow-hidden px-8 py-20 text-center">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-72 w-72 rounded-full bg-emerald-500/12 blur-[90px]" />
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.35em] mb-4">Klaar voor de show?</p>
            <h2 className="font-extrabold uppercase text-white mb-6" style={{ fontSize: 'clamp(3.5rem, 10vw, 7rem)', lineHeight: 1 }}>
              GO.
            </h2>
            <p className="text-base text-white/40 mb-10 max-w-md mx-auto leading-relaxed">
              Maak gratis een account aan. Je eerste rundown staat in minder dan 5 minuten klaar.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base px-10 py-4 rounded-2xl uppercase tracking-wide transition-all shadow-[0_0_50px_rgba(16,185,129,0.45)] hover:shadow-[0_0_70px_rgba(16,185,129,0.65)]">
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
    <footer className="border-t border-white/[0.06] py-10 bg-[#040a06]">
      <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Logo size="sm" />
        <div className="flex items-center gap-6 text-[11px] font-semibold text-white/25 uppercase tracking-[0.18em]">
          <a href="#pricing"     className="hover:text-emerald-400 transition-colors">Prijzen</a>
          <Link href="/login"    className="hover:text-white transition-colors">Inloggen</Link>
          <Link href="/register" className="hover:text-white transition-colors">Registreren</Link>
          <a href="mailto:info@artiflexx.nl" className="hover:text-white transition-colors">Contact</a>
        </div>
        <p className="text-[11px] text-white/15 font-mono">© {new Date().getFullYear()} Artiflexx</p>
      </div>
    </footer>
  )
}

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050f09] text-white">
      <Navbar />
      <Hero />
      <FeatureSlideshow />
      <CastPortal />
      <FeaturesGrid />
      <HowItWorks />
      <PricingSection />
      <Cta />
      <Footer />
    </div>
  )
}
