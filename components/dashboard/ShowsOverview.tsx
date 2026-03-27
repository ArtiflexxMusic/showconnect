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
import { CalendarDays, MapPin, Plus, ChevronRight, ListMusic, Trash2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ShowWithRundowns {
  id: string
  name: string
  date: string | null
  venue: string | null
  description: string | null
  created_at: string
  rundowns: { id: string; name: string; is_active: boolean }[]
}

interface ShowsOverviewProps {
  shows: ShowWithRundowns[]
}

export function ShowsOverview({ shows: initialShows }: ShowsOverviewProps) {
  const supabase = createClient()
  const [shows, setShows] = useState<ShowWithRundowns[]>(initialShows)
  const [deleteTarget, setDeleteTarget] = useState<ShowWithRundowns | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Geen datum = aankomend (gepland maar nog niet ingepland)
  const upcoming = shows.filter((s) => !s.date || new Date(s.date) >= today)
  const past     = shows.filter((s) => s.date && new Date(s.date) < today)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime()) // meest recent bovenaan

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

  return (
    <>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Shows</h1>
            <p className="text-muted-foreground mt-1">
              {shows.length === 0
                ? 'Nog geen shows aangemaakt'
                : `${shows.length} show${shows.length !== 1 ? 's' : ''} gevonden`}
            </p>
          </div>
          <Button asChild>
            <Link href="/shows/new">
              <Plus className="h-4 w-4" /> Nieuwe show
            </Link>
          </Button>
        </div>

        {shows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <ListMusic className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Geen shows gevonden</p>
              <p className="text-sm text-muted-foreground mb-4">
                Maak je eerste show aan en begin met je rundown.
              </p>
              <Button asChild size="sm">
                <Link href="/shows/new"><Plus className="h-4 w-4" /> Show aanmaken</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Aankomende shows
            </h2>
            <div className="grid gap-3">
              {upcoming.map((show) => (
                <ShowCard key={show.id} show={show} onDelete={() => setDeleteTarget(show)} />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Afgelopen shows
            </h2>
            <div className="grid gap-3 opacity-75">
              {past.map((show) => (
                <ShowCard key={show.id} show={show} past onDelete={() => setDeleteTarget(show)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bevestigingsdialoog show verwijderen */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !deleting) { setDeleteTarget(null); setDeleteError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Show verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> wilt verwijderen?
              Alle bijbehorende rundowns en cues worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive px-1">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={deleting}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Verwijderen...</>
                : 'Ja, verwijder show'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ShowCard({
  show,
  past = false,
  onDelete,
}: {
  show: ShowWithRundowns
  past?: boolean
  onDelete: () => void
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{show.name}</CardTitle>
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
          <div className="flex items-center gap-2 shrink-0">
            {past && (
              <Badge variant="outline" className="text-xs">Afgelopen</Badge>
            )}
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

      <CardContent className="pt-0">
        {show.rundowns.length === 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Nog geen rundown aangemaakt</span>
            <CreateRundownButton showId={show.id} />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {show.rundowns.map((rundown) => (
              <Button key={rundown.id} variant="outline" size="sm" asChild>
                <Link href={`/shows/${show.id}/rundown/${rundown.id}`}>
                  <ListMusic className="h-3.5 w-3.5" />
                  {rundown.name}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            ))}
            <CreateRundownButton showId={show.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CreateRundownButton({ showId }: { showId: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
      <Link href={`/shows/${showId}/rundown/new`}>
        <Plus className="h-3.5 w-3.5" /> Rundown
      </Link>
    </Button>
  )
}
