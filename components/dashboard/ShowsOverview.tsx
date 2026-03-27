'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, MapPin, Plus, ChevronRight, ListMusic } from 'lucide-react'
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

export function ShowsOverview({ shows }: ShowsOverviewProps) {
  const upcoming = shows.filter((s) => s.date && new Date(s.date) >= new Date())
  const past     = shows.filter((s) => !s.date || new Date(s.date) < new Date())

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shows</h1>
          <p className="text-muted-foreground mt-1">
            {shows.length === 0 ? 'Nog geen shows aangemaakt' : `${shows.length} show${shows.length !== 1 ? 's' : ''} gevonden`}
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
            {upcoming.map((show) => <ShowCard key={show.id} show={show} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Afgelopen shows
          </h2>
          <div className="grid gap-3 opacity-75">
            {past.map((show) => <ShowCard key={show.id} show={show} past />)}
          </div>
        </section>
      )}
    </div>
  )
}

function ShowCard({ show, past = false }: { show: ShowWithRundowns; past?: boolean }) {
  const mainRundown = show.rundowns.find((r) => r.is_active) ?? show.rundowns[0]

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
          {past && (
            <Badge variant="outline" className="text-xs shrink-0">Afgelopen</Badge>
          )}
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
