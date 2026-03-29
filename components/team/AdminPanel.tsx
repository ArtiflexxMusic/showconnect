'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Shield, Calendar, ChevronDown, Check,
  Search, Trash2, Crown, ExternalLink, X, Sparkles,
  UserPlus, Clock, Phone, Download, Filter,
  Mail, Key, Link2, CheckCircle2, Edit2, Loader2, AlertCircle,
  PlusCircle, StickyNote, BarChart2, TrendingUp,
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
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  plan: UserPlan
  plan_source: PlanSource
  plan_expires_at: string | null
  trial_ends_at: string | null
  admin_notes?: string | null
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
  const [planFilter, setPlanFilter]     = useState<'all' | 'free' | 'trial' | 'pro' | 'team'>('all')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [sortBy, setSortBy]             = useState<'created_at' | 'name' | 'plan'>('created_at')
  const [sortAsc, setSortAsc]           = useState(false)
  // Bulk selectie
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkPlan, setBulkPlan]           = useState<Plan | null>(null)
  const [bulkLoading, setBulkLoading]     = useState(false)
  // Trial verlengen
  const [extendingTrial, setExtendingTrial] = useState<string | null>(null)
  const [extendDays, setExtendDays]         = useState(7)
  // Admin notities
  const [editingNotes, setEditingNotes]   = useState<string | null>(null)
  const [notesValue, setNotesValue]       = useState('')
  const [savingNotes, setSavingNotes]     = useState(false)
  // Grafieken
  const [showCharts, setShowCharts]       = useState(false)
  // Direct e-mail sturen
  const [emailingUser, setEmailingUser]   = useState<string | null>(null)
  const [emailSubject, setEmailSubject]   = useState('')
  const [emailMessage, setEmailMessage]   = useState('')
  const [sendingEmail, setSendingEmail]   = useState(false)

  // Gebruikersacties
  const [actionLoading, setActionLoading] = useState<string | null>(null)  // userId
  const [actionMsg, setActionMsg]         = useState<{ userId: string; msg: string; ok: boolean } | null>(null)
  const [editingField, setEditingField]   = useState<{ userId: string; field: 'email' | 'name' | 'phone' } | null>(null)
  const [editValue, setEditValue]         = useState('')

  const isBeheerder = currentUserRole === 'beheerder'

  const assignableRoles: UserRole[] = isBeheerder
    ? ['beheerder', 'admin', 'crew']
    : ['admin', 'crew']

  // Shows aangemaakt per gebruiker
  const showsPerUser = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of shows) {
      if (s.created_by) map[s.created_by] = (map[s.created_by] ?? 0) + 1
    }
    return map
  }, [shows])

  const filteredUsers = useMemo(() => {
    let list = users
    // Plan filter
    if (planFilter !== 'all') {
      list = list.filter(u => {
        if (planFilter === 'trial') return isTrialActive(u.trial_ends_at) && u.plan === 'free'
        if (planFilter === 'free')  return u.plan === 'free' && !isTrialActive(u.trial_ends_at)
        return u.plan === planFilter
      })
    }
    // Zoeken
    const q = userSearch.toLowerCase().trim()
    if (q) {
      list = list.filter(u =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q)
      )
    }
    // Sorteren
    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name')       cmp = (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
      if (sortBy === 'plan')       cmp = a.plan.localeCompare(b.plan)
      if (sortBy === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [users, userSearch, planFilter, sortBy, sortAsc])

  const filteredShows = useMemo(() => {
    const q = showSearch.toLowerCase().trim()
    if (!q) return shows
    return shows.filter(s => s.name.toLowerCase().includes(q))
  }, [shows, showSearch])

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportCsv() {
    const header = ['Naam', 'E-mail', 'Telefoon', 'Rol', 'Plan', 'Shows', 'Lid sinds']
    const rows = users.map(u => [
      u.full_name ?? '',
      u.email,
      u.phone ?? '',
      u.role,
      u.plan,
      String(showsPerUser[u.id] ?? 0),
      new Date(u.created_at).toLocaleDateString('nl-NL'),
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `cueboard-gebruikers-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

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

  // ── Gebruikersactie uitvoeren ────────────────────────────────────────────────
  const performUserAction = async (userId: string, action: string, extra?: Record<string, string>) => {
    setActionLoading(userId)
    setActionMsg(null)
    try {
      const res = await fetch('/api/admin/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId, ...extra }),
      })
      const data = await res.json()
      setActionMsg({ userId, msg: data.message ?? data.error ?? 'Klaar', ok: res.ok })
      if (res.ok && action === 'change_email' && extra?.newEmail) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, email: extra.newEmail! } : u))
      }
      if (res.ok && action === 'change_name' && extra?.newName) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, full_name: extra.newName! } : u))
      }
      if (res.ok && action === 'change_phone') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, phone: extra?.newPhone ?? null } : u))
      }
    } catch {
      setActionMsg({ userId, msg: 'Netwerk fout', ok: false })
    } finally {
      setActionLoading(null)
      setEditingField(null)
      setTimeout(() => setActionMsg(null), 4000)
    }
  }

  const proCount    = users.filter(u => u.plan === 'pro').length
  const teamCount   = users.filter(u => u.plan === 'team').length
  const trialCount  = users.filter(u => isTrialActive(u.trial_ends_at) && u.plan === 'free').length
  const expiringTrials = useMemo(() => {
    const cutoff = Date.now() + 7 * 24 * 60 * 60 * 1000
    return users.filter(u =>
      isTrialActive(u.trial_ends_at) &&
      u.plan === 'free' &&
      u.trial_ends_at &&
      new Date(u.trial_ends_at).getTime() <= cutoff
    ).sort((a, b) => new Date(a.trial_ends_at!).getTime() - new Date(b.trial_ends_at!).getTime())
  }, [users])
  // Schat MRR op basis van plan-prijzen (EUR)
  const mrrEur = useMemo(() => {
    const proPricePerMonth  = 9.99
    const teamPricePerMonth = 24.99
    return (proCount * proPricePerMonth + teamCount * teamPricePerMonth).toFixed(0)
  }, [proCount, teamCount])

  // Signups per week (laatste 8 weken)
  const signupsChart = useMemo(() => {
    const weeks: Record<string, number> = {}
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const label = `W${d.getDate()}/${d.getMonth() + 1}`
      weeks[label] = 0
    }
    for (const u of users) {
      const created = new Date(u.created_at)
      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= 0 && diffDays < 56) {
        const weekIdx = Math.floor(diffDays / 7)
        const d = new Date(now)
        d.setDate(d.getDate() - weekIdx * 7)
        const label = `W${d.getDate()}/${d.getMonth() + 1}`
        if (label in weeks) weeks[label]++
      }
    }
    return Object.entries(weeks).map(([week, count]) => ({ week, count })).reverse()
  }, [users])

  // ── Bulk plan wijzigen ──────────────────────────────────────────────────────
  const bulkUpdatePlan = async (plan: Plan, planSource: PlanSource) => {
    if (selectedUsers.size === 0) return
    setBulkLoading(true)
    const ids = Array.from(selectedUsers)
    await Promise.all(ids.map(id => updatePlan(id, plan, planSource, null)))
    setSelectedUsers(new Set())
    setBulkPlan(null)
    setBulkLoading(false)
  }

  const toggleUserSelect = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Trial verlengen ─────────────────────────────────────────────────────────
  const extendTrial = async (userId: string) => {
    setExtendingTrial(userId)
    const res = await fetch('/api/admin/extend-trial', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, days: extendDays }),
    })
    const data = await res.json()
    if (res.ok && data.trial_ends_at) {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, trial_ends_at: data.trial_ends_at } : u
      ))
    }
    setExtendingTrial(null)
  }

  // ── Admin notities opslaan ──────────────────────────────────────────────────
  const saveAdminNotes = async (userId: string) => {
    setSavingNotes(true)
    await fetch('/api/admin/save-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, notes: notesValue }),
    })
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, admin_notes: notesValue.trim() || null } : u
    ))
    setSavingNotes(false)
    setEditingNotes(null)
  }

  const sendDirectEmail = async (userId: string) => {
    if (!emailSubject.trim() || !emailMessage.trim()) return
    setSendingEmail(true)
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subject: emailSubject, message: emailMessage }),
    })
    const data = await res.json().catch(() => ({}))
    setActionMsg({
      userId,
      msg: data.ok ? `E-mail verstuurd naar ${data.to}` : `Fout: ${data.error ?? 'Onbekend'}`,
      ok: !!data.ok,
    })
    setSendingEmail(false)
    if (data.ok) {
      setEmailingUser(null)
      setEmailSubject('')
      setEmailMessage('')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
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
        {isBeheerder && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${showCharts ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
            >
              <BarChart2 className="h-3.5 w-3.5" /> Grafieken
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground border border-border rounded-md hover:bg-muted/80 transition-colors"
              title="Exporteer gebruikerslijst als CSV"
            >
              <Download className="h-3.5 w-3.5" /> CSV exporteren
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Gebruikers', value: users.length,    icon: Users,    color: '',                   filter: 'all'   },
          { label: 'Trial',      value: trialCount,      icon: Clock,    color: 'text-amber-400',     filter: 'trial' },
          { label: 'Gratis',     value: users.filter(u => u.plan === 'free' && !isTrialActive(u.trial_ends_at)).length, icon: Users, color: 'text-muted-foreground', filter: 'free' },
          { label: 'Team',     value: proCount,        icon: Sparkles, color: 'text-primary',       filter: 'pro'   },
          { label: 'Business', value: teamCount,       icon: Crown,    color: 'text-violet-400',    filter: 'team'  },
        ].map(({ label, value, icon: Icon, color, filter }) => (
          <Card
            key={label}
            className={cn('cursor-pointer transition-colors', planFilter === filter && 'ring-1 ring-primary border-primary/40')}
            onClick={() => setPlanFilter(planFilter === filter ? 'all' : filter as typeof planFilter)}
          >
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
        {/* MRR schatting */}
        {isBeheerder && (
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Est. MRR</p>
                  <p className="text-2xl font-bold mt-0.5">€{mrrEur}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grafieken */}
      {showCharts && isBeheerder && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Signups per week (laatste 8 weken)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-2 px-2">
              {(() => {
                const maxCount = Math.max(...signupsChart.map(d => d.count), 1)
                return signupsChart.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.count}
                    </span>
                    <div
                      className="w-full rounded-t-sm bg-primary/70 hover:bg-primary transition-colors"
                      style={{ height: `${Math.max((d.count / maxCount) * 152, d.count > 0 ? 4 : 0)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.week}</span>
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trials die binnenkort verlopen */}
      {expiringTrials.length > 0 && isBeheerder && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              {expiringTrials.length} trial{expiringTrials.length !== 1 ? 's' : ''} verlopen binnen 7 dagen
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {expiringTrials.map(u => (
              <div key={u.id} className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                <span className="text-amber-300/80">{u.full_name ?? u.email}</span>
                <span className="text-amber-500/60">
                  {u.trial_ends_at && (
                    <>verloopt {new Date(u.trial_ends_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              {planFilter !== 'all' && (
                <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary border border-primary/25 rounded px-1.5 py-0.5">
                  <Filter className="h-2.5 w-2.5" />
                  {planFilter === 'trial' ? 'Trial' : planFilter === 'free' ? 'Individual' : planFilter === 'pro' ? 'Team' : 'Business'}
                  <button onClick={() => setPlanFilter('all')} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sorteren */}
              <select
                value={`${sortBy}-${sortAsc ? 'asc' : 'desc'}`}
                onChange={e => {
                  const [field, dir] = e.target.value.split('-')
                  setSortBy(field as typeof sortBy)
                  setSortAsc(dir === 'asc')
                }}
                className="text-xs bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-muted-foreground"
              >
                <option value="created_at-desc">Nieuwste eerst</option>
                <option value="created_at-asc">Oudste eerst</option>
                <option value="name-asc">Naam A–Z</option>
                <option value="name-desc">Naam Z–A</option>
                <option value="plan-asc">Plan A–Z</option>
              </select>
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
                  placeholder="Zoek naam, e-mail of tel…"
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
          {/* Bulk acties bar */}
          {selectedUsers.size > 0 && isBeheerder && (
            <div className="flex items-center gap-3 px-6 py-2.5 bg-primary/5 border-b border-primary/20 flex-wrap">
              <span className="text-xs font-semibold text-primary">{selectedUsers.size} geselecteerd</span>
              <span className="w-px h-4 bg-border/60" />
              <span className="text-xs text-muted-foreground">Plan wijzigen naar:</span>
              {(['free', 'pro', 'team'] as Plan[]).map(p => (
                <button
                  key={p}
                  onClick={() => bulkUpdatePlan(p, p === 'free' ? 'free' : 'gift')}
                  disabled={bulkLoading}
                  className="text-xs px-2.5 py-1 rounded border border-border bg-card hover:bg-accent transition-colors"
                >
                  {PLAN_LABELS[p]}
                </button>
              ))}
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div>
            {filteredUsers.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">Geen gebruikers gevonden{userSearch ? ` voor "${userSearch}"` : planFilter !== 'all' ? ' voor dit filter' : ''}.</p>
            )}
            {filteredUsers.map(user => (
              <div key={user.id} className={cn('border-b border-border last:border-0', selectedUsers.has(user.id) && 'bg-primary/5')}>
              <div className="flex items-center gap-3 px-6 py-3.5 flex-wrap sm:flex-nowrap">
                {/* Selectievakje */}
                {isBeheerder && (
                  <button
                    onClick={() => toggleUserSelect(user.id)}
                    className="shrink-0"
                  >
                    <span className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                      selectedUsers.has(user.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
                    )}>
                      {selectedUsers.has(user.id) && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </button>
                )}
                <Avatar user={user} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {user.full_name || user.email}
                    </p>
                    {/* Expandeer knop voor extra info */}
                    <button
                      onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Meer details"
                    >
                      <ChevronDown className={cn('h-3 w-3 transition-transform', expandedUser === user.id && 'rotate-180')} />
                    </button>
                  </div>
                  {user.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5">
                    {user.phone && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />{user.phone}
                      </p>
                    )}
                    {(showsPerUser[user.id] ?? 0) > 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />{showsPerUser[user.id]} show{showsPerUser[user.id] !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
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

              {/* Uitklapbare gebruikersdetails + acties */}
              {expandedUser === user.id && (
                <div className="px-6 pb-5 bg-muted/20 border-t border-border/50 space-y-4 pt-3">

                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-0.5">Lid sinds</p>
                      <p className="font-medium">{new Date(user.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Shows aangemaakt</p>
                      <p className="font-medium">{showsPerUser[user.id] ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">Gebruiker-ID</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate" title={user.id}>{user.id.slice(0, 8)}…</p>
                    </div>
                    {user.trial_ends_at && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Trial eindigt</p>
                        <p className={cn('font-medium', isTrialActive(user.trial_ends_at) ? 'text-amber-400' : 'text-muted-foreground/50 line-through')}>
                          {new Date(user.trial_ends_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                    {user.plan_expires_at && user.plan !== 'free' && (
                      <div>
                        <p className="text-muted-foreground mb-0.5">Plan verloopt</p>
                        <p className="font-medium text-amber-400">{new Date(user.plan_expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    )}
                  </div>

                  {/* Bewerkbare velden */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* E-mail */}
                    <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded-md px-3 py-2">
                      <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                      {editingField?.userId === user.id && editingField.field === 'email' ? (
                        <form className="flex-1 flex gap-1" onSubmit={e => { e.preventDefault(); performUserAction(user.id, 'change_email', { newEmail: editValue }) }}>
                          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 text-xs bg-transparent border-b border-primary focus:outline-none min-w-0" placeholder="nieuw@mail.nl" />
                          <button type="submit" className="text-primary hover:text-primary/80"><Check className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setEditingField(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                        </form>
                      ) : (
                        <span className="flex-1 truncate text-muted-foreground">{user.email}</span>
                      )}
                      {editingField?.userId !== user.id && (
                        <button onClick={() => { setEditingField({ userId: user.id, field: 'email' }); setEditValue(user.email) }} className="text-muted-foreground/50 hover:text-primary transition-colors" title="E-mail wijzigen">
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Naam */}
                    <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded-md px-3 py-2">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      {editingField?.userId === user.id && editingField.field === 'name' ? (
                        <form className="flex-1 flex gap-1" onSubmit={e => { e.preventDefault(); performUserAction(user.id, 'change_name', { newName: editValue }) }}>
                          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 text-xs bg-transparent border-b border-primary focus:outline-none min-w-0" placeholder="Volledige naam" />
                          <button type="submit" className="text-primary hover:text-primary/80"><Check className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setEditingField(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                        </form>
                      ) : (
                        <span className="flex-1 truncate text-muted-foreground">{user.full_name ?? <em className="opacity-50">Geen naam</em>}</span>
                      )}
                      {editingField?.userId !== user.id && (
                        <button onClick={() => { setEditingField({ userId: user.id, field: 'name' }); setEditValue(user.full_name ?? '') }} className="text-muted-foreground/50 hover:text-primary transition-colors" title="Naam wijzigen">
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Telefoon */}
                    <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded-md px-3 py-2">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      {editingField?.userId === user.id && editingField.field === 'phone' ? (
                        <form className="flex-1 flex gap-1" onSubmit={e => { e.preventDefault(); performUserAction(user.id, 'change_phone', { newPhone: editValue }) }}>
                          <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 text-xs bg-transparent border-b border-primary focus:outline-none min-w-0" placeholder="+31 6 …" />
                          <button type="submit" className="text-primary hover:text-primary/80"><Check className="h-3 w-3" /></button>
                          <button type="button" onClick={() => setEditingField(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                        </form>
                      ) : (
                        <span className="flex-1 truncate text-muted-foreground">{user.phone ?? <em className="opacity-50">Geen telefoon</em>}</span>
                      )}
                      {editingField?.userId !== user.id && (
                        <button onClick={() => { setEditingField({ userId: user.id, field: 'phone' }); setEditValue(user.phone ?? '') }} className="text-muted-foreground/50 hover:text-primary transition-colors" title="Telefoon wijzigen">
                          <Edit2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Trial verlengen */}
                  {isBeheerder && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium">Trial verlengen:</span>
                      {[3, 7, 14, 30].map(d => (
                        <button
                          key={d}
                          onClick={() => extendTrial(user.id)}
                          disabled={extendingTrial === user.id}
                          onMouseEnter={() => setExtendDays(d)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-amber-500/30 text-amber-400 rounded-md hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                        >
                          {extendingTrial === user.id && extendDays === d
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <PlusCircle className="h-3 w-3" />
                          }
                          +{d}d
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Admin notities */}
                  {isBeheerder && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <StickyNote className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Admin-notitie</span>
                        {user.admin_notes && editingNotes !== user.id && (
                          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded px-1.5">heeft notitie</span>
                        )}
                      </div>
                      {editingNotes === user.id ? (
                        <div className="flex gap-2">
                          <textarea
                            autoFocus
                            value={notesValue}
                            onChange={e => setNotesValue(e.target.value)}
                            rows={2}
                            placeholder="Interne notitie voor admins…"
                            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => saveAdminNotes(user.id)}
                              disabled={savingNotes}
                              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                              {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            </button>
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="text-xs px-2 py-1 border border-border rounded-md text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNotes(user.id); setNotesValue(user.admin_notes ?? '') }}
                          className="text-left text-xs w-full px-3 py-2 bg-background/60 border border-border/50 rounded-md hover:border-border transition-colors text-muted-foreground"
                        >
                          {user.admin_notes || <span className="opacity-50">Klik om notitie toe te voegen…</span>}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actie-knoppen */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { action: 'resend_confirmation', label: 'Bevestigingsmail', icon: Mail,          title: 'Stuur bevestigingsmail opnieuw' },
                      { action: 'confirm_email',       label: 'Bevestig direct', icon: CheckCircle2,   title: 'Markeer e-mail als bevestigd zonder mail' },
                      { action: 'send_password_reset', label: 'Wachtwoord reset', icon: Key,           title: 'Stuur wachtwoord-reset mail' },
                      { action: 'send_magic_link',     label: 'Stuur inloglink', icon: Link2,           title: 'Stuur een passwordless inloglink' },
                    ].map(({ action, label, icon: Icon, title }) => (
                      <button
                        key={action}
                        onClick={() => performUserAction(user.id, action)}
                        disabled={actionLoading === user.id}
                        title={title}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-border/60 rounded-md hover:bg-muted/60 hover:border-border transition-colors disabled:opacity-50"
                      >
                        {actionLoading === user.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Icon className="h-3 w-3 text-muted-foreground" />
                        }
                        {label}
                      </button>
                    ))}
                    {/* Direct e-mail sturen */}
                    {isBeheerder && (
                      <button
                        onClick={() => {
                          setEmailingUser(emailingUser === user.id ? null : user.id)
                          setEmailSubject('')
                          setEmailMessage('')
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors',
                          emailingUser === user.id
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'bg-background border-border/60 hover:bg-muted/60 hover:border-border'
                        )}
                      >
                        <Mail className="h-3 w-3" />
                        Direct e-mail
                      </button>
                    )}
                  </div>

                  {/* Direct e-mail formulier */}
                  {emailingUser === user.id && (
                    <div className="space-y-2 bg-background/60 border border-border/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3" /> E-mail sturen naar {user.email}
                      </p>
                      <input
                        value={emailSubject}
                        onChange={e => setEmailSubject(e.target.value)}
                        placeholder="Onderwerp…"
                        className="w-full text-xs bg-background border border-border/60 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <textarea
                        value={emailMessage}
                        onChange={e => setEmailMessage(e.target.value)}
                        placeholder="Je bericht aan de gebruiker…"
                        rows={3}
                        className="w-full text-xs bg-background border border-border/60 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => sendDirectEmail(user.id)}
                          disabled={sendingEmail || !emailSubject.trim() || !emailMessage.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {sendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                          Versturen
                        </button>
                        <button
                          onClick={() => setEmailingUser(null)}
                          className="px-3 py-1.5 text-xs border border-border/60 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback bericht */}
                  {actionMsg?.userId === user.id && (
                    <div className={cn(
                      'flex items-center gap-2 text-xs px-3 py-2 rounded-md border',
                      actionMsg.ok
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                        : 'bg-destructive/10 border-destructive/25 text-destructive'
                    )}>
                      {actionMsg.ok
                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      }
                      {actionMsg.msg}
                    </div>
                  )}
                </div>
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
