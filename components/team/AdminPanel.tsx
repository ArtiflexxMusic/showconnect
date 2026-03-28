'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Shield, Calendar, ChevronDown, Check,
  Search, Trash2, Crown, ExternalLink, X, Sparkles,
} from 'lucide-react'
import type { UserRole, UserPlan, PlanSource } from '@/lib/types/database'
import {
  PLAN_LABELS, PLAN_COLORS, PLAN_SOURCE_LABELS, PLAN_SOURCE_COLORS, PLAN_PRICES,
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

  const beheerderCount = users.filter(u => u.role === 'beheerder').length
  const adminCount     = users.filter(u => u.role === 'admin').length
  const proCount       = users.filter(u => u.plan === 'pro').length
  const teamCount      = users.filter(u => u.plan === 'team').length

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
          { label: 'Pro',        value: proCount,        icon: Sparkles, color: 'text-primary' },
          { label: 'Team',       value: teamCount,       icon: Crown,    color: 'text-violet-400' },
          { label: 'Shows',      value: shows.length,    icon: Calendar, color: '' },
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
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Zoek naam of e-mail…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md w-56 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
                      Verloopt {new Date(user.plan_expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
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
