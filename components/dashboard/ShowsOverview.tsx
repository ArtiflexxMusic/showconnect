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
  Pencil, Radio, Users, ArrowRight, Sparkles, LayoutList, ChevronLeft,
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
}

export function ShowsOverview({ shows: initialShows }: ShowsOverviewProps) {
  const supabase = createClient()
  const [shows, setShows]           = useState<ShowWithRundowns[]>(initialShows)
  const [deleteTarget, setDeleteTarget] = useState<ShowWithRundowns | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<ShowWithRundowns | null>(null)
  const [viewMode, setViewMode]     = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth]     = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = shows.filter((s) => !s.date || new Date(s.date) >= today)
  const past     = shows
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
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shows</h1>
            <p className="text-muted-foreground mt-1">
              {shows.length === 0
                ? 'Nog geen shows aangemaakt'
                : `${shows.length} show${shows.length !== 1 ? 's' : ''} gevonden`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Weergave-toggle */}
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
            <Button asChild size="sm">
              <Link href="/shows/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nieuwe show</span>
                <span className="sm:hidden">Nieuw</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Lege staat met onboarding-stappen */}
        {shows.length === 0 && (
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

        {/* ── Kalenderweergave ──────────────────────────────────────── */}
        {viewMode === 'calendar' && shows.length > 0 && (
          <CalendarView shows={shows} calMonth={calMonth} setCalMonth={setCalMonth} />
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

function ShowCard({
  show, past = false, onDelete, onEdit,
}: {
  show: ShowWithRundowns
  past?: boolean
  onDelete: () => void
  onEdit: () => void
}) {
  // Neem de eerste rundown als "actieve" rundown voor quick-go-live
  const primaryRundown = show.rundowns.find(r => r.is_active) ?? show.rundowns[0]

  return (
    <Card className="hover:border-primary/40 transition-colors">
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
            {/* Uitnodigen → ga direct naar show met team panel */}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              title="Show bewerken"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Show verwijderen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
