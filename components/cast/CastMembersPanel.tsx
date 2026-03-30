'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  UserPlus, Trash2, Copy, Check, Link2, QrCode, Loader2,
  Pencil, Plus, Users, ExternalLink, X, Hash, RefreshCw, Mail,
} from 'lucide-react'
import type { CastMember, CastPortalLink } from '@/lib/types/database'

interface CastMembersPanelProps {
  showId: string
  open: boolean
  onClose: () => void
}

const COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#84cc16','#6366f1',
]

// ── Kleur-dot ────────────────────────────────────────────────────────────────
function ColorDot({ color, size = 'sm' }: { color: string; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 'h-5 w-5' : 'h-3 w-3'
  return <span className={`inline-block ${px} rounded-full shrink-0`} style={{ backgroundColor: color }} />
}

// ── Initialen avatar ─────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
      style={{ backgroundColor: color + '30', color }}
    >
      {initials}
    </div>
  )
}

export function CastMembersPanel({ showId, open, onClose }: CastMembersPanelProps) {
  const supabase = createClient()

  const [members, setMembers]     = useState<CastMember[]>([])
  const [links, setLinks]         = useState<CastPortalLink[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [copied, setCopied]       = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<CastMember | null>(null)
  const [addOpen, setAddOpen]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [qrToken, setQrToken]     = useState<string | null>(null)

  // Form state
  const [name, setName]   = useState('')
  const [role, setRole]   = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: m } = await (supabase as any).from('cast_members').select('*').eq('show_id', showId).order('name')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: l } = await (supabase as any).from('cast_portal_links').select('*').eq('show_id', showId).order('created_at', { ascending: false })
    setMembers(m ?? [])
    setLinks(l ?? [])
    setLoading(false)
  }, [showId, supabase])

  useEffect(() => { if (open) load() }, [open, load])

  function openAdd() {
    setEditTarget(null)
    setName(''); setRole(''); setColor(COLORS[0]); setNotes(''); setEmail('')
    setAddOpen(true)
  }

  function openEdit(m: CastMember) {
    setEditTarget(m)
    setName(m.name); setRole(m.role ?? ''); setColor(m.color); setNotes(m.notes ?? '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setEmail((m as any).email ?? '')
    setAddOpen(true)
  }

  function generatePin(): string {
    return String(Math.floor(100000 + Math.random() * 900000))
  }

  async function regeneratePin(memberId: string) {
    const newPin = generatePin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cast_members').update({ pin: newPin }).eq('id', memberId)
    await load()
  }

  async function saveMember() {
    // Naam is optioneel — standaard 'Bezoeker' als leeg
    if (!name.trim()) setName('Bezoeker')
    setSaving(true)
    setSaveError(null)
    try {
      if (editTarget) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('cast_members').update({
          name: name.trim(), role: role.trim() || null, color,
          notes: notes.trim() || null, email: email.trim() || null,
        }).eq('id', editTarget.id)
        if (error) throw error
      } else {
        const pin = generatePin()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('cast_members').insert({
          show_id: showId, name: name.trim(), role: role.trim() || null,
          color, notes: notes.trim() || null, pin, email: email.trim() || null,
        })
        if (error) throw error
      }
      await load()
      setAddOpen(false)
    } catch (err: unknown) {
      // Supabase errors zijn geen instanceof Error maar hebben wel .message
      const msg = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message: unknown }).message)
          : String(err)
      // Handige melding als tabel nog niet bestaat
      if (msg.includes('relation') && msg.includes('does not exist')) {
        setSaveError('De cast_members tabel bestaat nog niet in de database. Voer de SQL-migratie uit in Supabase.')
      } else {
        setSaveError(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cast_members').delete().eq('id', id)
    await load()
  }

  async function generateLink(memberId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cast_portal_links').insert({ show_id: showId, cast_member_id: memberId })
    await load()
  }

  // Snelle gastlink: maak anonieme member + link in één klik
  const [quickLinkLoading, setQuickLinkLoading] = useState(false)
  const [quickLink, setQuickLink]               = useState<{ token: string; pin: string } | null>(null)

  async function createQuickGuestLink() {
    setQuickLinkLoading(true)
    const guestNum = members.filter(m => m.name.startsWith('Gast')).length + 1
    const pin = generatePin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error } = await (supabase as any).from('cast_members').insert({
      show_id: showId,
      name: `Gast ${guestNum}`,
      color: COLORS[guestNum % COLORS.length],
      pin,
    }).select().single()
    if (error || !member) { setQuickLinkLoading(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase as any).from('cast_portal_links').insert({
      show_id: showId,
      cast_member_id: member.id,
    }).select().single()
    if (link) setQuickLink({ token: link.token, pin })
    await load()
    setQuickLinkLoading(false)
  }

  async function deleteLink(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('cast_portal_links').delete().eq('id', id)
    await load()
  }

  // Magic link: gaat naar cast-login pagina met token → toon naam + vraag PIN
  function portalUrl(token: string) {
    return `${window.location.origin}/cast-login?magic=${token}`
  }

  // Mailto: stuur uitnodiging met PIN + link
  function sendInviteEmail(member: CastMember, token: string) {
    if (!(member as any).email || !member.pin) return
    const loginUrl = portalUrl(token)
    const subject = encodeURIComponent(`Uitnodiging Cast Portal – ${member.name}`)
    const body = encodeURIComponent(
      `Hallo ${member.name},\n\n` +
      `Je bent uitgenodigd als cast member.\n\n` +
      (member.role ? `Rol: ${member.role}\n\n` : '') +
      `Je kunt het programma bekijken via onderstaande link:\n${loginUrl}\n\n` +
      `Of ga naar /cast-login en voer je PIN in:\n\nPIN: ${member.pin}\n\n` +
      `Met vriendelijke groet`
    )
    window.open(`mailto:${(member as any).email}?subject=${subject}&body=${body}`)
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(portalUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function linksForMember(memberId: string) {
    return links.filter(l => l.cast_member_id === memberId)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/30">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Cast beheer
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
            {/* Add buttons */}
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={createQuickGuestLink}
                disabled={quickLinkLoading}
                className="gap-1.5 text-xs"
                title="Maak direct een link zonder naam in te vullen"
              >
                {quickLinkLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Link2 className="h-3.5 w-3.5" />
                }
                Snelle link
              </Button>
              <Button size="sm" onClick={openAdd} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold">
                <UserPlus className="h-4 w-4" /> Cast member toevoegen
              </Button>
            </div>

            {/* Snelle link resultaat */}
            {quickLink && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <code className="text-xs text-emerald-400 flex-1 truncate font-mono">
                    /cast-login?magic={quickLink.token.slice(0, 16)}…
                  </code>
                  <Button
                    size="sm" variant="ghost" className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${portalUrl(quickLink.token)}\nPIN: ${quickLink.pin}`
                      )
                      setCopied('quick')
                      setTimeout(() => setCopied(null), 2000)
                    }}
                  >
                    {copied === 'quick'
                      ? <><Check className="h-3 w-3 text-emerald-400" /> Gekopieerd</>
                      : <><Copy className="h-3 w-3" /> Kopieer link + PIN</>}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setQrToken(quickLink.token)} title="QR-code tonen">
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setQuickLink(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* PIN duidelijk tonen */}
                <div className="flex items-center gap-3 pt-1 border-t border-emerald-500/20">
                  <span className="text-xs text-emerald-400/60">PIN voor de gast:</span>
                  <code className="text-xl font-mono font-bold tracking-[0.3em] text-emerald-400">
                    {quickLink.pin}
                  </code>
                  <span className="text-xs text-emerald-400/40">— stuur dit mee met de link</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Laden…
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nog geen cast members. Voeg er één toe.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const memberLinks = linksForMember(member.id)
                  return (
                    <div key={member.id} className="border border-border/50 rounded-xl overflow-hidden">
                      {/* Member header */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted/20">
                        <Avatar name={member.name} color={member.color} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                          {member.role && <p className="text-xs text-muted-foreground">{member.role}</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(member)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMember(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* PIN */}
                      <div className="px-4 py-3 border-t border-border/30">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Hash className="h-3 w-3" /> PIN login
                          </p>
                          <div className="flex items-center gap-1">
                            {member.pin && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-6 text-xs gap-1 text-muted-foreground/60 hover:text-muted-foreground px-2"
                                onClick={() => { navigator.clipboard.writeText(member.pin!); setCopied('pin-' + member.id); setTimeout(() => setCopied(null), 2000) }}
                                title="Kopieer PIN"
                              >
                                {copied === 'pin-' + member.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              className="h-6 text-xs gap-1 text-muted-foreground/60 hover:text-muted-foreground px-2"
                              onClick={() => regeneratePin(member.id)}
                              title="Genereer nieuwe PIN"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {member.pin ? (
                          <div className="mt-1.5 flex items-center gap-2">
                            <code className="text-lg font-mono font-bold tracking-[0.3em] text-emerald-400">
                              {member.pin}
                            </code>
                            <span className="text-xs text-muted-foreground/40">→ /cast-login</span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/40 italic mt-1">
                            Klik <RefreshCw className="inline h-3 w-3 mx-0.5" /> om een PIN te genereren.
                          </p>
                        )}
                      </div>

                      {/* Magic links */}
                      <div className="px-4 py-3 space-y-2 border-t border-border/30">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Link2 className="h-3 w-3" /> Uitnodigingslink
                          </p>
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 text-xs gap-1 text-emerald-400 hover:text-emerald-300 px-2"
                            onClick={() => generateLink(member.id)}
                          >
                            <Plus className="h-3 w-3" /> Genereer link
                          </Button>
                        </div>

                        {memberLinks.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50 italic">Nog geen link gegenereerd.</p>
                        ) : (
                          memberLinks.map((link) => (
                            <div key={link.id} className="space-y-1.5">
                              <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/30">
                                <code className="text-[11px] text-emerald-400/80 flex-1 truncate font-mono">
                                  /cast-login?magic={link.token.slice(0, 12)}…
                                </code>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => copyLink(link.token)}
                                    title="Kopieer link"
                                  >
                                    {copied === link.token
                                      ? <Check className="h-3 w-3 text-emerald-400" />
                                      : <Copy className="h-3 w-3" />}
                                  </Button>
                                  <a href={portalUrl(link.token)} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </a>
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-emerald-400"
                                    title="Toon QR-code"
                                    onClick={() => setQrToken(link.token)}
                                  >
                                    <QrCode className="h-3 w-3" />
                                  </Button>
                                  {(member as any).email && member.pin && (
                                    <Button
                                      variant="ghost" size="icon"
                                      className="h-6 w-6 text-blue-400 hover:text-blue-300"
                                      title={`Stuur uitnodiging naar ${(member as any).email}`}
                                      onClick={() => sendInviteEmail(member, link.token)}
                                    >
                                      <Mail className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost" size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteLink(link.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {!(member as any).email && (
                                <p className="text-[10px] text-muted-foreground/40 italic px-1">
                                  Voeg een e-mailadres toe om de uitnodiging te mailen.
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* QR-code dialog */}
      <Dialog open={!!qrToken} onOpenChange={(o) => { if (!o) setQrToken(null) }}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">QR-code cast portal</DialogTitle>
          </DialogHeader>
          {qrToken && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="rounded-xl overflow-hidden border border-border/40 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(portalUrl(qrToken))}`}
                  alt="QR-code cast portal link"
                  width={220}
                  height={220}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Scan met de camera-app om de cast portal te openen.
              </p>
              <code className="text-[11px] text-emerald-400/70 font-mono break-all px-3 py-1.5 bg-muted/30 rounded-lg w-full text-center">
                /cast-login?magic={qrToken.slice(0, 12)}…
              </code>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setQrToken(null)}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Cast member bewerken' : 'Cast member toevoegen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Naam <span className="text-muted-foreground/50 font-normal text-xs">(optioneel)</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Bezoeker" autoFocus />
            </div>
            <div className="space-y-1">
              <Label>Rol / functie</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Gastvrouw, Spreker, Keynote…" />
            </div>
            <div className="space-y-1">
              <Label>Kleur</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mailadres</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="naam@email.com" />
              <p className="text-xs text-muted-foreground/50">Optioneel — voor het sturen van een uitnodiging</p>
            </div>
            <div className="space-y-1">
              <Label>Notities (intern)</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Bijv. mobiel nummer, kleedkamer…" />
            </div>
          </div>
          {saveError && (
            <div className="px-1 pb-1">
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                ⚠️ {saveError}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuleren</Button>
            <Button onClick={saveMember} disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editTarget ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
