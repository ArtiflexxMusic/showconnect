export interface ChangelogEntry {
  version: string
  date: string          // ISO YYYY-MM-DD
  title: string
  items: string[]
  highlight?: boolean   // Toon als "nieuw" badge
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.7',
    date: '2026-03-29',
    title: 'Bulk-acties, Companion status & meer',
    highlight: true,
    items: [
      'Cue bulk-acties: selecteer meerdere cues om te verwijderen of van type te wisselen',
      'Companion webhook-badge in de rundown-editor — klik om de verbinding te testen',
      'Show dupliceren vanuit het dashboard met één klik',
      'Dynamische OG-image voor gedeelde show-links',
      'Trial-herinnering 3 dagen van tevoren per e-mail',
      'Admin: MRR-schatting, verloopalarm voor trials en sorteeropties',
    ],
  },
  {
    version: '1.6',
    date: '2026-03-10',
    title: 'Archiveren, publieke show-pagina & plan-limieten',
    items: [
      'Shows archiveren en dearchiveren vanuit het dashboard',
      'Publieke show-pagina (/p/...) deelbaar zonder inlog',
      'Plan-limiet popup in de editor bij Free-gebruikers',
      'Rolewissel in Teamleden-modal opgelost (native select)',
      'Betere lege-staat op het dashboard bij geen shows',
    ],
  },
  {
    version: '1.5',
    date: '2026-02-20',
    title: 'Cue-log, snapshots & presentatie-upload',
    items: [
      'Cue-log: tijdlijn van alle uitgevoerde cues per rundown',
      'Snapshot-functie: bewaar een versie van je rundown en herstel hem later',
      'Presentatie-upload: PPTX/PDF directe upload naar cue',
      'Ping Presenter-knop: stuur een ping naar het presenterscherm',
    ],
  },
  {
    version: '1.4',
    date: '2026-01-15',
    title: 'Templates, import & chat',
    items: [
      'Rundown-templates: sla rundowns op en laad ze in elke show',
      'CSV/Excel import voor cues',
      'In-editor chat voor het hele team',
      'Mic patch paneel voor microfoonbeheer',
    ],
  },
]

/** Geeft de meest recente versie-string terug */
export const LATEST_VERSION = CHANGELOG[0].version
