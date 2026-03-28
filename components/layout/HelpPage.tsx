'use client'

import { useState } from 'react'
import {
  ListMusic, Radio, Mic2, Users, Globe, Monitor,
  QrCode, Webhook, Clock, ChevronRight, ChevronDown, Zap,
  UserPlus, Printer, Eye, Presentation, Rocket,
} from 'lucide-react'
import { FeatureSlideshow } from '@/components/landing/FeatureSlideshow'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string
  icon: React.ElementType
  color: string
  title: string
  subtitle: string
  description: string
  steps?: string[]
  tip?: string
  badge?: string
}

// ─── Content ──────────────────────────────────────────────────────────────────

const sections: Section[] = [
  {
    id: 'rundown',
    icon: ListMusic,
    color: 'emerald',
    title: 'Rundown & Cues',
    subtitle: 'De basis van elke show',
    description:
      'Een rundown is de agenda van je show. Je maakt er één per event (of per dag). Binnen een rundown voeg je cues toe — dat zijn de individuele blokken: een speech, een filmpje, een muzikale act, een pauze.',
    steps: [
      'Ga naar je show en klik op "Rundown aanmaken".',
      'Voeg cues toe met de "+ Cue" knop. Geef elke cue een titel, type en duur.',
      'Sleep cues omhoog of omlaag om de volgorde te wijzigen.',
      'Sla technische notities op per cue — zichtbaar voor crew, niet voor publiek.',
    ],
    tip: 'De totale showduur wordt automatisch berekend op basis van alle cue-tijden.',
  },
  {
    id: 'caller',
    icon: Radio,
    color: 'blue',
    title: 'Caller View',
    subtitle: 'Showcontrol — de regie',
    badge: 'Voor de regisseur',
    description:
      'De Caller is het hart van de show. Van hieruit druk je op GO om cues te starten en de show te besturen. Alle andere views — Presenter, Crew, Programmascherm — worden realtime bijgewerkt op het moment dat jij GO drukt.',
    steps: [
      'Open de Caller link (of scan de QR-code in de rundown instellingen).',
      'De volgende cue is altijd rechts in beeld. Druk op GO om hem te starten.',
      'Druk opnieuw op GO om door te gaan naar de volgende cue.',
      'Rood = actief, grijs = wacht, groen = klaar.',
    ],
    tip: 'Alleen de Caller heeft een GO-knop. De rest kijkt mee en ziet live updates.',
  },
  {
    id: 'presenter',
    icon: Eye,
    color: 'violet',
    title: 'Presenter View',
    subtitle: 'Voor de spreker op het podium',
    badge: 'Afkijkscherm',
    description:
      'De Presenter view is gemaakt voor de presentator of dagvoorzitter. Hij ziet een grote, leesbare weergave van de huidige cue en de volgende cue — ideaal als prompter of afkijkscherm op een tweede monitor.',
    steps: [
      'Stuur de Presenter link naar de presentator, of open hem op een apart scherm.',
      'De view werkt automatisch mee met GO van de Caller.',
      'Geen knoppen, geen afleiding — alleen de essentie.',
    ],
    tip: 'Zet de Presenter view op een tablet of monitor naast het podium als afkijkscherm.',
  },
  {
    id: 'crew',
    icon: Users,
    color: 'amber',
    title: 'Crew View',
    subtitle: 'Voor het technische team',
    badge: 'Backstage',
    description:
      'De Crew view geeft je technische team inzicht in de volledige rundown, met alle technische notities per cue. Geluidsmannen, lichtoperators, videoregisseurs — iedereen ziet precies wat er verwacht wordt bij elke cue.',
    steps: [
      'Stuur de Crew link naar je technische team.',
      'De view toont alle cues, inclusief tech_notes die in de Caller/Editor zijn ingevoerd.',
      'De huidige actieve cue is duidelijk gemarkeerd.',
    ],
    tip: 'Voeg per cue een technische notitie toe in de cue-editor ("Technische notities") — dit ziet alleen de crew.',
  },
  {
    id: 'publiek',
    icon: Globe,
    color: 'sky',
    title: 'Programmascherm',
    subtitle: 'Backstage statusscherm voor crew en sprekers',
    description:
      'Het Programmascherm is een lichtgewicht pagina die backstage te gebruiken is: sprekers die wachten kunnen zien welke cue er live is en wanneer zij aan de beurt zijn. Geen login nodig, geen knoppen — alleen de essentie van het programma.',
    steps: [
      'Klik op "Programma" in je show-dashboard om de link te kopiëren of de QR-code te scannen.',
      'Geen login nodig — iedereen met de link kan meekijken.',
      'De pagina ververst automatisch wanneer de Caller op GO drukt.',
    ],
    tip: 'Hang het Programmascherm op een tv of tablet backstage, zodat alle wachtende sprekers precies weten wanneer ze aan de beurt zijn — zonder dat je iemand hoeft te informeren.',
  },
  {
    id: 'presentatie',
    icon: Presentation,
    color: 'rose',
    title: 'Slides per cue',
    subtitle: 'PDF of PPTX koppelen aan een cue',
    badge: 'Nieuw',
    description:
      'Upload een PDF of PPTX direct bij een cue. Alle slides zijn dan onderdeel van die cue — de Caller en Presenter bladeren er handmatig doorheen. Pas op het laatste slide gaat GO door naar de volgende cue.',
    steps: [
      'Open de cue-editor en kies het type "Presentatie" (of een ander type).',
      'Scroll naar "Presentatie / Slides" en upload een PDF of PPTX (max 50 MB).',
      'Stel in wie de slides bedient: Caller, Presenter, of beide.',
      'Tijdens de show: druk op GO om door de slides te bladeren. Pas bij de laatste slide gaat GO naar de volgende cue.',
      'De Presenter kan ook bladeren met pijltjestoetsen of spatiebalk.',
    ],
    tip: 'Voor de beste kwaliteit en volledige slide-controle: exporteer je PPTX vanuit PowerPoint als PDF. PPTX-bestanden worden als voorbeeld getoond maar hebben beperkte slide-controle.',
  },
  {
    id: 'presentatie-output',
    icon: Monitor,
    color: 'violet',
    title: 'Presentatie Output',
    subtitle: 'Fullscreen slides voor videomixer',
    description:
      'De Output-pagina toont de actieve slide fullscreen op een zwarte achtergrond — ideaal als source voor een videomixer of beamer. De slides worden realtime gesynchroniseerd met de Caller.',
    steps: [
      'Klik op "Presentatie" in je show-dashboard om de Output-link te openen.',
      'Open die pagina op de computer die op de beamer of mixer is aangesloten.',
      'Verbind als bron in je videomixer (OBS, vMix, Resolume, etc.).',
      'De slides schuiven automatisch mee zodra de Caller of Presenter verder gaat.',
    ],
    tip: 'Open de Output-pagina schermvullend (F11). De paginateller rechtsonder is bijna onzichtbaar en wordt niet opgepikt door chroma-key.',
  },
  {
    id: 'cast',
    icon: Users,
    color: 'emerald',
    title: 'Cast beheer',
    subtitle: 'Deelnemers zonder account',
    badge: 'Nieuw',
    description:
      'Voeg sprekers, artiesten of andere cast members toe aan een show. Elk cast member krijgt een 6-cijferige PIN en een persoonlijke Cast Portal — een lichtgewicht weergave van het programma, zonder dat ze een account nodig hebben.',
    steps: [
      'Klik op het cast-icoontje (radio) bovenin je show-dashboard.',
      'Voeg een cast member toe met naam, rol en kleur.',
      'Er wordt automatisch een 6-cijferige PIN gegenereerd.',
      'Geef de PIN aan de cast member. Ze gaan naar /cast-login en voeren de code in.',
      'Ze zien direct het programma van de show — live gesynchroniseerd.',
    ],
    tip: 'Je kunt ook een Magic Link genereren en die rechtstreeks sturen — dan hoeven ze de PIN niet te typen.',
  },
  {
    id: 'mic',
    icon: Mic2,
    color: 'orange',
    title: 'Mic Patch',
    subtitle: 'Microfoon- en audiotoewijzing',
    badge: 'Nieuw',
    description:
      'Koppel audio-apparaten (microfoons, DI-boxes, playback) aan cues. Zo weet je geluidsteam precies welk kanaal open moet bij welke cue — en kun je dit uitsturen naar Bitfocus Companion via een webhook.',
    steps: [
      'Klik op het Mic Patch-icoontje (radio) in de Rundown Editor of Caller.',
      'Voeg apparaten toe onder "Apparaten beheren".',
      'Zet de juiste apparaten aan of uit per cue.',
      'De Mic Patch is ook zichtbaar in de Caller en Crew view.',
    ],
    tip: 'Combineer Mic Patch met de Companion webhook om microfoon-routing automatisch te laten verlopen bij elke GO.',
  },
  {
    id: 'qr',
    icon: QrCode,
    color: 'slate',
    title: 'QR-codes & links',
    subtitle: 'Snel delen met je team',
    description:
      'Elke view (Caller, Presenter, Crew, Programmascherm, Presentatie) heeft een eigen link én een QR-code. Zo kun je snel iemand toegang geven zonder te typen.',
    steps: [
      'Klik op het QR-icoontje naast een link in je show-dashboard.',
      'Een QR-code verschijnt in beeld — scan met een telefoon of tablet.',
      'Of klik op het kopieer-icoontje en stuur de link via WhatsApp of mail.',
    ],
    tip: 'Print de QR-codes van Caller en Crew en plak ze op je technische tafel — dan is iedereen snel verbonden.',
  },
  {
    id: 'tijdplanning',
    icon: Clock,
    color: 'teal',
    title: 'Tijdplanning & showstart',
    subtitle: 'Automatische starttijden per cue',
    description:
      'Stel een aanvangstijd in voor de show. CueBoard berekent dan per cue de verwachte starttijd op basis van de duur van alle voorgaande cues. Zo zie je in één oogopslag of je uitloopt.',
    steps: [
      'Ga naar Rundown Instellingen en vul een "Showstart" tijd in.',
      'Elke cue toont nu de verwachte starttijd.',
      'Pas de duur van cues aan — alle tijden worden direct herberekend.',
    ],
    tip: 'Gebruik de starttijd als richtlijn, niet als harde grens — de show loopt altijd anders dan gepland.',
  },
  {
    id: 'uitnodigen',
    icon: UserPlus,
    color: 'indigo',
    title: 'Team uitnodigen',
    subtitle: 'Collega\'s toegang geven',
    description:
      'Nodig collega\'s uit voor een show zodat zij ook de rundown kunnen bewerken en de Caller kunnen bedienen. Elke persoon heeft een eigen account nodig.',
    steps: [
      'Klik op "Uitnodigen" bovenin je show.',
      'Voer het e-mailadres in van je collega.',
      'Kies een rol: Redacteur (kan alles bewerken) of Viewer (alleen meekijken).',
      'Je collega ontvangt een uitnodigingsmail en krijgt na acceptatie toegang.',
    ],
    tip: 'Cast members en sprekers hoeven geen uitnodiging — die gebruik je de Cast Portal met PIN.',
  },
  {
    id: 'afdrukken',
    icon: Printer,
    color: 'gray',
    title: 'Afdrukken',
    subtitle: 'Papieren rundown voor de tafel',
    description:
      'Druk de volledige rundown af als overzichtelijk document. Handig als backup, voor de productieleider, of als je iemand een papieren versie wil geven.',
    steps: [
      'Klik op "Afdrukken" in je show-dashboard of rundown instellingen.',
      'Een printklare versie opent in een nieuw tabblad.',
      'Gebruik Ctrl+P (of Cmd+P op Mac) om af te drukken.',
    ],
  },
  {
    id: 'webhook',
    icon: Webhook,
    color: 'pink',
    title: 'Bitfocus Companion',
    subtitle: 'StreamDeck & show control koppeling',
    description:
      'Koppel CueBoard aan Bitfocus Companion. Companion haalt zelf de actieve cue op via een poll-URL — zo werkt het altijd, ook als CueBoard in de cloud draait. Toon de cuenaam live op een StreamDeck-knop, of koppel er acties aan zoals licht of audio.',
    steps: [
      'Ga in CueBoard naar Rundown Instellingen → Bitfocus Companion en kopieer de Poll-URL.',
      'Open Companion → Triggers → Add trigger → Event: "Time — Interval" → 1000 ms.',
      'Voeg actie toe: Internal → HTTP Request → Method: GET → plak de Poll-URL.',
      'Voeg tweede actie toe: Internal → Set custom variable → naam: cueboard_cue.',
      'Gebruik $(internal:custom_cueboard_cue) in knoppen om de actieve cue live te tonen.',
      'Beschikbare JSON-velden: active_cue_title, next_cue_title, active_cue_type, cues_done, cues_total.',
    ],
    tip: 'Companion draait gewoon op een laptop of vaste pc — geen speciale hardware nodig. Internettoegang vereist zodat Companion cueboard.nl kan bereiken.',
    badge: 'Integratie',
  },
]

// ─── Kleuren per variant ───────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-500/15 text-emerald-300' },
  blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-400',    border: 'border-blue-500/20',    badge: 'bg-blue-500/15 text-blue-300' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  border: 'border-violet-500/20',  badge: 'bg-violet-500/15 text-violet-300' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   border: 'border-amber-500/20',   badge: 'bg-amber-500/15 text-amber-300' },
  sky:     { bg: 'bg-sky-500/10',     icon: 'text-sky-400',     border: 'border-sky-500/20',     badge: 'bg-sky-500/15 text-sky-300' },
  rose:    { bg: 'bg-rose-500/10',    icon: 'text-rose-400',    border: 'border-rose-500/20',    badge: 'bg-rose-500/15 text-rose-300' },
  orange:  { bg: 'bg-orange-500/10',  icon: 'text-orange-400',  border: 'border-orange-500/20',  badge: 'bg-orange-500/15 text-orange-300' },
  teal:    { bg: 'bg-teal-500/10',    icon: 'text-teal-400',    border: 'border-teal-500/20',    badge: 'bg-teal-500/15 text-teal-300' },
  indigo:  { bg: 'bg-indigo-500/10',  icon: 'text-indigo-400',  border: 'border-indigo-500/20',  badge: 'bg-indigo-500/15 text-indigo-300' },
  pink:    { bg: 'bg-pink-500/10',    icon: 'text-pink-400',    border: 'border-pink-500/20',    badge: 'bg-pink-500/15 text-pink-300' },
  slate:   { bg: 'bg-slate-500/10',   icon: 'text-slate-400',   border: 'border-slate-500/20',   badge: 'bg-slate-500/15 text-slate-300' },
  gray:    { bg: 'bg-gray-500/10',    icon: 'text-gray-400',    border: 'border-gray-500/20',    badge: 'bg-gray-500/15 text-gray-300' },
}

// ─── Sectiekaart (accordion) ──────────────────────────────────────────────────

function SectionCard({ section, open, onToggle }: { section: Section; open: boolean; onToggle: () => void }) {
  const c = colorMap[section.color] ?? colorMap.slate
  const Icon = section.icon

  return (
    <div id={section.id} className={`rounded-2xl border ${c.border} bg-card overflow-hidden transition-all`}>
      {/* Header — altijd zichtbaar, klikbaar */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-5 text-left transition-colors ${open ? c.bg : 'hover:bg-accent/30'}`}
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}>
          <Icon className={`h-5 w-5 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-base text-foreground">{section.title}</h2>
            {section.badge && (
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.badge}`}>
                {section.badge}
              </span>
            )}
          </div>
          <p className={`text-sm ${c.icon} font-medium`}>{section.subtitle}</p>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Body — alleen zichtbaar als open */}
      {open && (
        <div className={`px-5 pb-5 pt-0 space-y-4 border-t ${c.border}`}>
          <p className="text-sm text-muted-foreground leading-relaxed pt-4">{section.description}</p>

          {section.steps && section.steps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Hoe gebruik je het?</p>
              <ol className="space-y-1.5">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${c.bg} ${c.icon}`}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {section.tip && (
            <div className={`flex items-start gap-2.5 rounded-xl p-3 ${c.bg} border ${c.border}`}>
              <Zap className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${c.icon}`} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/70">Tip: </span>
                {section.tip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inhoudsopgave ────────────────────────────────────────────────────────────

function TableOfContents() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 sticky top-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inhoud</p>
      <nav className="space-y-0.5">
        {sections.map((s) => {
          const c = colorMap[s.color] ?? colorMap.slate
          const Icon = s.icon
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors group"
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${c.icon} opacity-70 group-hover:opacity-100`} />
              {s.title}
            </a>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export function HelpPage() {
  const [openSection, setOpenSection] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenSection((prev) => prev === id ? null : id)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Kop */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">CueBoard</p>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">Help & Uitleg</h1>
        <p className="text-muted-foreground mt-1">
          Alles over de functies van CueBoard — van rundown tot Presenter, van Cast PIN tot videomixer output.
        </p>
      </div>

      {/* Quick-start banner */}
      <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-8">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">Nieuw bij CueBoard?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ga naar je dashboard — daar staat een interactieve "Aan de slag"-gids die je stap voor stap door de eerste setup leidt.
          </p>
        </div>
        <a
          href="/dashboard"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
        >
          Open dashboard →
        </a>
      </div>

      {/* Layout: inhoudsopgave + content */}
      <div className="flex gap-8 items-start">
        {/* Zijbalk: inhoudsopgave — verborgen op mobiel */}
        <div className="hidden lg:block w-52 shrink-0">
          <TableOfContents />
        </div>

        {/* Secties */}
        <div className="flex-1 space-y-2">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              open={openSection === section.id}
              onToggle={() => toggle(section.id)}
            />
          ))}

          {/* Feature slideshow */}
          <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <p className="text-sm font-semibold text-foreground">CueBoard in de praktijk</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Klik door de functies om te zien hoe alles werkt.
              </p>
            </div>
            <FeatureSlideshow />
          </div>

          {/* Footer */}
          <div className="rounded-2xl border border-border/30 bg-card/50 p-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Mis je iets, of werkt iets anders dan verwacht?
            </p>
            <p className="text-xs text-muted-foreground/60">
              Geef feedback aan de beheerder van CueBoard — de app wordt actief doorontwikkeld.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
