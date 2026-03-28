'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  CalendarDays, MapPin, ChevronLeft, Plus, Radio, Clock,
  Pencil, Trash2, Loader2, ListMusic, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Show } from '@/lib/types/database'
import { EditShowModal } from './EditShowModal'

interface RundownSummary {
  id: string
  name: string
  show_start_time: string | null
  created_at: string
  cues: { count: number }[]
}

interface ShowDashboardProps {
  show: Show
  rundowns: RundownSummary[]
}

export function ShowDashboard({ show: initialShow, rundowns: initialRundowns }: ShowDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [show, setShow]           = useState<Show>(initialShow)
  const [rundowns, setRundowns]   = useState<RundownSummary[]>(initialRundowns)
  const [editShowOpen, setEditShowOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState<RundownSummary | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  async function handleDeleteRundown() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await supabase.from('rundowns').delete().eq('id', deleteTarget.id)
    setDeleting(false)
    if (!error) {
      setRundowns((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      setDeleteError('Verwijderen mislukt. Probeer het opnieuw.')
    }
  }

  const cueCount = (r: RundownSummary) => r.cues?.[0]?.count ?? 0

  return (
    <div className="max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
      </div>

      {/* Show header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">{show.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {show.date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(show.date)}
              </span>
            )}
            {show.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {show.venue}
              </span>
            )}
          </div>
          {show.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{show.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditShowOpen(true)} className="shrink-0 gap-2">
          <Pencil className="h-3.5 w-3.5" /> Show bewerken
        </Button>
      </div>

      {/* Rundown lijst */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Rundowns
          </h2>
          <Button size="sm" asChild>
            <Link href={`/shows/${show.id}/rundown/new`}>
              <Plus className="h-4 w-4" /> Nieuwe rundown
            </Link>
          </Button>
        </div>

        {rundowns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
            <ListMusic className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">Nog geen rundowns</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Maak een rundown aan om te beginnen.</p>
            <Button className="mt-4" size="sm" asChild>
              <Link href={`/shows/${show.id}/rundown/new`}>
                <Plus className="h-4 w-4" /> Eerste rundown aanmaken
              </Link>
            </Button>
          </div>
        ) : (
          rundowns.map((rundown) => (
            <Card key={rundown.id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold">{rundown.name}</CardTitle>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListMusic className="h-3 w-3" />
                        {cueCount(rundown)} cues
                      </span>
                      {rundown.show_start_time && (
                        <span className="flex items-center gap-1 text-primary/70">
                          <Clock className="h-3 w-3" />
                          Aanvang {rundown.show_start_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => setDeleteTarget(rundown)}
                    title="Rundown verwijderen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Naar editor */}
                  <Button size="sm" asChild>
                    <Link href={`/shows/${show.id}/rundown/${rundown.id}`}>
                      <Pencil className="h-3.5 w-3.5" /> Editor
                    </Link>
                  </Button>

                  {/* Caller mode */}
                  <Button size="sm" variant="outline" className="gap-1.5 text-green-400 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50" asChild>
                    <a href={`/shows/${show.id}/rundown/${rundown.id}/caller`} target="_blank">
                      <Radio className="h-3.5 w-3.5" /> Caller
                    </a>
                  </Button>

                  {/* View links */}
                  <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                    <a href={`/shows/${show.id}/rundown/${rundown.id}/presenter`} target="_blank">
                      <ExternalLink className="h-3 w-3" /> Presenter
                    </a>
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                    <a href={`/shows/${show.id}/rundown/${rundown.id}/crew`} target="_blank">
                      <ExternalLink className="h-3 w-3" /> Crew
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit show modal */}
      <EditShowModal
        open={editShowOpen}
        show={show}
        onClose={() => setEditShowOpen(false)}
        onSaved={(updated) => setShow((prev) => ({ ...prev, ...updated }))}
      />

      {/* Delete rundown bevestiging */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v && !deleting) { setDeleteTarget(null); setDeleteError(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Rundown verwijderen
            </DialogTitle>
            <DialogDescription>
              Weet je zeker dat je <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> wilt verwijderen?
              Alle cues worden ook verwijderd en dit kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(null) }} disabled={deleting}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDeleteRundown} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verwijderen...</> : 'Ja, verwijder rundown'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
