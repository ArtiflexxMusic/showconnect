'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarDays, MapPin, Loader2, Mail, Printer, Users,
  ChevronDown, ChevronUp, Briefcase, Save, Check, Clock,
  FileText, Edit3,
} from 'lucide-react'
import { cn, formatDate, formatDuration } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

interface CallsheetPanelProps {
  showId: string
  showName: string
  showDate: string | null
  showVenue: string | null
  showClient: string | null
  showDescription: string | null
  open: boolean
  onClose: () => void
}

interface CrewMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

interface RundownSummary {
  id: string
  name: string
  show_start_time: string | null
  cues: Cue[]
}

interface CallsheetNotes {
  briefing: string
  location: string
  parking: string
  catering: string
  technical: string
  contacts: string
  extra: string
}

const EMPTY_NOTES: CallsheetNotes = {
  briefing: '',
  location: '',
  parking: '',
  catering: '',
  technical: '',
  contacts: '',
  extra: '',
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar',
  editor: 'Editor',
  viewer: 'Kijker',
  caller: 'Caller',
  crew: 'Crew',
}

function Section({ title, icon, children, defaultOpen = true }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  )
}

export function CallsheetPanel({ showId, showName, showDate, showVenue, showClient, showDescription, open, onClose }: CallsheetPanelProps) {
  const supabase = createClient()

  const [crew, setCrew]         = useState<CrewMember[]>([])
  const [rundowns, setRundowns] = useState<RundownSummary[]>([])
  const [loading, setLoading]   = useState(false)
  const [notes, setNotes]       = useState<CallsheetNotes>(EMPTY_NOTES)
  const [saved, setSaved]       = useState(false)
  const [sending, setSending]   = useState(false)
  const [sendDone, setSendDone] = useState(false)
  const [editSection, setEditSection] = useState<keyof CallsheetNotes | null>(null)

  const storageKey = `callsheet_notes_${showId}`

  // Laad opgeslagen notities uit localStorage
  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setNotes(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [open, storageKey])

  // Laad crew en rundowns wanneer paneel opent
  const loadData = useCallback(async () => {
    setLoading(true)
    const [membersRes, rundownsRes] = await Promise.all([
      supabase
        .from('show_members')
        .select('id, role, profiles(full_name, email)')
        .eq('show_id', showId),
      supabase
        .from('rundowns')
        .select('id, name, show_start_time')
        .eq('show_id', showId)
        .order('created_at', { ascending: true }),
    ])

    if (membersRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: CrewMember[] = membersRes.data.map((m: any) => ({
        id: m.id,
        full_name: m.profiles?.full_name ?? null,
        email: m.profiles?.email ?? null,
        role: m.role,
      }))
      setCrew(mapped)
    }

    if (rundownsRes.data) {
      // Laad cues voor elk rundown
      const rundownsWithCues = await Promise.all(
        rundownsRes.data.map(async (r) => {
          const { data: cues } = await supabase
            .from('cues')
            .select('id, title, type, duration_seconds, presenter, position, status, notes, tech_notes')
            .eq('rundown_id', r.id)
            .order('position', { ascending: true })
          return { ...r, cues: (cues ?? []) as Cue[] }
        })
      )
      setRundowns(rundownsWithCues)
    }

    setLoading(false)
  }, [showId, supabase])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  function saveNotes() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes))
      setSaved(true)
      setEditSection(null)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
  }

  async function sendToCrewEmails() {
    const recipients = crew.filter(m => m.email)
    if (recipients.length === 0) {
      alert('Geen crew-leden met e-mailadres gevonden.')
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/shows/${showId}/callsheet/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, recipients }),
      })
      if (res.ok) {
        setSendDone(true)
        setTimeout(() => setSendDone(false), 4000)
      } else {
        const data = await res.json()
        alert(`Versturen mislukt: ${data.error ?? 'Onbekende fout'}`)
      }
    } catch (err) {
      alert('Netwerkfout bij versturen.')
    }
    setSending(false)
  }

  function handlePrint() {
    window.open(`/shows/${showId}/callsheet/print`, '_blank')
  }

  const emailsWithAddress = crew.filter(m => m.email)

  const NOTE_FIELDS: { key: keyof CallsheetNotes; label: string; placeholder: string }[] = [
    { key: 'briefing',  label: 'Briefing / algemene info',  placeholder: 'Doel van de show, dresscode, bijzonderheden…' },
    { key: 'location',  label: 'Locatie & bereikbaarheid',  placeholder: 'Adres, routebeschrijving, ingang voor crew…' },
    { key: 'parking',   label: 'Parkeren',                   placeholder: 'Waar kun je parkeren, kosten, laad/losplek…' },
    { key: 'catering',  label: 'Catering',                   placeholder: 'Ontbijt/lunch/diner tijden, dieetwensen, bar…' },
    { key: 'technical', label: 'Technische info',            placeholder: 'Stroomgroepen, netwerk, patching schema, wifi…' },
    { key: 'contacts',  label: 'Contactpersonen',            placeholder: 'Producent: 06-xxx, Technisch: 06-yyy, Venue: 06-zzz…' },
    { key: 'extra',     label: 'Extra notities',             placeholder: 'Overige relevante info voor de dag…' },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg">Callsheet</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Stuur de show-info naar je crew
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Opgeslagen
                </span>
              )}
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 h-8 text-xs">
                <Printer className="h-3.5 w-3.5" /> Afdrukken
              </Button>
              <Button
                size="sm"
                onClick={sendToCrewEmails}
                disabled={sending || emailsWithAddress.length === 0}
                className={cn(
                  'gap-1.5 h-8 text-xs',
                  sendDone ? 'bg-green-600 hover:bg-green-500' : ''
                )}
              >
                {sending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Versturen…</>
                  : sendDone ? <><Check className="h-3.5 w-3.5" /> Verstuurd!</>
                  : <><Mail className="h-3.5 w-3.5" /> Stuur naar crew ({emailsWithAddress.length})</>
                }
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Laden…</span>
            </div>
          ) : (
            <>
              {/* Show details */}
              <Section title="Showdetails" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Show</p>
                    <p className="font-semibold">{showName}</p>
                  </div>
                  {showClient && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Opdrachtgever</p>
                      <p className="font-medium">{showClient}</p>
                    </div>
                  )}
                  {showDate && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Datum</p>
                      <p className="font-medium">{formatDate(showDate)}</p>
                    </div>
                  )}
                  {showVenue && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Locatie</p>
                      <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{showVenue}</p>
                    </div>
                  )}
                  {showDescription && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Omschrijving</p>
                      <p className="text-muted-foreground">{showDescription}</p>
                    </div>
                  )}
                </div>
              </Section>

              {/* Bewerkbare secties */}
              {NOTE_FIELDS.map(({ key, label, placeholder }) => (
                <Section key={key} title={label} icon={<Edit3 className="h-4 w-4 text-muted-foreground" />} defaultOpen={!!notes[key]}>
                  {editSection === key ? (
                    <div className="space-y-2">
                      <textarea
                        value={notes[key]}
                        onChange={(e) => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        rows={4}
                        className="w-full text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveNotes} className="gap-1.5 h-7 text-xs">
                          <Save className="h-3 w-3" /> Opslaan
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditSection(null)} className="h-7 text-xs">
                          Annuleren
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setEditSection(key)}
                      className="group cursor-text min-h-[36px]"
                    >
                      {notes[key] ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap">{notes[key]}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground/40 italic">{placeholder}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/30 mt-1 group-hover:text-muted-foreground/60 transition-colors">
                        Klik om te bewerken
                      </p>
                    </div>
                  )}
                </Section>
              ))}

              {/* Crew overzicht */}
              <Section title={`Crew (${crew.length})`} icon={<Users className="h-4 w-4 text-blue-400" />}>
                {crew.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nog geen crew-leden uitgenodigd.</p>
                ) : (
                  <div className="space-y-2">
                    {crew.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{m.full_name ?? '—'}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </div>
                        {m.email && (
                          <a
                            href={`mailto:${m.email}`}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {m.email}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* Programma overview */}
              {rundowns.map(r => (
                <Section
                  key={r.id}
                  title={`Programma: ${r.name}`}
                  icon={<Clock className="h-4 w-4 text-green-400" />}
                  defaultOpen={rundowns.length === 1}
                >
                  {r.cues.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Geen cues in deze rundown.</p>
                  ) : (
                    <div className="space-y-1">
                      {r.cues.map((cue, idx) => (
                        <div
                          key={cue.id}
                          className="flex items-center gap-3 text-sm py-1.5 border-b border-border/20 last:border-0"
                        >
                          <span className="text-xs font-mono text-muted-foreground/50 w-6 shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="flex-1 font-medium truncate">{cue.title}</span>
                          {cue.presenter && (
                            <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">
                              {cue.presenter}
                            </span>
                          )}
                          <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                            {formatDuration(cue.duration_seconds)}
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground/50 text-right pt-1">
                        Totaal: {formatDuration(r.cues.reduce((s, c) => s + c.duration_seconds, 0))}
                      </p>
                    </div>
                  )}
                </Section>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between text-xs text-muted-foreground/50">
          <span>Notities worden lokaal opgeslagen in je browser.</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={saveNotes}>
            <Save className="h-3 w-3" /> Alles opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
