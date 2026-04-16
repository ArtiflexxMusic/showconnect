'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserPlus, X, ChevronDown, Check, Link2, Clock, Trash2, Shield, Mic, Users, Eye, Pencil, Mail, Info, AlertCircle } from 'lucide-react'
import type { ShowMember, Invitation, ShowMemberRole } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface ShowMembersPanelProps {
  showId: string
  showName: string
  currentUserRole: ShowMemberRole
  members?: ShowMember[]       // optioneel — panel fetcht zelf als niet meegegeven
  invitations?: Invitation[]   // optioneel — panel fetcht zelf als niet meegegeven
  onClose: () => void
  autoOpenInvite?: boolean
}

const ROLE_LABELS: Record<ShowMemberRole, string> = {
  owner:     'Eigenaar',
  editor:    'Editor',
  caller:    'Caller',
  crew:      'Crew',
  presenter: 'Presenter',
  viewer:    'Toeschouwer',
}

const ROLE_DESC: Record<ShowMemberRole, string> = {
  owner:     'Volledige controle over show',
  editor:    'Rundowns bewerken + caller view',
  caller:    'Caller-view + cue status wijzigen',
  crew:      'Crew-view: cues + tech notities',
  presenter: 'Presenter-view: eigen cues zien',
  viewer:    'Alleen meekijken (read-only)',
}

const ROLE_COLORS: Record<ShowMemberRole, string> = {
  owner:     'bg-primary/15 text-primary border-primary/30',
  editor:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  caller:    'bg-green-500/15 text-green-400 border-green-500/30',
  crew:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
  presenter: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  viewer:    'bg-muted text-muted-foreground border-border',
}

const ROLE_ICONS: Record<ShowMemberRole, React.ReactNode> = {
  owner:     <Shield className="h-3 w-3" />,
  editor:    <Pencil className="h-3 w-3" />,
  caller:    <Mic className="h-3 w-3" />,
  crew:      <Users className="h-3 w-3" />,
  presenter: <Eye className="h-3 w-3" />,
  viewer:    <Eye className="h-3 w-3" />,
}

// Rollen die je kunt toewijzen bij uitnodigingen (geen owner)
const ASSIGNABLE_ROLES: ShowMemberRole[] = ['editor', 'caller', 'crew', 'presenter', 'viewer']

interface InviteResult {
  email: string
  status: 'sent' | 'skipped' | 'error'
  message?: string
  invitationId?: string
}

function parseEmails(raw: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const token of raw.split(/[\s,;]+/)) {
    const t = token.trim().toLowerCase()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function Avatar({ name, email }: { name: string | null; email?: string }) {
  const label = name || email || '?'
  const initials = label.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
      {initials}
    </div>
  )
}

export function ShowMembersPanel({
  showId, showName, currentUserRole, members: initialMembers, invitations: initialInvitations, onClose, autoOpenInvite = false
}: ShowMembersPanelProps) {
  const [members, setMembers]         = useState<ShowMember[]>(initialMembers ?? [])
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations ?? [])
  // Toon skeleton alleen als er nog géén data in initialMembers zat
  const [loadingData, setLoadingData] = useState(!initialMembers || initialMembers.length === 0)

  // Altijd fetchen op mount — ook als parent al iets meegaf — want bij reopen
  // na een invite moet de nieuwe invitation/member direct zichtbaar zijn
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('show_members')
        .select('*, profile:profiles!show_members_user_id_fkey(id, email, full_name, avatar_url)')
        .eq('show_id', showId)
        .order('created_at', { ascending: true }),
      supabase
        .from('invitations')
        .select('*')
        .eq('show_id', showId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ]).then(([{ data: m }, { data: i }]) => {
      setMembers((m ?? []) as ShowMember[])
      setInvitations((i ?? []) as Invitation[])
      setLoadingData(false)
    })
  }, [showId])
  const [showInvite, setShowInvite]   = useState(autoOpenInvite && currentUserRole === 'owner')
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole]   = useState<ShowMemberRole>('caller')
  const [inviting, setInviting]       = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteResults, setInviteResults] = useState<InviteResult[] | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [emailSending, setEmailSending] = useState<string | null>(null)
  const [emailSent, setEmailSent]     = useState<string | null>(null)
  const [showRoleLegend, setShowRoleLegend] = useState(false)

  const supabase  = createClient()
  const canManage = currentUserRole === 'owner' || currentUserRole === 'editor'

  // ── Uitnodigen (batch) ─────────────────────────────────────────────────────
  const parsedEmails = parseEmails(inviteEmails)

  const handleInvite = async () => {
    if (parsedEmails.length === 0) return
    setInviting(true)
    setInviteError('')
    setInviteResults(null)

    try {
      const resp = await fetch('/api/invite/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId,
          role:   inviteRole,
          emails: parsedEmails,
        }),
      })
      const data = await resp.json().catch(() => ({})) as {
        results?: InviteResult[]
        error?: string
      }

      if (!resp.ok) {
        setInviteError(data.error ?? 'Uitnodigen mislukt')
        return
      }

      const results = data.results ?? []
      setInviteResults(results)

      // Lijst openstaande uitnodigingen verversen
      const { data: refreshed } = await supabase
        .from('invitations')
        .select('*')
        .eq('show_id', showId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      setInvitations((refreshed ?? []) as Invitation[])

      // Als alles succesvol/skipped is, textarea leegmaken
      const hasErrors = results.some(r => r.status === 'error')
      if (!hasErrors) {
        setInviteEmails('')
      } else {
        // Alleen mislukte emails terugzetten zodat Thomas kan corrigeren
        const failed = results.filter(r => r.status === 'error').map(r => r.email)
        setInviteEmails(failed.join('\n'))
      }
    } catch (err) {
      console.error('Batch invite error:', err)
      setInviteError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setInviting(false)
    }
  }

  // ── Email sturen via API ──────────────────────────────────────────────────
  const sendInviteEmail = async (invId: string) => {
    setEmailSending(invId)
    try {
      const resp = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invId }),
      })
      if (resp.ok) {
        setEmailSent(invId)
        setTimeout(() => setEmailSent(null), 3000)
      }
    } finally {
      setEmailSending(null)
    }
  }

  // ── Link kopiëren ──────────────────────────────────────────────────────────
  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // ── Uitnodiging verwijderen ────────────────────────────────────────────────
  const deleteInvitation = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id)
    setInvitations(prev => prev.filter(i => i.id !== id))
  }

  // ── Lid verwijderen ────────────────────────────────────────────────────────
  const removeMember = async (memberId: string) => {
    await supabase.from('show_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  // ── Rol wijzigen ───────────────────────────────────────────────────────────
  const changeRole = async (memberId: string, newRole: ShowMemberRole) => {
    setChangingRole(memberId)
    await supabase.from('show_members').update({ role: newRole }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    setChangingRole(null)
  }

  const pendingInvitations = invitations.filter(i => !i.accepted_at && new Date(i.expires_at) > new Date())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              Teamleden
              {loadingData && <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />}
            </h2>
            <p className="text-xs text-muted-foreground">{showName}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
                <UserPlus className="h-3.5 w-3.5" /> Uitnodigen
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Uitnodig formulier */}
          {showInvite && (
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Nieuwe uitnodigingen</p>
              <textarea
                placeholder={"email1@voorbeeld.nl\nemail2@voorbeeld.nl\n(of gescheiden door komma's of spaties)"}
                value={inviteEmails}
                onChange={e => setInviteEmails(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    handleInvite()
                  }
                }}
                rows={3}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-y font-mono"
              />

              <div className="flex items-center gap-2 mt-2 mb-2">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as ShowMemberRole)}
                  className="text-sm bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  {parsedEmails.length === 0
                    ? 'Nog geen emails'
                    : `${parsedEmails.length} ${parsedEmails.length === 1 ? 'uitnodiging' : 'uitnodigingen'}`}
                </span>
              </div>

              {/* Rol uitleg */}
              <div className={cn(
                'text-xs rounded-md px-3 py-2 mb-2 border flex items-start gap-2',
                ROLE_COLORS[inviteRole]
              )}>
                <span className="mt-0.5">{ROLE_ICONS[inviteRole]}</span>
                <span>{ROLE_DESC[inviteRole]}</span>
              </div>

              {inviteError && <p className="text-xs text-destructive mb-2">{inviteError}</p>}

              {inviteResults && inviteResults.length > 0 && (
                <div className="space-y-1 mb-3 text-xs border border-border rounded-md p-2 bg-background/50">
                  {inviteResults.map(r => (
                    <div key={r.email} className="flex items-start gap-2">
                      {r.status === 'sent' && <Check className="h-3 w-3 mt-0.5 text-primary shrink-0" />}
                      {r.status === 'skipped' && <AlertCircle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />}
                      {r.status === 'error' && <X className="h-3 w-3 mt-0.5 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-mono truncate">{r.email}</span>
                        {r.message && <span className="text-muted-foreground">: {r.message}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={handleInvite} disabled={inviting || parsedEmails.length === 0}>
                  {inviting
                    ? <><div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin mr-1.5" /> Versturen…</>
                    : <><Mail className="h-3.5 w-3.5 mr-1" /> Versturen{parsedEmails.length > 0 ? ` (${parsedEmails.length})` : ''}</>
                  }
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowInvite(false); setInviteEmails(''); setInviteResults(null); setInviteError('') }}>
                  Annuleren
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Plak meerdere emails tegelijk, gescheiden door nieuwe regels, komma&apos;s of spaties. Iedereen krijgt dezelfde rol.
              </p>
            </div>
          )}

          {/* Rol legenda — inklapbaar */}
          {canManage && !showInvite && (
            <div className="px-6 pt-3 pb-2 border-b border-border/50">
              <button
                onClick={() => setShowRoleLegend(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="h-3 w-3" />
                Rollenuitleg
                <ChevronDown className={cn('h-3 w-3 transition-transform', showRoleLegend && 'rotate-180')} />
              </button>
              {showRoleLegend && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {ASSIGNABLE_ROLES.map(role => (
                    <div key={role} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0', ROLE_COLORS[role])}>
                        {ROLE_LABELS[role]}
                      </span>
                      <span>{ROLE_DESC[role].split(':')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Huidige leden */}
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Leden ({members.length})
            </p>
          </div>
          <div className="divide-y divide-border/50">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-6 py-3">
                <Avatar name={member.profile?.full_name ?? null} email={member.profile?.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {member.profile?.full_name || member.profile?.email || '—'}
                  </p>
                  {member.profile?.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{member.profile.email}</p>
                  )}
                </div>

                {/* Rol selector — native select om clipping door overflow te vermijden */}
                {canManage && member.role !== 'owner' ? (
                  <div className="relative flex items-center gap-1.5">
                    {changingRole === member.id && (
                      <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />
                    )}
                    <select
                      value={member.role}
                      disabled={changingRole === member.id}
                      onChange={(e) => changeRole(member.id, e.target.value as ShowMemberRole)}
                      className={cn(
                        'text-xs font-medium rounded border px-2 py-1 cursor-pointer bg-card appearance-none pr-5',
                        'focus:outline-none focus:ring-1 focus:ring-primary',
                        ROLE_COLORS[member.role]
                      )}
                    >
                      {ASSIGNABLE_ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <ChevronDown className="h-2.5 w-2.5 absolute right-1.5 pointer-events-none text-current opacity-70" />
                  </div>
                ) : (
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium', ROLE_COLORS[member.role])}>
                    {ROLE_ICONS[member.role]} {ROLE_LABELS[member.role]}
                  </span>
                )}

                {canManage && member.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Verwijderen uit show"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Openstaande uitnodigingen */}
          {pendingInvitations.length > 0 && (
            <>
              <div className="px-6 pt-5 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Openstaande uitnodigingen ({pendingInvitations.length})
                </p>
              </div>
              <div className="divide-y divide-border/50 mb-4">
                {pendingInvitations.map(inv => (
                  <div key={inv.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted/50 border border-dashed border-border flex items-center justify-center">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className={cn('inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[10px] font-medium mr-1', ROLE_COLORS[inv.role])}>
                          {ROLE_LABELS[inv.role]}
                        </span>
                        · verloopt {new Date(inv.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <button
                      onClick={() => sendInviteEmail(inv.id)}
                      disabled={emailSending === inv.id}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:underline disabled:opacity-50"
                      title="Stuur uitnodiging per e-mail"
                    >
                      {emailSent === inv.id
                        ? <><Check className="h-3 w-3" /> Verstuurd</>
                        : emailSending === inv.id
                        ? <><div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" /> Sturen...</>
                        : <><Mail className="h-3 w-3" /> Mail</>
                      }
                    </button>
                    <button
                      onClick={() => copyInviteLink(inv.token)}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                      title="Kopieer uitnodigingslink"
                    >
                      {copiedToken === inv.token
                        ? <><Check className="h-3 w-3" /> Gekopieerd</>
                        : <><Link2 className="h-3 w-3" /> Link</>
                      }
                    </button>
                    {canManage && (
                      <button
                        onClick={() => deleteInvitation(inv.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
