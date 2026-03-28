'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Shield, Calendar, ChevronDown, Check,
  Search, Trash2, Crown, ExternalLink, X, Sparkles,
  UserPlus, Clock,
} from 'lucide-react'
import type { UserRole, UserPlan, PlanSource } from '@/lib/types/database'
import {
  PLAN_LABELS, PLAN_COLORS, PLAN_SOURCE_LABELS, PLAN_SOURCE_COLORS, PLAN_PRICES,
  isTrialActive,
} from '@/lib/plans'
import type { Plan } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  plan: UserPlan
  plan_source: PlanSource
  plan_expires_at: string | null
  trial_ends_at: string | null
}

interface ShowRow {
  id: string
  name: string
  date: string | null
  created_by: string | null
  show_members: { count: number }[]
}

interface AdminPanelProps {
  users: UserRow[]
  shows: ShowRow[]
  currentUserRole: UserRole
}

const ROLE_LABELS: Record<UserRole, string> = {
  beheerder: 'Beheerder',
  admin:     'Admin',
  crew:      'Gebruiker',
}

const ROLE_DESC: Record<UserRole, string> = {
  beheerder: 'Volledig platform-beheer',
  admin:     'Gebruikersbeheer',
  crew:      'Standaard toegang',
}

const ROLE_COLORS: Record<UserRole, string> = {
  beheerder: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  admin:     'bg-primary/15 text-primary border-primary/30',
  crew:      'bg-muted text-muted-foreground border-border',
}

function Avatar({ user }: { user: Pick<UserRow, 'full_name' | 'email' | 'avatar_url'> }) {
  const initials = user.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()
  return (
    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
      {user.avatar_url
        ? <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
        : initials
      }
    </div>
  )
}

// ── Invite modal ─────────────────────────────────────────────────────────────
function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void
  onInvited: (email: string) => void
}) {
  const [email, setEmail]       = useState('')
  const [name, setName]         = useState('')
  const [plan, setPlan]         = useState<Plan>('free')
  const [source, setSource]     = useState<PlanSource>('gift')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        fullName: name.trim() || undefined,
        plan,
        planSource: plan !== 'free' ? source : 'free',
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Er ging iets mis')
    } else {
      setSuccess(true)
      onInvited(email.trim())
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Gebruiker uitnodigen</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {success ? (
            <div className="px-6 py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium">Uitnodiging verstuurd!</p>
              <p className="text-xs text-muted-foreground">
                {email} ontvangt een e-mail met een activatielink.
              </p>
              <button
                onClick={onClose}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Sluiten
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">E-mailadres *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Naam (optioneel) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Naam <span className="text-muted-foreground font-normal">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Voor- en achternaam"
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Plan (optioneel) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Startplan <span className="text-muted-foreground font-normal">(optioneel)</span>
                </label>
                <div className="flex gap-1.5">
                  {(['free', 'pro', 'team'] as Plan[]).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPlan(p)}
                      className={cn(
                        'flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors',
                        plan === p
                          ? PLAN_COLORS[p]
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {PLAN_LABELS[p]}
                    </button>
                  ))}
                </div>
                {plan !== 'free' && (
                  <div className="flex gap-1.5 mt-1.5">
                    {(['gift', 'paid'] as PlanSource[]).map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setSource(s)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-md border text-[10px] font-medium transition-colors',
                          source === s
                            ? 'bg-primary/15 text-primary border-primary/30'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {PLAN_SOURCE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Nieuwe gebruikers krijgen altijd een 3-daagse gratis trial.
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 text-xs text-muted-foreground hover:text-foreground py-2 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1 text-xs bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {loading
                    ? <div className="h-3 w-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <UserPlus className="h-3 w-3" />
                  }
                  {loading ? 'Versturen…' : 'Uitnodiging sturen'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

// ── Plan dropdown ────────────────────────────────────────────────────────────
function PlanDropdown({
  user,
  onUpdate,
}: {
  user: UserRow
  onUpdate: (userId: string, plan: Plan, source: PlanSource, expiresAt: string | null) => Promise<void>
}) {
  const [open, setOpen]             = useState(false)
  const [saving, setSaving]         = useState(false)
  const [editPlan, setEditPlan]     = useState<Plan>(user.plan as Plan)
  const [editSource, setEditSource] = useState<PlanSource>(user.plan_source)
  const [hasExpiry, setHasExpiry]   = useState(!!user.plan_expires_at)
  const [editExpiry, setEditExpiry] = useState(
    user.plan_expires_at ? user.plan_expires_at.slice(0, 10) : ''
  )

  const planOptions: Plan[] = ['free', 'pro', 'team']
  const sourceOptions: { value: PlanSource; label: string }[] = [
    { value: 'gift', label: 'Cadeau (gratis toegang)' },
    { value: 'paid', label: 'Betaald (via Mollie)' },
  ]

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(
      user.id,
      editPlan,
      editPlan === 'free' ? 'free' : editSource,
      (hasExpiry && editExpiry) ? new Date(editExpiry).toISOString() : null
    )
    setSaving(false)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors hover:opacity-80',
          PLAN_COLORS[user.plan as Plan]
        )}
      >
        {PLAN_LABELS[user.plan as Plan]}
        {user.plan !== 'free' && (
          <span className={cn('text-[9px]', PLAN_SOURCE_COLORS[user.plan_source])}>
            {PLAN_SOURCE_LABELS[user.plan_source]}
          </span>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden w-64 p-3 space-y-3">
            <p className="text-xs font-semibold text-foreground">Plan wijzigen</p>

            {/* Plan kiezen */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Plan</p>
              <div className="flex gap-1.5">
                {planOptions.map(p => (
                  <button
                    key={p}
                    onClick={() => { setEditPlan(p); if (p === 'free') setEditSource('free') }}
                    className={cn(
                      'flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors',
                      editPlan === p
                        ? PLAN_COLORS[p]
                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    <span>{PLAN_LABELS[p]}</span>
                    {PLAN_PRICES[p] && (
                      <span className="block text-[9px] opacity-60">€{PLAN_PRICES[p]}/m</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bron kiezen (alleen voor betaalde plannen) */}
            {editPlan !== 'free' && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Toegang via</p>
                <div className="flex gap-1.5">
                  {sourceOptions.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setEditSource(s.value)}
                      className={cn(
                        'flex-1 py-1.5 px-2 rounded-md border text-[10px] font-medium transition-colors text-center',
                        editSource === s.value
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Verloopdatum (optioneel) */}
            {editPlan !== 'free' && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasExpiry}
                    onChange={e => {
                      setHasExpiry(e.target.checked)
                      if (!e.target.checked) setEditExpiry('')
                    }}
                    className="rounded border-border accent-primary h-3.5 w-3.5"
                  />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Tijdelijk plan (met verloopdatum)
                  </span>
                </label>
                {hasExpiry && (
                  <input
                    type="date"
                    value={editExpiry}
                    onChange={e => setEditExpiry(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
                {!hasExpiry && (
                  <p className="text-[10px] text-muted-foreground/60">Plan verloopt nooit</p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 text-xs bg-primary text-primary-foreground py-1.5 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Hoofd component ──────────────────────────────────────────────────────────
export function AdminPanel({ users: initialUsers, shows, currentUserRole }: AdminPanelProps) {
  const [users, setUsers]               = useState(initialUsers)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openMenu, setOpenMenu]         = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [userSearch, setUserSearch]     = useState('')
  const [showSearch, setShowSearch]     = useState('')
  const [showInvite, setShowInvite]     = useState(false)

  const isBeheerder = currentUserRole === 'beheerder'

  const assignableRoles: UserRole[] = isBeheerder
    ? ['beheerder', 'admin', 'crew']
    : ['admin', 'crew']

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    if (!q) return users
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    )
  }, [users, userSearch])

  const filteredShows = useMemo(() => {
    const q = showSearch.toLowerCase().trim()
    if (!q) return shows
    return shows.filter(s => s.name.toLowerCase().includes(q))
  }, [shows, showSearch])

  // ── Rol wijzigen ────────────────────────────────────────────────────────────
  const changeRole = async (userId: string, newRole: UserRole) => {
    setChangingRole(userId)
    setOpenMenu(null)
    const res = await fetch('/api/admin/update-role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    // Fallback: direct Supabase update als route niet bestaat
    if (!res.ok) {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles').update({ role: newRole }).eq('id', userId)
      if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setChangingRole(null)
  }

  // ── Plan wijzigen ───────────────────────────────────────────────────────────
  const updatePlan = async (
    userId: string,
    plan: Plan,
    planSource: PlanSource,
    planExpiresAt: string | null
  ) => {
    const res = await fetch('/api/admin/update-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, plan, planSource, planExpiresAt }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u, plan: plan as UserPlan, plan_source: planSource, plan_expires_at: planExpiresAt }
          : u
      ))
    }
  }

  // ── Gebruiker verwijderen ───────────────────────────────────────────────────
  const deleteUser = async (userId: string) => {
    setDeleteConfirm(null)
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== userId))
    }
  }

  const proCount    = users.filter(u => u.plan === 'pro').length
  const teamCount   = users.filter(u => u.plan === 'team').length
  const trialCount  = users.filter(u => isTrialActive(u.trial_ends_at) && u.plan === 'free').length

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {isBeheerder
            ? <Crown className="h-6 w-6 text-violet-400" />
            : <Shield className="h-6 w-6 text-primary" />
          }
          {isBeheerder ? 'Beheerder-paneel' : 'Admin-paneel'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isBeheerder
            ? 'Volledig platform-overzicht — alle gebruikers, rollen, plannen en shows'
            : 'Beheer gebruikers en bekijk alle shows in CueBoard'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gebruikers', value: users.length,    icon: Users,    color: '' },
          { label: 'Trial',      value: trialCount,      icon: Clock,    color: 'text-amber-400' },
          { label: 'Pro',        value: proCount,        icon: Sparkles, color: 'text-primary' },
          { label: 'Team',       value: teamCount,       icon: Crown,    color: 'text-violet-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className={cn('h-4 w-4 text-muted-foreground', color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={(email) => {
            // Voeg tijdelijk placeholder toe zodat UI direct bijwerkt
            setUsers(prev => [...prev, {
              id: `pending-${Date.now()}`,
              email,
              full_name: null,
              role: 'crew',
              avatar_url: null,
              created_at: new Date().toISOString(),
              plan: 'free',
              plan_source: 'free',
              plan_expires_at: null,
              trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            } as UserRow])
          }}
        />
      )}

      {/* Gebruikers tabel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Alle gebruikers
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredUsers.length}/{users.length})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Uitnodigen (beheerder + admin) */}
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/25 rounded-md hover:bg-primary/20 transition-colors"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Uitnodigen
              </button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Zoek naam of e-mail…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md w-52 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredUsers.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">Geen gebruikers gevonden voor &ldquo;{userSearch}&rdquo;.</p>
            )}
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-6 py-3.5 flex-wrap sm:flex-nowrap">
                <Avatar user={user} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                  {user.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                  {user.plan_expires_at && user.plan !== 'free' && (
                    <p className="text-[10px] text-amber-400/80">
                      Plan verloopt {new Date(user.plan_expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {isTrialActive(user.trial_ends_at) && user.plan === 'free' && (
                    <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Trial tot {new Date(user.trial_ends_at!).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>

                {/* Plan dropdown */}
                {isBeheerder && (
                  <PlanDropdown user={user} onUpdate={updatePlan} />
                )}

                {/* Rol dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                    disabled={changingRole === user.id || (!isBeheerder && user.role === 'beheerder')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors',
                      ROLE_COLORS[user.role],
                      (!isBeheerder && user.role === 'beheerder') ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                    )}
                  >
                    {changingRole === user.id
                      ? <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : <>{ROLE_LABELS[user.role]} <ChevronDown className="h-3 w-3" /></>
                    }
                  </button>

                  {openMenu === user.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]">
                        {assignableRoles.map(role => (
                          <button
                            key={role}
                            onClick={() => changeRole(user.id, role)}
                            className="w-full flex items-start gap-2 px-3 py-2.5 text-xs hover:bg-muted transition-colors text-left"
                          >
                            <div className="mt-0.5 shrink-0">
                              {user.role === role
                                ? <Check className="h-3 w-3 text-primary" />
                                : <div className="h-3 w-3" />
                              }
                            </div>
                            <div>
                              <p className="font-medium">{ROLE_LABELS[role]}</p>
                              <p className="text-muted-foreground text-[10px]">{
                                role === 'beheerder' ? 'Volledig platform-beheer' :
                                role === 'admin'     ? 'Gebruikersbeheer' :
                                'Standaard toegang'
                              }</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Verwijder (alleen beheerder) */}
                {isBeheerder && (
                  deleteConfirm === user.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-xs text-destructive font-medium hover:underline"
                      >
                        Bevestig
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(user.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title="Gebruiker verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shows overzicht */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Alle shows
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredShows.length}/{shows.length})
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Zoek show…"
                value={showSearch}
                onChange={e => setShowSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md w-48 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {showSearch && (
                <button onClick={() => setShowSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredShows.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">
                {showSearch ? `Geen shows gevonden voor "${showSearch}".` : 'Geen shows gevonden.'}
              </p>
            )}
            {filteredShows.map(show => {
              const owner       = initialUsers.find(u => u.id === show.created_by)
              const memberCount = show.show_members?.[0]?.count ?? 0
              return (
                <div key={show.id} className="flex items-center gap-3 px-6 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{show.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {owner ? (owner.full_name || owner.email) : '—'}
                      {show.date && ` · ${new Date(show.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {memberCount} {memberCount === 1 ? 'lid' : 'leden'}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/shows/${show.id}`} className="text-xs gap-1.5">
                      <ExternalLink className="h-3 w-3" /> Bekijken
                    </a>
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
