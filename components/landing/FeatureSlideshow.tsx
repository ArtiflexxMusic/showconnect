'use client'

import { useState, useEffect } from 'react'
import { Radio, Monitor, Smartphone, Layers, Link2, Mic, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const INTERVAL = 5500 // ms per feature

// ── Mockup components ────────────────────────────────────────────────────────

function CallerMockup() {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#050f09] overflow-hidden flex flex-col h-full">
      <div className="bg-[#040a06] border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-[11px] text-white/30 font-mono uppercase tracking-widest">Caller · Gala Avondshow 2025</span>
        </div>
        <span className="text-[11px] font-bold text-emerald-400/70 font-mono">● LIVE</span>
      </div>
      <div className="p-6 flex-1 flex flex-col gap-4">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center">Nu live — cue #3</p>
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-white/30 uppercase">Presentatie</span>
            <span className="text-[10px] text-white/20 font-mono">Zaal A</span>
          </div>
          <p className="text-xl font-extrabold text-white mb-3">Productonthulling + Q&A</p>
          <p className="text-6xl font-black font-mono tabular-nums text-emerald-400 text-center leading-none mb-3">08:42</p>
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '62%' }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 border border-white/10 text-white/30 text-xs py-2.5 rounded-xl font-semibold text-center">← Vorige</div>
          <div className="flex-[2] bg-emerald-500 text-black font-extrabold text-sm py-2.5 rounded-xl uppercase tracking-wider text-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">GO →</div>
          <div className="flex-1 border border-yellow-500/20 text-yellow-500/50 text-xs py-2.5 rounded-xl font-semibold text-center">Skip</div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
          <span className="text-xs text-white/35">Volgende: Pauze & netwerken — 20:00</span>
        </div>
      </div>
    </div>
  )
}

function PresenterMockup() {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden flex flex-col h-full">
      <div className="bg-black/50 border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Presenter View</span>
        </div>
        <span className="text-[10px] text-white/20 font-mono">PIN: ****</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 px-8">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Nu actief</p>
        <h3 className="text-2xl font-extrabold text-white text-center leading-tight">Productonthulling<br />+ Q&A</h3>
        <p className="text-[10px] text-white/25 uppercase tracking-widest">Thomas de Vries · Zaal A</p>
        <p className="text-7xl font-extrabold font-mono tabular-nums text-yellow-400 leading-none">08:42</p>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
          <div className="h-full bg-yellow-500 rounded-full" style={{ width: '62%' }} />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 w-full text-center max-w-xs">
          <p className="text-white/55 text-sm leading-relaxed">Vergeet niet de video op slide 8 te starten</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/20 font-mono uppercase tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
          SPATIE = volgende slide
        </div>
      </div>
    </div>
  )
}

function SlidesMockup() {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-[#060d08] overflow-hidden flex flex-col h-full">
      <div className="bg-[#040a05] border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-emerald-400/60" />
          <span className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Slides · Cue #3 — Productonthulling</span>
        </div>
        <span className="text-[10px] text-white/30 font-mono font-bold">2 / 10</span>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-[#080f0a] border-b border-white/5 p-8">
          <div className="w-full max-w-sm aspect-video bg-[#0a1a0c] rounded-xl border border-emerald-500/15 flex flex-col items-center justify-center gap-3 shadow-inner">
            <div className="h-2 w-24 bg-emerald-500/25 rounded-full" />
            <div className="h-8 w-40 bg-white/10 rounded-xl flex items-center justify-center">
              <span className="text-xs font-bold text-white/30 uppercase tracking-wide">Slide 2 / 10</span>
            </div>
            <div className="h-2 w-32 bg-white/5 rounded-full" />
            <div className="h-2 w-28 bg-white/5 rounded-full" />
          </div>
        </div>
        <div className="px-4 py-3 bg-[#080f0a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center opacity-50">
              <span className="text-sm text-white/40">‹</span>
            </div>
            <span className="text-xs font-mono text-white/30 min-w-[4.5rem] text-center">2 / 10</span>
            <div className="h-7 w-7 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
              <span className="text-sm text-emerald-400">›</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/25 font-mono uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            GO = volgende slide
          </div>
        </div>
      </div>
    </div>
  )
}

function CrewMockup() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#080808] overflow-hidden flex flex-col h-full">
      <div className="bg-[#040404] border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Crew View</span>
        </div>
        <span className="text-[10px] text-white/15 font-mono">Lezen + noteren</span>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        {[
          { n: '#3', title: 'Productonthulling',   dur: '08:42', st: 'running' },
          { n: '#4', title: 'Pauze & netwerken',   dur: '20:00', st: 'next'    },
          { n: '#5', title: 'Keynote gastspreker', dur: '25:00', st: 'pending' },
          { n: '#6', title: 'Awards uitreiking',   dur: '12:00', st: 'pending' },
        ].map((c) => (
          <div key={c.n} className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
            c.st === 'running' ? 'border-emerald-500/30 bg-emerald-500/5' :
            c.st === 'next'    ? 'border-white/8 bg-white/[0.02]' :
            'border-white/4 opacity-40'
          )}>
            <span className="text-[11px] font-mono text-white/25">{c.n}</span>
            <span className={cn('text-sm flex-1 truncate', c.st === 'running' ? 'text-white font-semibold' : 'text-white/40')}>{c.title}</span>
            <span className={cn('text-[11px] font-mono shrink-0', c.st === 'running' ? 'text-emerald-400 font-bold' : 'text-white/20')}>{c.dur}</span>
            {c.st === 'running' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
          </div>
        ))}
        <div className="mt-1 border border-yellow-500/20 rounded-xl px-3 py-2.5 bg-yellow-500/5">
          <p className="text-[11px] text-yellow-400/80">🔔 Caller: mic check voor Mayer</p>
        </div>
        <button className="w-full py-2 rounded-xl border border-emerald-500/20 text-xs text-emerald-400/70 font-semibold uppercase tracking-wide">
          ✓ Bevestigd
        </button>
      </div>
    </div>
  )
}

function CastMockup() {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-[#060e08] overflow-hidden flex flex-col h-full">
      <div className="bg-[#040a05] border-b border-white/5 px-5 py-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-mono text-white/30 uppercase tracking-widest">Green Room · Gala 2025</span>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        {[
          { name: 'Sofie de Vries', role: 'Gastvrouw', cue: '#2 Welkomstwoord',      status: 'done', color: '#10b981' },
          { name: 'Marc Dijkstra',  role: 'Spreker',   cue: '#3 Productlancering',   status: 'now',  color: '#f59e0b' },
          { name: 'Dr. Lisa Maas',  role: 'Keynote',   cue: '#5 Keynote gastspreker',status: 'next', color: '#3b82f6' },
        ].map((p) => (
          <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: p.color + '25', color: p.color }}
            >
              {p.name.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{p.name}</p>
              <p className="text-xs text-white/30 truncate">{p.role} · {p.cue}</p>
            </div>
            <div className={cn(
              'text-[10px] font-bold px-2 py-1 rounded-lg uppercase shrink-0',
              p.status === 'now'  ? 'bg-yellow-500/20 text-yellow-400' :
              p.status === 'next' ? 'bg-blue-500/20 text-blue-400' :
              'bg-white/5 text-white/20'
            )}>
              {p.status === 'now' ? '● Nu' : p.status === 'next' ? '→ Next' : '✓'}
            </div>
          </div>
        ))}
        <div className="border-t border-white/5 pt-3 mt-1">
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2 font-bold">Magic Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-400/70 truncate border border-emerald-500/15">
              cueboard.nl/green-room/gala25
            </div>
            <button className="shrink-0 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-3 py-2 rounded-lg text-xs font-bold">
              Kopieer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MicMockup() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#060c07] overflow-hidden flex flex-col h-full">
      <div className="bg-[#040a05] border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[11px] text-white/25 font-mono uppercase tracking-widest">Mic Patch · Cue #3</span>
        </div>
        <span className="text-[10px] text-emerald-400/60 font-mono font-bold">● Actief</span>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-bold text-white/20 uppercase tracking-widest px-1 mb-1">
          <span>Naam</span><span>Type</span><span>Nr.</span>
        </div>
        {[
          { name: 'Thomas de Vries', type: 'Daswas',  nr: 'TX01', active: true  },
          { name: 'Sofie de Vries',  type: 'Handmic', nr: 'HH02', active: false },
          { name: 'Podium tafelmic', type: 'Tafel',   nr: 'TM01', active: true  },
          { name: 'Dr. Lisa Maas',   type: 'Daswas',  nr: 'TX03', active: false },
        ].map((m) => (
          <div key={m.name} className={cn(
            'grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 rounded-xl border',
            m.active ? 'border-emerald-500/25 bg-emerald-500/[0.05]' : 'border-white/5 opacity-45'
          )}>
            <span className={cn('text-sm font-semibold truncate', m.active ? 'text-white' : 'text-white/40')}>{m.name}</span>
            <span className="text-[11px] text-white/30 font-mono">{m.type}</span>
            <span className={cn('text-[11px] font-mono font-bold', m.active ? 'text-emerald-400' : 'text-white/20')}>{m.nr}</span>
          </div>
        ))}
        <div className="mt-2 border border-red-500/20 rounded-xl px-3 py-2.5 bg-red-500/5">
          <p className="text-[11px] text-red-400/80 font-semibold">⚠ Conflict: HH02 ook actief in cue #2</p>
        </div>
        <p className="text-center text-[10px] text-white/15 font-mono uppercase tracking-widest mt-auto pt-2">
          Conflicten automatisch gesignaleerd
        </p>
      </div>
    </div>
  )
}

// ── Tab definitie ─────────────────────────────────────────────────────────────

interface Tab {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  tagline: string
  desc: string
  mockup: React.ReactNode
}

const TABS: Tab[] = [
  {
    id: 'caller',
    icon: Radio,
    label: 'Caller View',
    tagline: 'Jij hebt de controle.',
    desc: 'GO, vorige, skip — alles via één helder scherm. Keyboard shortcuts, auto-advance timer, media-player en nudge-systeem voor je team. In de browser, zonder app.',
    mockup: <CallerMockup />,
  },
  {
    id: 'presenter',
    icon: Monitor,
    label: 'Presenter View',
    tagline: 'Groot en helder op elk scherm.',
    desc: 'De presentator ziet exact welke cue actief is, hoe lang hij nog heeft en zijn persoonlijke notities. PIN-beveiliging optioneel. Werkt op elk apparaat.',
    mockup: <PresenterMockup />,
  },
  {
    id: 'slides',
    icon: Layers,
    label: 'Slides per cue',
    tagline: 'Eén cue, alle slides.',
    desc: 'Upload een PDF bij een cue. GO bladert door de slides — pas na de laatste slide gaat de show verder. Caller én presentator kunnen navigeren. Realtime gesynchroniseerd.',
    mockup: <SlidesMockup />,
  },
  {
    id: 'crew',
    icon: Smartphone,
    label: 'Crew View',
    tagline: 'Iedereen op dezelfde pagina.',
    desc: 'Technici en stagemanagers volgen alles op hun eigen apparaat. Nudge-notificaties van de caller direct zichtbaar. Bevestig taken met één klik.',
    mockup: <CrewMockup />,
  },
  {
    id: 'cast',
    icon: Link2,
    label: 'Green Room',
    tagline: 'Geen app, geen account.',
    desc: 'Magic Links voor gasten en sprekers. Via QR of link zien ze hun cues realtime in de browser — zonder account, zonder download. Print de QR op de kleedkamerdeur.',
    mockup: <CastMockup />,
  },
  {
    id: 'mic',
    icon: Mic,
    label: 'Mic Patch',
    tagline: 'Nooit meer de verkeerde mic.',
    desc: 'Wijs per cue toe welke microfoon, IEM of tafelmic actief is. CueBoard signaleert conflicten automatisch — altijd de juiste mic open op het juiste moment.',
    mockup: <MicMockup />,
  },
]

// ── Hoofd component ────────────────────────────────────────────────────────────

export function FeatureSlideshow() {
  const [activeId, setActiveId] = useState('caller')
  const [progress, setProgress] = useState(0)

  const activeIndex = TABS.findIndex(t => t.id === activeId)
  const activeTab   = TABS[activeIndex]

  // Auto-advance met voortgangsbalk
  useEffect(() => {
    setProgress(0)
    const start = Date.now()
    const tick  = setInterval(() => {
      const elapsed = Date.now() - start
      const pct     = Math.min((elapsed / INTERVAL) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(tick)
        setActiveId(prev => {
          const idx = TABS.findIndex(t => t.id === prev)
          return TABS[(idx + 1) % TABS.length].id
        })
      }
    }, 60)
    return () => clearInterval(tick)
  }, [activeId])

  return (
    <section id="views" className="py-24 bg-[#040c06] border-t border-white/5">
      <div className="mx-auto max-w-7xl px-6">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.3em] mb-3">Product tour</p>
          <h2 className="font-extrabold uppercase text-white leading-tight" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
            Elk scherm.<br />Elke rol.
          </h2>
          <p className="text-white/35 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            Caller, presenter en crew — iedereen ziet precies wat hij nodig heeft.
            Geopend in de browser, via link of QR.
          </p>
        </div>

        {/* Tabs (horizontaal op mobiel, verticaal op desktop) */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-3 scrollbar-none mb-6">
          {TABS.map((tab) => {
            const isActive = tab.id === activeId
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                className={cn(
                  'shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all relative overflow-hidden',
                  isActive
                    ? 'border-emerald-500/30 bg-emerald-500/[0.1] text-white'
                    : 'border-white/[0.06] bg-white/[0.015] text-white/35 hover:text-white/60'
                )}
              >
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 h-[2px] bg-emerald-400/60"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <tab.icon className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-emerald-400' : 'text-white/30')} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Main layout: sidebar + mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">

          {/* Sidebar tabs (alleen desktop) */}
          <div className="hidden lg:flex flex-col gap-2">
            {TABS.map((tab) => {
              const isActive = tab.id === activeId
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveId(tab.id)}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all w-full text-left relative overflow-hidden',
                    isActive
                      ? 'border-emerald-500/30 bg-emerald-500/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.015] hover:border-white/12 hover:bg-white/[0.03]'
                  )}
                >
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-0 h-[2px] bg-emerald-400/60 transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  <div className={cn(
                    'shrink-0 h-8 w-8 rounded-lg flex items-center justify-center',
                    isActive ? 'bg-emerald-500/15' : 'bg-white/5'
                  )}>
                    <tab.icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-white/35')} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-xs font-bold uppercase tracking-wide', isActive ? 'text-white' : 'text-white/40')}>
                      {tab.label}
                    </p>
                    {isActive && (
                      <p className="text-[11px] text-emerald-400/60 mt-0.5">{tab.tagline}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Rechts: beschrijving + mockup */}
          <div className="flex flex-col gap-5 min-h-0">
            <div className="min-h-[72px]">
              <h3 className="font-extrabold text-white text-xl uppercase mb-2">{activeTab.tagline}</h3>
              <p className="text-white/45 text-sm leading-relaxed max-w-lg">{activeTab.desc}</p>
            </div>
            <div className="h-[400px]">
              {activeTab.mockup}
            </div>
          </div>

        </div>

        {/* Dot navigatie */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                'rounded-full transition-all',
                tab.id === activeId
                  ? 'h-2 w-6 bg-emerald-400'
                  : 'h-2 w-2 bg-white/15 hover:bg-white/30'
              )}
              aria-label={tab.label}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
