'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users, Shield, Calendar, ChevronDown, Check,
  Search, Trash2, Crown, ExternalLink, X,
} from 'lucide-react'
import type { UserRole } from '@/lib/types/database'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
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

export function AdminPanel({ users: initialUsers, shows, currentUserRole }: AdminPanelProps) {
  const [users, setUsers]               = useState(initialUsers)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openMenu, setOpenMenu]         = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [userSearch, setUserSearch]     = useState('')
  const [showSearch, setShowSearch]     = useState('')

  const supabase          = createClient()
  const isBeheerder       = currentUserRole === 'beheerder'

  // Rollen die de huidige user kan toewijzen
  const assignableRoles: UserRole[] = isBeheerder
    ? ['beheerder', 'admin', 'crew']
    : ['admin', 'crew']

  // ── Zoekfilter gebruikers ───────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase().trim()
    if (!q) return users
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q)
    )
  }, [users, userSearch])

  // ── Zoekfilter shows ────────────────────────────────────────────────────────
  const filteredShows = useMemo(() => {
    const q = showSearch.toLowerCase().trim()
    if (!q) return shows
    return shows.filter(s => s.name.toLowerCase().includes(q))
  }, [shows, showSearch])

  // ── Rol wijzigen ────────────────────────────────────────────────────────────
  const changeRole = async (userId: string, newRole: UserRole) => {
    setChangingRole(userId)
    setOpenMenu(null)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setChangingRole(null)
  }

  // ── Gebruiker verwijderen (alleen beheerder) ─────────────────────────────
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

  return (
    <div className="space-y-6 max-w-4xl">
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
            ? 'Volledig platform-overzicht — alle gebruikers, rollen en shows'
            : 'Beheer gebruikers en bekijk alle shows in CueBoard'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gebruikers', value: users.length, icon: Users, color: '' },
          { label: 'Beheerders', value: beheerderCount, icon: Crown, color: 'text-violet-400' },
          { label: 'Admins', value: adminCount, icon: Shield, color: 'text-primary' },
          { label: 'Shows', value: shows.length, icon: Calendar, color: '' },
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
            {/* Zoekbalk gebruikers */}
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
              <p className="px-6 py-4 text-sm text-muted-foreground">Geen gebruikers gevonden voor "{userSearch}".</p>
            )}
            {filteredUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-6 py-3.5">
                <Avatar user={user} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name || user.email}
                  </p>
                  {user.full_name && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block shrink-0">
                  {new Date(user.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

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
                              <p className="text-muted-foreground text-[10px]">{ROLE_DESC[role]}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Verwijder gebruiker (alleen beheerder) */}
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
            {/* Zoekbalk shows */}
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
              const owner      = initialUsers.find(u => u.id === show.created_by)
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
