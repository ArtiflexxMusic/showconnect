'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, X, ChevronDown, Check, Link2, Clock, Trash2 } from 'lucide-react'
import type { ShowMember, Invitation, ShowMemberRole } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface ShowMembersPanelProps {
  showId: string
  showName: string
  currentUserRole: ShowMemberRole
  members: ShowMember[]
  invitations: Invitation[]
  onClose: () => void
}

const ROLE_LABELS: Record<ShowMemberRole, string> = {
  owner:  'Eigenaar',
  editor: 'Editor',
  caller: 'Caller',
  viewer: 'Toeschouwer',
}

const ROLE_DESC: Record<ShowMemberRole, string> = {
  owner:  'Volledige controle',
  editor: 'Rundowns bewerken',
  caller: 'Caller-view + cue status',
  viewer: 'Alleen meekijken',
}

const ROLE_COLORS: Record<ShowMemberRole, string> = {
  owner:  'bg-primary/15 text-primary border-primary/30',
  editor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  caller: 'bg-green-500/15 text-green-400 border-green-500/30',
  viewer: 'bg-muted text-muted-foreground border-border',
}

const ASSIGNABLE_ROLES: ShowMemberRole[] = ['editor', 'caller', 'viewer']

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
  showId, showName, currentUserRole, members: initialMembers, invitations: initialInvitations, onClose
}: ShowMembersPanelProps) {
  const [members, setMembers] = useState(initialMembers)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<ShowMemberRole>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const supabase = createClient()
  const canManage = currentUserRole === 'owner'

  // ── Uitnodigen ─────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    const { data, error } = await supabase
      .from('invitations')
      .insert({ show_id: showId, email: inviteEmail.trim().toLowerCase(), role: inviteRole })
      .select()
      .single()
    if (error) {
      setInviteError('Uitnodiging mislukt. Probeer opnieuw.')
    } else if (data) {
      setInvitations(prev => [...prev, data as Invitation])
      setInviteEmail('')
      setShowInvite(false)
    }
    setInviting(false)
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
    setOpenMenu(null)
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
            <h2 className="font-semibold text-base">Teamleden</h2>
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
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Nieuwe uitnodiging</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  placeholder="email@voorbeeld.nl"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as ShowMemberRole)}
                  className="text-sm bg-background border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {inviteError && <p className="text-xs text-destructive mb-2">{inviteError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Uitnodigen…' : 'Uitnodiging aanmaken'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowInvite(false); setInviteEmail('') }}>
                  Annuleren
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Er wordt een uitnodigingslink gegenereerd die je kunt delen.
              </p>
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

                {/* Rol badge / dropdown */}
                {canManage && member.role !== 'owner' ? (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                      disabled={changingRole === member.id}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80',
                        ROLE_COLORS[member.role]
                      )}
                    >
                      {changingRole === member.id
                        ? <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : <>{ROLE_LABELS[member.role]} <ChevronDown className="h-2.5 w-2.5" /></>
                      }
                    </button>
                    {openMenu === member.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg min-w-[160px] overflow-hidden">
                          {ASSIGNABLE_ROLES.map(role => (
                            <button
                              key={role}
                              onClick={() => changeRole(member.id, role)}
                              className="w-full flex items-start gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors text-left"
                            >
                              <div className="mt-0.5">
                                {member.role === role
                                  ? <Check className="h-3 w-3 text-primary" />
                                  : <div className="h-3 w-3" />
                                }
                              </div>
                              <div>
                                <p className="font-medium">{ROLE_LABELS[role]}</p>
                                <p className="text-muted-foreground text-[10px]">{ROLE_DESC[role]}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span className={cn('px-2 py-1 rounded border text-xs font-medium', ROLE_COLORS[member.role])}>
                    {ROLE_LABELS[member.role]}
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
                        {ROLE_LABELS[inv.role]} · verloopt {new Date(inv.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
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
