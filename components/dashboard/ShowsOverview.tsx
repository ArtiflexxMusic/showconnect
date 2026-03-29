'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  CalendarDays, MapPin, Plus, ChevronRight, ListMusic, Trash2, Loader2,
  Pencil, Radio, Users, ArrowRight, Sparkles, LayoutList, ChevronLeft, Search, X,
  Share2, Archive,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { EditShowModal } from './EditShowModal'

interface RundownSummary {
  id: string
  name: string
  is_active: boolean
}

interface ShowWithRundowns {
  id: string
  name: string
  date: string | null
  venue: string | null
  description: string | null
  created_at: string
  rundowns: RundownSummary[]
}

interface ShowsOverviewProps {
  shows: ShowWithRundowns[]
  sharedShows?: ShowWithRundowns[]
  archivedShows?: ShowWithRundowns[]
  membershipMap?: Record<string, string>
}

export function ShowsOverview({ shows: initialShows, sharedShows: initialSharedShows = [], archivedShows = [], membershipMap = {} }: ShowsOverviewProps) {
  const supabase = createClient()
  const [shows, setShows]           = useState<ShowWithRundowns[]>(initialShows)
  const [sharedShows]               = useState<ShowWithRundowns[]>(initialSharedShows)
  const [deleteTarget, setDeleteTarget] = useState<ShowWithRundowns | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<ShowWithRundowns | null>(null)
  const [viewMode, setViewMode]     = useState<'list' | 'calendar'>('list')
  const [activeTab, setActiveTab]   = useState<'mine' | 'shared' | 'archived'>('mine')
  const [calMonth, setCalMonth]     = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [searchQuery, setSearchQuery] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Zoekfilter — match op naam, locatie of rundown naam
  const filteredShows = searchQuery.trim()
    ? shows.filter((s) => {
        const q = searchQuery.toLowerCase()
        return (
          s.name.toLowerCase().includes(q) ||
          (s.venue ?? '').toLowerCase().includes(q) ||
          s.rundowns.some((r) => r.name.toLowerCase().includes(q))
        )
      })
    : shows

  const upcoming = filteredShows.filter((s) => !s.date || new Date(s.date) >= today)
  const past     = filteredShows
    .filter((s) => s.date && new Date(s.date) < today)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('shows').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (!error) {
      setShows((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      setDeleteError('Verwijderen mislukt. Controleer je verbinding en probeer opnieuw.')
    }
  }

  function handleShowSaved(updated: { id: string; name: string; date: string | null; venue: string | null; description: string | null }) {
    setShows((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s))
  }

  return (
    <>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Shows</h1>
            <p className="text-muted-foreground mt-1">
              {activeTab === 'mine'
                ? (shows.length === 0
                    ? 'Nog geen shows aangemaakt'
                    : searchQuery.trim()
                      ? `${filteredShows.length} van ${shows.length} show${shows.length !== 1 ? 's' : ''}`
                      : `${shows.length} show${shows.length !== 1 ? 's' : ''}`)
                : `${sharedShows.length} gedeelde show${sharedShows.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Weergave-toggle — alleen in mijn shows */}
            {activeTab === 'mine' && (
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lijst</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Kalender</span>
                </button>
              </div>
            )}
            {activeTab === 'mine' && (
              <Button asChild size="sm">
                <Link href="/shows/new">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nieuwe show</span>
                  <span className="sm:hidden">Nieuw</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'mine'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mijn shows
            {shows.length > 0 && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {shows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'shared'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            Gedeeld met mij
            {sharedShows.length > 0 && (
              <span className="ml-1 text-xs bg-primary/15 text-primary rounded-full px-1.5 py-0.5">
                {sharedShows.length}
              </span>
            )}
          </button>
          {archivedShows.length > 0 && (
            <button
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'archived'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Archief
              <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                {archivedShows.length}
              </span>
            </button>
          )}
        </div>

        {/* Zoekbalk */}
        {activeTab === 'mine' && shows.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op show, locatie of rundown…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Lege staat met onboarding-stappen */}
        {activeTab === 'mine' && shows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center mb-8">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <p className="font-semibold text-lg">Welkom bij CueBoard!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Beheer je live shows als een pro. Zo begin je:
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { step: '1', title: 'Maak een show aan', desc: 'Geef je event een naam, datum en locatie.' },
                  { step: '2', title: 'Voeg een rundown toe', desc: 'Maak cues: video, spraak, licht, pauze…' },
                  { step: '3', title: 'Ga live', desc: 'Open de Caller mode en bestuur je show in realtime.' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mx-auto mb-2">
                      {step}
                    </div>
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/shows/new"><Plus className="h-4 w-4" /> Eerste show aanmaken</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Geen zoekresultaten */}
        {activeTab === 'mine' && searchQuery.trim() && filteredShows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Geen shows gevonden</p>
            <p className="text-sm mt-1">Probeer een andere zoekterm</p>
          </div>
        )}

        {/* ── Mijn shows tab ──────────────────────────────────────── */}
        {activeTab === 'mine' && (
          <>
            {/* Kalenderweergave */}
            {viewMode === 'calendar' && shows.length > 0 && (
              <CalendarView shows={filteredShows} calMonth={calMonth} setCalMonth={setCalMonth} />
            )}

            {viewMode === 'list' && upcoming.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Aankomende shows
                </h2>
                <div className="grid gap-3">
                  {upcoming.map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      onDelete={() => setDeleteTarget(show)}
                      onEdit={() => setEditTarget(show)}
                    />
                  ))}
                </div>
              </section>
            )}

            {viewMode === 'list' && past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Afgelopen shows
                </h2>
                <div className="grid gap-3 opacity-70">
                  {past.map((show) => (
                    <ShowCard
                      key={show.id}
                      show={show}
                      past
                      onDelete={() => setDeleteTarget(show)}
                      onEdit={() => setEditTarget(show)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Archief tab ─────────────────────────────────────────── */}
        {activeTab === 'archived' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              Gearchiveerde shows zijn nog steeds toegankelijk maar worden niet in je hoofdlijst getoond.
              Open een show om hem te dearchiveren.
            </p>
            {archivedShows.map((show) => (
              <Link
                key={show.id}
                href={`/shows/${show.id}`}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card px-5 py-4 hover:border-border transition-colors opacity-70 hover:opacity-100"
              >
                <div>
                  <p className="font-medium text-sm">{show.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {show.date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(show.date)}
                      </span>
                    )}
                    {show.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {show.venue}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {/* ── Gedeelde shows tab ──────────────────────────────────── */}
        {activeTab === 'shared' && (
          <>
            {sharedShows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-4">
                  <Share2 className="h-6 w-6 opacity-40" />
                </div>
                <p className="font-medium">Geen gedeelde shows</p>
                <p className="text-sm mt-1 text-muted-foreground/70">
                  Wanneer iemand je uitnodigt voor een show, verschijnt die hier.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {sharedShows.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    shared
                    sharedRole={membershipMap[show.id]}
                    onDelete={() => {}}
                    onEdit={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <EditShowModal
        open={!!editTarget}
        show={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleShowSaved}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !deleting) { setDeleteTarget(null); setDeleteError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> wilt verwijderen?
              Alle rundowns en cues worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive px-1">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={deleting}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verwijderen…</> : 'Ja, verwijder show'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const ROLE_LABELS: Record<string, string> = {
  owner:     'Eigenaar',
  editor:    'Editor',
  caller:    'Caller',
  crew:      'Crew',
  presenter: 'Presenter',
  viewer:    'Toeschouwer',
}

function ShowCard({
  show, past = false, shared = false, sharedRole, onDelete, onEdit,
}: {
  show: ShowWithRundowns
  past?: boolean
  shared?: boolean
  sharedRole?: string
  onDelete: () => void
  onEdit: () => void
}) {
  // Neem de eerste rundown als "actieve" rundown voor quick-go-live
  const primaryRundown = show.rundowns.find(r => r.is_active) ?? show.rundowns[0]

  return (
    <Card className={`hover:border-primary/40 transition-colors ${shared ? 'border-border/40 bg-muted/5' : ''}`}>
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">
                <Link href={`/shows/${show.id}`} className="hover:text-primary transition-colors">
                  {show.name}
                </Link>
              </CardTitle>
              {past && <Badge variant="outline" className="text-[10px] px-1.5">Afgelopen</Badge>}
              {shared && sharedRole && (
                <Badge variant="secondary" className="text-[10px] px-1.5 gap-1">
                  <Share2 className="h-2.5 w-2.5" />
                  {ROLE_LABELS[sharedRole] ?? sharedRole}
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-3 mt-1">
              {show.date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(show.date)}
                </span>
              )}
              {show.venue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {show.venue}
                </span>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Uitnodigen → ga direct naar show met team panel (alleen voor owners) */}
            {!shared && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                title="Team beheren & uitnodigen"
                asChild
              >
                <Link href={`/shows/${show.id}#team`}>
                  <Users className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            {!shared && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                title="Show bewerken"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {!shared && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Show verwijderen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4">
        {show.rundowns.length === 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nog geen rundown aangemaakt</span>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/shows/${show.id}/rundown/new`}>
                <Plus className="h-3.5 w-3.5" /> Rundown
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ga live knop — primaire actie */}
            {primaryRundown && !past && (
              <Button
                size="sm"
                className="gap-1.5 text-green-950 bg-green-400 hover:bg-green-300 border-0"
                asChild
              >
                <a href={`/shows/${show.id}/rundown/${primaryRundown.id}/caller`} target="_blank">
                  <Radio className="h-3.5 w-3.5" />
                  Ga live
                </a>
              </Button>
            )}

            {/* Rundown links */}
            {show.rundowns.map((rundown) => (
              <Button key={rundown.id} variant="outline" size="sm" asChild>
                <Link href={`/shows/${show.id}/rundown/${rundown.id}`}>
                  <ListMusic className="h-3.5 w-3.5" />
                  {rundown.name}
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Link>
              </Button>
            ))}

            {/* Show bekijken */}
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/shows/${show.id}`}>
                <ArrowRight className="h-3.5 w-3.5" />
                Show
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href={`/shows/${show.id}/rundown/new`}>
                <Plus className="h-3.5 w-3.5" /> Rundown
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Kalenderweergave ──────────────────────────────────────────────────────────
function CalendarView({
  shows,
  calMonth,
  setCalMonth,
}: {
  shows: ShowWithRundowns[]
  calMonth: { year: number; month: number }
  setCalMonth: (m: { year: number; month: number }) => void
}) {
  const { year, month } = calMonth
  const firstDay   = new Date(year, month, 1)
  const lastDay    = new Date(year, month + 1, 0)
  const startDow   = (firstDay.getDay() + 6) % 7 // Ma=0 … Zo=6
  const daysInMonth = lastDay.getDate()

  const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
  const MONTHS = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December']

  // Bouw grid: lege cellen vóór + alle dagcellen
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Vul aan tot veelvoud van 7
  while (cells.length % 7 !== 0) cells.push(null)

  const showsByDate: Record<string, ShowWithRundowns[]> = {}
  for (const show of shows) {
    if (!show.date) continue
    const d = new Date(show.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString()
      if (!showsByDate[key]) showsByDate[key] = []
      showsByDate[key].push(show)
    }
  }

  const todayDate = new Date()
  const isToday = (day: number) =>
    todayDate.getFullYear() === year && todayDate.getMonth() === month && todayDate.getDate() === day

  function prevMonth() {
    setCalMonth(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })
  }
  function nextMonth() {
    setCalMonth(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })
  }

  return (
    <div className="mb-8">
      {/* Header navigatie */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-semibold">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dag-headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Cellen */}
      <div className="grid grid-cols-7 border-l border-t border-border/40 rounded-lg overflow-hidden">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`min-h-[48px] sm:min-h-[80px] border-r border-b border-border/40 p-1 sm:p-1.5 ${!day ? 'bg-muted/10' : 'bg-card'}`}
          >
            {day && (
              <>
                <p className={`text-xs font-mono mb-1 w-6 h-6 flex items-center justify-center rounded-full leading-none
                  ${isToday(day) ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
                  {day}
                </p>
                {(showsByDate[day.toString()] ?? []).map(show => (
                  <Link key={show.id} href={`/shows/${show.id}`}
                    className="block text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded px-1 py-0.5 mb-0.5 truncate hover:bg-primary/20 transition-colors">
                    {show.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
