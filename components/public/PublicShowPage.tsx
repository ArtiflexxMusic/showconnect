'use client'

import Link from 'next/link'
import { CalendarDays, MapPin, Radio, Clock, ExternalLink, Clapperboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Rundown {
  id: string
  name: string
  show_start_time: string | null
  is_active: boolean
}

interface Show {
  id: string
  name: string
  date: string | null
  venue: string | null
  description: string | null
}

interface PublicShowPageProps {
  show: Show
  rundowns: Rundown[]
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return null
  return timeStr.slice(0, 5) // "HH:MM"
}

export function PublicShowPage({ show, rundowns }: PublicShowPageProps) {
  const activeRundown = rundowns.find(r => r.is_active)

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Top bar */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clapperboard className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">CueBoard</span>
        </div>
        {activeRundown && (
          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 flex items-center gap-1.5 animate-pulse">
            <Radio className="h-2.5 w-2.5" />
            Live
          </Badge>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Show header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">{show.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {show.date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 shrink-0" />
                {formatDate(show.date)}
              </span>
            )}
            {show.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {show.venue}
              </span>
            )}
          </div>
          {show.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{show.description}</p>
          )}
        </div>

        {/* Programma */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Programma
          </h2>

          {rundowns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Er zijn nog geen rundowns beschikbaar.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rundowns.map((rundown) => (
                <Link
                  key={rundown.id}
                  href={`/status/${show.id}/${rundown.id}`}
                  target="_blank"
                  className="group relative flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {rundown.is_active && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-sm">{rundown.name}</p>
                      {rundown.show_start_time && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          Aanvang {formatTime(rundown.show_start_time)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rundown.is_active ? (
                      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] flex items-center gap-1">
                        <Radio className="h-2.5 w-2.5" />
                        Live status
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        Programma <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground/60 text-center">
          Gedeeld via <a href="https://cueboard.nl" className="hover:text-muted-foreground transition-colors">CueBoard</a>
        </div>
      </div>
    </div>
  )
}
