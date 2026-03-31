'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
  Copy, QrCode, X, Monitor, Share2, Check, Archive, ArchiveRestore, Zap, Briefcase, FileText,
} from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import type { Show, ShowMember, Invitation, ShowMemberRole } from '@/lib/types/database'
import { InfoButton } from '@/components/ui/info-button'

// Lazy-loaded: worden niet in de initiële JS-bundle meegenomen.
// Ze laden pas wanneer de gebruiker op de knop klikt — scheelt ~150KB JS.
const EditShowModal   = dynamic(() => import('./EditShowModal').then(m => ({ default: m.EditShowModal })), { ssr: false })
const ShowMembersPanel  = dynamic(() => import('@/components/team/ShowMembersPanel').then(m => ({ default: m.ShowMembersPanel })), { ssr: false })
const GreenRoomPanel   = dynamic(() => import('@/components/green-room/GreenRoomPanel').then(m => ({ default: m.GreenRoomPanel })), { ssr: false })
const CallsheetPanel   = dynamic(() => import('@/components/callsheet/CallsheetPanel').then(m => ({ default: m.CallsheetPanel })), { ssr: false })

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
  members?: ShowMember[]      // optioneel — ShowMembersPanel fetcht zelf
  invitations?: Invitation[]  // optioneel — ShowMembersPanel fetcht zelf
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
  const [showGreenRoom, setShowGreenRoom]   = useState(false)
  const [showCallsheet, setShowCallsheet]   = useState(false)
  const [autoOpenInvite, setAutoOpenInvite] = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState<RundownSummary | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)
  const [duplicating, setDuplicating]       = useState(false)
  const [qrUrl, setQrUrl]                   = useState<string | null>(null)
  const [qrLabel, setQrLabel]               = useState('')
  const [sharecopied, setShareCopied]       = useState(false)
  const [archiving, setArchiving]           = useState(false)

  async function handleArchiveShow() {
    setArchiving(true)
    const isArchived = !!show.archived_at
    await supabase
      .from('shows')
      .update({ archived_at: isArchived ? null : new Date().toISOString() })
      .eq('id', show.id)
    setArchiving(false)
    // Terug naar dashboard na archiveren
    if (!isArchived) router.push('/dashboard')
    else router.refresh()
  }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ name: `${show.name} (kopie)`, date: show.date, venue: show.venue, description: show.description, client: (show as any).client ?? null })
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
    <div className="max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Overzicht
        </Link>
      </div>

      {/* Show header */}
      <div className="mb-7">
        {/* Titel + meta */}
        <h1 className="text-3xl font-bold tracking-tight">{show.name}</h1>
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
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(show as any).client && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(show as any).client}
            </span>
          )}
        </div>
        {show.description && (
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{show.description}</p>
        )}

        {/* Actie-toolbar — één regel, links uitgelijnd, scrollt horizontaal op kleine schermen */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border/40 flex-wrap">

          {/* Samenwerking */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/20 overflow-hidden divide-x divide-border/40 shrink-0">
            <button
              onClick={() => { setAutoOpenInvite(true); setShowMembers(true) }}
              className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
              title="Nodig collega's uit om de rundown mee te bewerken of mee te kijken."
            >
              <UserPlus className="h-3.5 w-3.5" /> Uitnodigen
            </button>
            <button
              onClick={() => { setAutoOpenInvite(false); setShowMembers(true) }}
              className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium hover:bg-muted/60 transition-colors whitespace-nowrap"
              title="Bekijk en beheer alle teamleden en hun rollen."
            >
              <Users className="h-3.5 w-3.5" /> Team
            </button>
            <button
              onClick={() => setShowGreenRoom(true)}
              className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium hover:bg-muted/60 transition-colors whitespace-nowrap"
              title="Geef gasten toegang tot de Green Room met een 6-cijferige PIN — zonder account."
            >
              <Radio className="h-3.5 w-3.5" /> Green Room
            </button>
            <button
              onClick={() => setShowCallsheet(true)}
              className="flex items-center gap-1.5 px-2.5 h-7 text-xs font-medium hover:bg-muted/60 transition-colors whitespace-nowrap"
              title="Maak en verstuur een callsheet naar je crew."
            >
              <FileText className="h-3.5 w-3.5" /> Callsheet
            </button>
          </div>

          {/* Scheiding */}
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

          {/* Show-acties */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline" size="sm"
              onClick={() => setEditShowOpen(true)}
              className="gap-1.5 h-7 text-xs px-2.5 whitespace-nowrap"
              title="Pas de naam, datum, locatie en omschrijving van deze show aan."
            >
              <Pencil className="h-3 w-3" /> Bewerken
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={handleDuplicateShow}
              disabled={duplicating}
              className="gap-1.5 h-7 text-xs px-2.5 whitespace-nowrap"
              title="Maak een volledige kopie van deze show inclusief alle rundowns en cues."
            >
              {duplicating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />}
              Dupliceren
            </Button>
            <Button
              variant="outline" size="sm"
              className="gap-1.5 h-7 text-xs px-2.5 whitespace-nowrap"
              title="Kopieer de publieke link van deze show."
              onClick={async () => {
                const url = `${window.location.origin}/p/${show.id}`
                await navigator.clipboard.writeText(url)
                setShareCopied(true)
                setTimeout(() => setShareCopied(false), 2500)
              }}
            >
              {sharecopied
                ? <><Check className="h-3 w-3 text-emerald-400" /> Gekopieerd!</>
                : <><Share2 className="h-3 w-3" /> Delen</>
              }
            </Button>
          </div>

          {/* Archiveren (secundaire actie, alleen voor owner) */}
          {currentUserRole === 'owner' && (
            <>
              <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0"
                onClick={handleArchiveShow}
                disabled={archiving}
                title={show.archived_at ? 'Haal deze show terug uit het archief.' : 'Verplaats deze show naar het archief.'}
              >
                {archiving
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : show.archived_at ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />
                }
                {show.archived_at ? 'Dearchiveren' : 'Archiveren'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Quick launch ──────────────────────────────────────────────────────── */}
      {rundowns.length > 0 && (() => {
        const primary = rundowns.find(r => r.cues?.[0]?.count != null) ?? rundowns[0]
        const base = `/shows/${show.id}/rundown/${primary.id}`
        const tiles = [
          { label: 'Caller', href: `${base}/caller`, icon: <Radio className="h-4 w-4" />, accent: true, desc: 'Go live' },
          { label: 'Editor', href: `${base}`, icon: <Pencil className="h-4 w-4" />, desc: 'Bewerken', internal: true },
          { label: 'Presenter', href: `${base}/presenter`, icon: <ExternalLink className="h-4 w-4" />, desc: 'Sprekers' },
          { label: 'Crew', href: `${base}/crew`, icon: <Users className="h-4 w-4" />, desc: 'Backstage' },
          { label: 'Programma', href: `/status/${show.id}/${primary.id}`, icon: <Globe className="h-4 w-4" />, desc: 'Publiek' },
          { label: 'Output', href: `${base}/output`, icon: <Monitor className="h-4 w-4" />, desc: 'Beamer/mixer' },
        ]
        return (
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snel starten</span>
              {rundowns.length > 1 && (
                <span className="text-[10px] text-muted-foreground/50">— {primary.name}</span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {tiles.map(({ label, href, icon, accent, desc, internal }) => (
                internal ? (
                  <Link
                    key={label}
                    href={href}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      accent
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border'
                    }`}
                  >
                    {icon}
                    <span className="text-[11px] font-semibold leading-none">{label}</span>
                    <span className="text-[10px] opacity-60 leading-none">{desc}</span>
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      accent
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-border'
                    }`}
                  >
                    {icon}
                    <span className="text-[11px] font-semibold leading-none">{label}</span>
                    <span className="text-[10px] opacity-60 leading-none">{desc}</span>
                  </a>
                )
              ))}
            </div>
            {/* Green Room quick-add knop */}
            <button
              onClick={() => setShowGreenRoom(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/70 text-muted-foreground hover:text-foreground transition-all py-2 text-xs font-medium"
            >
              <Radio className="h-3.5 w-3.5" />
              Green Room openen — gasten toevoegen &amp; beheren
            </button>
          </div>
        )
      })()}

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

      {/* Green Room panel */}
      <GreenRoomPanel
        showId={show.id}
        open={showGreenRoom}
        onClose={() => setShowGreenRoom(false)}
      />

      {/* Callsheet panel */}
      <CallsheetPanel
        showId={show.id}
        showName={show.name}
        showDate={show.date ?? null}
        showVenue={show.venue ?? null}
        showClient={(show as any).client ?? null}
        showDescription={show.description ?? null}
        open={showCallsheet}
        onClose={() => setShowCallsheet(false)}
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
