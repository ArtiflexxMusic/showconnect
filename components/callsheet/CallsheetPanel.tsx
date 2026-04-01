'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarDays, MapPin, Loader2, Mail, Printer, Users,
  Save, Check, Clock, FileText, Phone, Wifi, UtensilsCrossed,
  Car, AlertCircle, Shirt, Info, ChevronRight, Eye, Edit3,
} from 'lucide-react'
import { cn, formatDate, formatDuration, calculateCueStartTimes } from '@/lib/utils'
import type { Cue } from '@/lib/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // Extra velden opgeslagen in localStorage
  phone?: string
  call_time?: string   // bijv. "08:30"
  department?: string
}

interface RundownData {
  id: string
  name: string
  show_start_time: string | null
  cues: Cue[]
}

interface CallsheetData {
  briefing: string
  dresscode: string
  wifi_network: string
  wifi_password: string
  parking: string
  catering: string
  emergency: string
  extra: string
  extra_recipients: string   // komma-gescheiden extra e-mailadressen
  // Per crew lid: phone + call_time, gekeyed op crew-id
  crew_extras: Record<string, { phone: string; call_time: string; department: string }>
}

const EMPTY_DATA: CallsheetData = {
  briefing: '',
  dresscode: '',
  wifi_network: '',
  wifi_password: '',
  parking: '',
  catering: '',
  emergency: '',
  extra: '',
  extra_recipients: '',
  crew_extras: {},
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Eigenaar', editor: 'Editor', viewer: 'Kijker',
  caller: 'Caller', crew: 'Crew', presenter: 'Presentator',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function EditableField({
  label, value, onChange, placeholder, multiline = false, className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="text-sm bg-muted/20 border border-border/50 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30 transition-colors hover:border-border"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm bg-muted/20 border border-border/50 rounded-lg px-3 py-2 h-9 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30 transition-colors hover:border-border"
        />
      )}
    </div>
  )
}

// ─── Preview component (document-stijl) ──────────────────────────────────────

function CallsheetPreview({
  showName, showDate, showVenue, showClient, showDescription,
  data, crew, rundowns,
}: {
  showName: string
  showDate: string | null
  showVenue: string | null
  showClient: string | null
  showDescription: string | null
  data: CallsheetData
  crew: CrewMember[]
  rundowns: RundownData[]
}) {
  const crewWithExtras = crew.map(m => ({
    ...m,
    ...(data.crew_extras[m.id] ?? {}),
  }))

  return (
    <div className="font-sans text-sm text-foreground space-y-6">

      {/* ── Header ── */}
      <div className="rounded-xl overflow-hidden border border-border/50">
        <div className="bg-foreground/95 text-background px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-50 mb-1">Callsheet</p>
          <h1 className="text-2xl font-black leading-tight">{showName}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm opacity-70">
            {showDate && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{formatDate(showDate)}</span>}
            {showVenue && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{showVenue}</span>}
            {showClient && <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{showClient}</span>}
          </div>
        </div>
        {showDescription && (
          <div className="px-6 py-3 bg-muted/30 border-t border-border/40 text-sm text-muted-foreground">
            {showDescription}
          </div>
        )}
      </div>

      {/* ── Info-grid ── */}
      {(data.briefing || data.dresscode || data.wifi_network || data.parking || data.catering || data.emergency || data.extra) && (
        <div className="grid grid-cols-2 gap-3">
          {data.briefing && (
            <InfoBlock icon={<Info className="h-3.5 w-3.5" />} label="Briefing" value={data.briefing} className="col-span-2" />
          )}
          {data.dresscode && <InfoBlock icon={<Shirt className="h-3.5 w-3.5" />} label="Dresscode" value={data.dresscode} />}
          {(data.wifi_network || data.wifi_password) && (
            <InfoBlock
              icon={<Wifi className="h-3.5 w-3.5" />}
              label="WiFi"
              value={[data.wifi_network && `Netwerk: ${data.wifi_network}`, data.wifi_password && `Wachtwoord: ${data.wifi_password}`].filter(Boolean).join('\n')}
            />
          )}
          {data.parking && <InfoBlock icon={<Car className="h-3.5 w-3.5" />} label="Parkeren" value={data.parking} />}
          {data.catering && <InfoBlock icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label="Catering" value={data.catering} />}
          {data.emergency && <InfoBlock icon={<AlertCircle className="h-3.5 w-3.5" />} label="Noodcontact" value={data.emergency} className="col-span-2" />}
          {data.extra && <InfoBlock icon={<Info className="h-3.5 w-3.5" />} label="Extra info" value={data.extra} className="col-span-2" />}
        </div>
      )}

      {/* ── Crew tabel ── */}
      {crewWithExtras.length > 0 && (
        <div>
          <SectionHeader icon={<Users className="h-4 w-4" />} title="Crew" />
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Functie</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Call time</th>
                  <th className="text-left px-4 py-2.5 font-semibold hidden sm:table-cell">Telefoon</th>
                  <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {crewWithExtras.map((m, i) => (
                  <tr key={m.id} className={cn('transition-colors', i % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                    <td className="px-4 py-2.5 font-medium">{m.full_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50">
                        {m.department || ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold hidden sm:table-cell text-primary">
                      {m.call_time || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                      {m.phone ? <a href={`tel:${m.phone}`} className="hover:text-foreground transition-colors">{m.phone}</a> : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {m.email ? <a href={`mailto:${m.email}`} className="hover:text-foreground transition-colors">{m.email}</a> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Schedule per rundown ── */}
      {rundowns.map(r => {
        const startTimes = calculateCueStartTimes(r.cues, r.show_start_time)
        const totalSecs  = r.cues.reduce((s, c) => s + c.duration_seconds, 0)
        return (
          <div key={r.id}>
            <SectionHeader
              icon={<Clock className="h-4 w-4" />}
              title={r.name}
              subtitle={r.show_start_time ? `Aanvang ${r.show_start_time.slice(0, 5)}` : undefined}
            />
            {r.cues.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Geen cues.</p>
            ) : (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-semibold w-8">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold w-14">Tijd</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Onderdeel</th>
                      <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Uitvoerder</th>
                      <th className="text-right px-4 py-2.5 font-semibold w-16">Duur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {r.cues.map((cue, idx) => (
                      <tr key={cue.id} className={cn('transition-colors', idx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground/50">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary tabular-nums">
                          {startTimes[idx] !== '--:--' ? startTimes[idx] : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium">{cue.title}</td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell text-xs">
                          {cue.presenter ?? ''}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground text-right tabular-nums">
                          {formatDuration(cue.duration_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border/50">
                      <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground font-medium">
                        {r.cues.length} onderdelen
                      </td>
                      <td className="px-4 py-2 text-xs font-mono font-bold text-right">
                        {formatDuration(totalSecs)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InfoBlock({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border/50 p-4', className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{value}</p>
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>
      {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
    </div>
  )
}

// ─── Hoofd component ──────────────────────────────────────────────────────────

export function CallsheetPanel({
  showId, showName, showDate, showVenue, showClient, showDescription, open, onClose,
}: CallsheetPanelProps) {
  const supabase = createClient()

  const [tab, setTab]           = useState<'edit' | 'preview'>('edit')
  const [crew, setCrew]         = useState<CrewMember[]>([])
  const [rundowns, setRundowns] = useState<RundownData[]>([])
  const [loading, setLoading]   = useState(false)
  const [data, setData]         = useState<CallsheetData>(EMPTY_DATA)
  const [saved, setSaved]       = useState(false)
  const [sending, setSending]   = useState(false)
  const [sendDone, setSendDone] = useState(false)

  const storageKey = `callsheet_v2_${showId}`

  // Load from localStorage
  useEffect(() => {
    if (!open) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setData(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [open, storageKey])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [membersRes, rundownsRes] = await Promise.all([
      supabase.from('show_members').select('id, role, profiles(full_name, email)').eq('show_id', showId),
      supabase.from('rundowns').select('id, name, show_start_time').eq('show_id', showId).order('created_at'),
    ])

    if (membersRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCrew(membersRes.data.map((m: any) => ({
        id: m.id, role: m.role,
        full_name: m.profiles?.full_name ?? null,
        email: m.profiles?.email ?? null,
      })))
    }

    if (rundownsRes.data) {
      const withCues = await Promise.all(
        rundownsRes.data.map(async (r) => {
          const { data: cues } = await supabase
            .from('cues').select('id, title, type, duration_seconds, presenter, position, notes, tech_notes, status')
            .eq('rundown_id', r.id).order('position')
          return { ...r, cues: (cues ?? []) as Cue[] }
        })
      )
      setRundowns(withCues)
    }
    setLoading(false)
  }, [showId, supabase])

  useEffect(() => { if (open) loadData() }, [open, loadData])

  function setField<K extends keyof CallsheetData>(key: K, value: CallsheetData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  function setCrewExtra(id: string, field: 'phone' | 'call_time' | 'department', value: string) {
    setData(prev => ({
      ...prev,
      crew_extras: {
        ...prev.crew_extras,
        [id]: { ...(prev.crew_extras[id] ?? { phone: '', call_time: '', department: '' }), [field]: value },
      },
    }))
  }

  function saveData() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
  }

  async function sendToCrewEmails() {
    const crewRecipients = crew.filter(m => m.email)
    // Losse extra e-mailadressen parsen
    const extraRecipients = (data.extra_recipients ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.includes('@'))
      .map(email => ({ id: `extra_${email}`, email, full_name: email, role: 'extern' }))
    const allRecipients = [...crewRecipients, ...extraRecipients]
    if (allRecipients.length === 0) { alert('Geen e-mailadressen gevonden. Voeg crew toe of typ losse adressen.'); return }
    setSending(true)
    try {
      const res = await fetch(`/api/shows/${showId}/callsheet/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: data, recipients: allRecipients }),
      })
      if (res.ok) { setSendDone(true); setTimeout(() => setSendDone(false), 4000) }
      else { const d = await res.json(); alert(`Versturen mislukt: ${d.error ?? 'Fout'}`) }
    } catch { alert('Netwerkfout.') }
    setSending(false)
  }

  const crewEmailCount  = crew.filter(m => m.email).length
  const extraEmailCount = (data.extra_recipients ?? '').split(',').map(s => s.trim()).filter(s => s.includes('@')).length
  const emailCount      = crewEmailCount + extraEmailCount

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0">

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Callsheet — {showName}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showDate && <span>{formatDate(showDate)}</span>}
                {showVenue && <span className="ml-2">· {showVenue}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saved && <span className="text-xs text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> Opgeslagen</span>}
              <Button
                size="sm" variant="outline"
                onClick={() => {
                  // Stuur alle callsheet-data + crew mee als URL-param zodat de printpagina alles kan tonen
                  const payload = { ...data, crew }
                  const encoded = encodeURIComponent(JSON.stringify(payload))
                  window.open(`/shows/${showId}/callsheet/print?d=${encoded}`, '_blank')
                }}
                className="h-8 gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" /> Print / PDF
              </Button>
              <Button
                size="sm"
                onClick={sendToCrewEmails}
                disabled={sending || emailCount === 0}
                className={cn('h-8 gap-1.5 text-xs', sendDone && 'bg-green-600 hover:bg-green-500')}
              >
                {sending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Versturen…</>
                  : sendDone ? <><Check className="h-3.5 w-3.5" /> Verstuurd!</>
                  : <><Mail className="h-3.5 w-3.5" /> Stuur naar crew{emailCount > 0 ? ` (${emailCount})` : ''}</>
                }
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0 mt-4 border-b border-border">
            <TabBtn active={tab === 'edit'} onClick={() => setTab('edit')} icon={<Edit3 className="h-3.5 w-3.5" />} label="Bewerken" />
            <TabBtn active={tab === 'preview'} onClick={() => setTab('preview')} icon={<Eye className="h-3.5 w-3.5" />} label="Preview" />
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /><span className="text-sm">Laden…</span>
            </div>
          ) : tab === 'preview' ? (
            <div className="px-6 py-5">
              <CallsheetPreview
                showName={showName} showDate={showDate} showVenue={showVenue}
                showClient={showClient} showDescription={showDescription}
                data={data} crew={crew} rundowns={rundowns}
              />
            </div>
          ) : (
            <div className="px-6 py-5 space-y-7">

              {/* ── Algemene info ── */}
              <div>
                <FieldGroupHeader icon={<Info className="h-4 w-4" />} title="Algemene info" />
                <div className="grid grid-cols-2 gap-3">
                  <EditableField
                    label="Briefing / algemene info"
                    value={data.briefing}
                    onChange={v => setField('briefing', v)}
                    placeholder="Doel van de dag, sfeer, bijzonderheden voor de crew…"
                    multiline
                    className="col-span-2"
                  />
                  <EditableField label="Dresscode" value={data.dresscode} onChange={v => setField('dresscode', v)} placeholder="Bijv. All black, smart casual…" />
                  <EditableField label="Noodcontact" value={data.emergency} onChange={v => setField('emergency', v)} placeholder="Naam: 06-xxx (functie)…" />
                </div>
              </div>

              {/* ── Locatie & Logistiek ── */}
              <div>
                <FieldGroupHeader icon={<MapPin className="h-4 w-4" />} title="Locatie & logistiek" />
                <div className="grid grid-cols-2 gap-3">
                  <EditableField label="Parkeren" value={data.parking} onChange={v => setField('parking', v)} placeholder="Parkeerplaats, kosten, laad/losplek…" multiline />
                  <EditableField label="Catering" value={data.catering} onChange={v => setField('catering', v)} placeholder="Tijden, dieetwensen, koffie/bar…" multiline />
                  <EditableField label="WiFi-netwerk" value={data.wifi_network} onChange={v => setField('wifi_network', v)} placeholder="Netwerknaam…" />
                  <EditableField label="WiFi-wachtwoord" value={data.wifi_password} onChange={v => setField('wifi_password', v)} placeholder="Wachtwoord…" />
                  <EditableField label="Extra notities" value={data.extra} onChange={v => setField('extra', v)} placeholder="Overige info voor de dag…" multiline className="col-span-2" />
                </div>
              </div>

              {/* ── Crew ── */}
              <div>
                <FieldGroupHeader icon={<Users className="h-4 w-4" />} title="Crew & call times" />
                {crew.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nog geen crew-leden uitgenodigd.</p>
                ) : (
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wider">
                          <th className="text-left px-4 py-2.5 font-semibold">Naam</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Functie / dept.</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Call time</th>
                          <th className="text-left px-3 py-2.5 font-semibold">Telefoon</th>
                          <th className="text-left px-4 py-2.5 font-semibold hidden lg:table-cell">E-mail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {crew.map((m, i) => {
                          const extras = data.crew_extras[m.id] ?? { phone: '', call_time: '', department: '' }
                          return (
                            <tr key={m.id} className={cn(i % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                              <td className="px-4 py-2 font-medium text-sm whitespace-nowrap">
                                {m.full_name ?? <span className="text-muted-foreground italic">Onbekend</span>}
                                <span className="ml-2 text-[10px] text-muted-foreground/40">{ROLE_LABELS[m.role] ?? m.role}</span>
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={extras.department}
                                  onChange={e => setCrewExtra(m.id, 'department', e.target.value)}
                                  placeholder={ROLE_LABELS[m.role] ?? m.role}
                                  className="w-full text-xs bg-muted/20 border border-border/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={extras.call_time}
                                  onChange={e => setCrewExtra(m.id, 'call_time', e.target.value)}
                                  className="w-28 text-xs font-mono bg-muted/20 border border-border/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 text-primary"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="tel"
                                  value={extras.phone}
                                  onChange={e => setCrewExtra(m.id, 'phone', e.target.value)}
                                  placeholder="06-…"
                                  className="w-full text-xs bg-muted/20 border border-border/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/30"
                                />
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground hidden lg:table-cell">
                                {m.email ?? '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Extra ontvangers ── */}
              <div>
                <FieldGroupHeader icon={<Mail className="h-4 w-4" />} title="Extra ontvangers" subtitle="stuur ook naar mensen buiten de crew" />
                <EditableField
                  label="E-mailadressen (komma-gescheiden)"
                  value={data.extra_recipients}
                  onChange={v => setField('extra_recipients', v)}
                  placeholder="jan@voorbeeld.nl, marie@bedrijf.com…"
                />
                {extraEmailCount > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1.5">
                    {extraEmailCount} losse ontvanger{extraEmailCount === 1 ? '' : 's'} toegevoegd
                  </p>
                )}
              </div>

              {/* ── Programma (read-only overzicht) ── */}
              {rundowns.map(r => {
                const startTimes = calculateCueStartTimes(r.cues, r.show_start_time)
                return (
                  <div key={r.id}>
                    <FieldGroupHeader
                      icon={<Clock className="h-4 w-4" />}
                      title={`Programma: ${r.name}`}
                      subtitle={r.show_start_time ? `aanvang ${r.show_start_time.slice(0, 5)}` : 'geen starttijd ingesteld'}
                      subtitleHref={`/shows/${showId}/rundown/${r.id}`}
                    />
                    {r.cues.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Geen cues in deze rundown.</p>
                    ) : (
                      <div className="rounded-xl border border-border/50 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/40 text-muted-foreground text-[10px] uppercase tracking-wider">
                              <th className="text-left px-4 py-2.5 font-semibold w-8">#</th>
                              <th className="text-left px-3 py-2.5 font-semibold w-16">Tijd</th>
                              <th className="text-left px-3 py-2.5 font-semibold">Onderdeel</th>
                              <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Uitvoerder</th>
                              <th className="text-right px-4 py-2.5 font-semibold">Duur</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {r.cues.map((cue, idx) => (
                              <tr key={cue.id} className={cn(idx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground/40">{idx + 1}</td>
                                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary tabular-nums">
                                  {startTimes[idx] !== '--:--' ? startTimes[idx] : <span className="text-muted-foreground/30">—</span>}
                                </td>
                                <td className="px-3 py-2 font-medium">{cue.title}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{cue.presenter ?? ''}</td>
                                <td className="px-4 py-2 font-mono text-xs text-muted-foreground text-right tabular-nums">
                                  {formatDuration(cue.duration_seconds)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/30 border-t border-border/40">
                              <td colSpan={4} className="px-4 py-2 text-xs text-muted-foreground">{r.cues.length} onderdelen</td>
                              <td className="px-4 py-2 text-xs font-mono font-bold text-right">
                                {formatDuration(r.cues.reduce((s, c) => s + c.duration_seconds, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center justify-between">
          <p className="text-xs text-muted-foreground/40">Notities & call times worden lokaal opgeslagen in je browser.</p>
          <Button size="sm" variant="ghost" onClick={saveData} className="h-7 text-xs gap-1.5">
            <Save className="h-3 w-3" /> Opslaan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      )}
    >
      {icon}{label}
    </button>
  )
}

function FieldGroupHeader({ icon, title, subtitle, subtitleHref }: {
  icon: React.ReactNode; title: string; subtitle?: string; subtitleHref?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {subtitle && (
        subtitleHref
          ? <a href={subtitleHref} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground/50 hover:text-primary flex items-center gap-0.5 transition-colors">
              — {subtitle} <ChevronRight className="h-3 w-3" />
            </a>
          : <span className="text-xs text-muted-foreground/50">— {subtitle}</span>
      )}
    </div>
  )
}
