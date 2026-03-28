'use client'

import { useState, useEffect } from 'react'
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
  Pencil, Trash2, Loader2, ListMusic, ExternalLink, AlertTriangle, Users, UserPlus, Globe,
  Copy, QrCode, X, Monitor,
} from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Show, ShowMember, Invitation, ShowMemberRole } from '@/lib/types/database'
import { EditShowModal } from './EditShowModal'
import { ShowMembersPanel } from '@/components/team/ShowMembersPanel'
import { CastMembersPanel } from '@/components/cast/CastMembersPanel'
import { InfoButton } from '@/components/ui/info-button'

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
  members?: ShowMember[]
  invitations?: Invitation[]
  currentUserRole?: ShowMemberRole
}

export function ShowDashboard({
  show: initialShow, rundowns: initialRundowns,
  members = [], invitations = [], currentUserRole = 'viewer',
}: ShowDashboardProps) {
  const router = useRouter()
  const supabase = createClient()

  // Open team panel direct als URL #team heeft
  useEffect(() => {
    if (window.location.hash === '#team') setShowMembers(true)
  }, [])

  const [show, setShow]           = useState<Show>(initialShow)
  const [rundowns, setRundowns]   = useState<RundownSummary[]>(initialRundowns)
  const [editShowOpen, setEditShowOpen]     = useState(false)
  const [showMembers, setShowMembers]       = useState(false)
  const [showCast, setShowCast]             = useState(false)
  const [autoOpenInvite, setAutoOpenInvite] = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState<RundownSummary | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)
  const [duplicating, setDuplicating]       = useState(false)
  const [qrUrl, setQrUrl]                   = useState<string | null>(null)
  const [qrLabel, setQrLabel]               = useState('')

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

  // ── Show dupliceren ────────────────────────────────────────────────────────
  async function handleDuplicateShow() {
    setDuplicating(true)
    try {
      // Nieuwe show aanmaken
      const { data: newShow, error: showError } = await supabase
        .from('shows')
        .insert({ name: `${show.name} (kopie)`, date: show.date, venue: show.venue, description: show.description })
        .select()
        .single()
      if (showError || !newShow) throw showError

      // Huidige rundowns ophalen met cues
      for (const rd of rundowns) {
        const { data: newRd } = await supabase
          .from('rundowns')
          .insert({ show_id: newShow.id, name: rd.name })
          .select()
          .single()
        if (!newRd) continue

        // Cues ophalen en kopiëren
        const { data: cues } = await supabase
          .from('cues')
          .select('*')
          .eq('rundown_id', rd.id)
          .order('position', { ascending: true })
        if (cues && cues.length > 0) {
          await supabase.from('cues').insert(
            cues.map(({ id: _id, created_at: _c, updated_at: _u, started_at: _s, status: _st, ...rest }) => ({
              ...rest,
              rundown_id: newRd.id,
              status: 'pending' as const,
              started_at: null,
            }))
          )
        }
      }

      router.push(`/shows/${newShow.id}`)
    } catch (e) {
      console.error('Dupliceren mislukt:', e)
    } finally {
      setDuplicating(false)
    }
  }

  // ── QR-code tonen ─────────────────────────────────────────────────────────
  function showQr(url: string, label: string) {
    setQrUrl(url)
    setQrLabel(label)
  }

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
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              onClick={() => { setAutoOpenInvite(true); setShowMembers(true) }}
              className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Uitnodigen
            </Button>
            <InfoButton section="uitnodigen" text="Nodig collega's uit om de rundown mee te bewerken of mee te kijken." />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setShowCast(true)} className="gap-2">
              <Radio className="h-3.5 w-3.5" />
              Cast
            </Button>
            <InfoButton section="cast" text="Voeg sprekers of artiesten toe met een 6-cijferige PIN — zonder account." />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setAutoOpenInvite(false); setShowMembers(true) }} className="gap-2">
              <Users className="h-3.5 w-3.5" />
              Team
              {members.length > 0 && (
                <span className="ml-0.5 text-xs bg-muted rounded-full px-1.5 py-0.5 leading-none">
                  {members.length}
                </span>
              )}
            </Button>
            <InfoButton section="uitnodigen" text="Bekijk en beheer alle teamleden en hun rollen." />
          </div>
          <Button variant="outline" size="sm" onClick={handleDuplicateShow} disabled={duplicating} className="gap-2">
            {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Dupliceren
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditShowOpen(true)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Bewerken
          </Button>
        </div>
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

                  {/* View links met QR */}
                  <div className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                      <a href={`/shows/${show.id}/rundown/${rundown.id}/presenter`} target="_blank">
                        <ExternalLink className="h-3 w-3" /> Presenter
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                      title="QR-code tonen"
                      onClick={() => showQr(`${window.location.origin}/shows/${show.id}/rundown/${rundown.id}/presenter`, 'Presenter view')}>
                      <QrCode className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                      <a href={`/shows/${show.id}/rundown/${rundown.id}/crew`} target="_blank">
                        <ExternalLink className="h-3 w-3" /> Crew
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                      title="QR-code tonen"
                      onClick={() => showQr(`${window.location.origin}/shows/${show.id}/rundown/${rundown.id}/crew`, 'Crew view')}>
                      <QrCode className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                      <a href={`/status/${show.id}/${rundown.id}`} target="_blank">
                        <Globe className="h-3 w-3" /> Programma
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                      title="QR-code tonen"
                      onClick={() => showQr(`${window.location.origin}/status/${show.id}/${rundown.id}`, 'Programmascherm')}>
                      <QrCode className="h-3 w-3" />
                    </Button>
                    <InfoButton section="publiek" text="Backstage programmascherm — laat sprekers en crew zien welke cue er nu live is. Geen login nodig." />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" asChild>
                      <a href={`/shows/${show.id}/rundown/${rundown.id}/output`} target="_blank">
                        <Monitor className="h-3 w-3" /> Presentatie
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50 hover:text-muted-foreground"
                      title="QR-code tonen"
                      onClick={() => showQr(`${window.location.origin}/shows/${show.id}/rundown/${rundown.id}/output`, 'Presentatie output')}>
                      <QrCode className="h-3 w-3" />
                    </Button>
                    <InfoButton section="presentatie" text="Fullscreen slide output voor je videomixer of beamer. Upload eerst een PDF in de rundown-instellingen." />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Cast panel */}
      <CastMembersPanel
        showId={show.id}
        open={showCast}
        onClose={() => setShowCast(false)}
      />

      {/* Team leden panel */}
      {showMembers && (
        <ShowMembersPanel
          showId={show.id}
          showName={show.name}
          currentUserRole={currentUserRole}
          members={members}
          invitations={invitations}
          onClose={() => { setShowMembers(false); setAutoOpenInvite(false) }}
          autoOpenInvite={autoOpenInvite}
        />
      )}

      {/* Edit show modal */}
      <EditShowModal
        open={editShowOpen}
        show={show}
        onClose={() => setEditShowOpen(false)}
        onSaved={(updated) => setShow((prev) => ({ ...prev, ...updated }))}
      />

      {/* QR-code modal */}
      {qrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQrUrl(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="font-semibold text-sm">{qrLabel}</p>
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{qrUrl}</p>
              </div>
              <button onClick={() => setQrUrl(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* QR via gratis API — geen npm package nodig */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUrl)}&size=220x220&margin=10&color=6366f1&bgcolor=0f172a`}
              alt="QR-code"
              className="rounded-lg border border-border"
              width={220}
              height={220}
            />
            <div className="flex gap-2 w-full">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(qrUrl); }}>
                Link kopiëren
              </Button>
              <Button size="sm" className="flex-1" onClick={() => window.open(qrUrl, '_blank')}>
                Openen
              </Button>
            </div>
          </div>
        </div>
      )}

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
