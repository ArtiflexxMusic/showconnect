'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, Calendar, ChevronDown, Check } from 'lucide-react'
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
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  crew: 'Gebruiker',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-primary/15 text-primary border-primary/30',
  crew: 'bg-muted text-muted-foreground border-border',
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

export function AdminPanel({ users: initialUsers, shows }: AdminPanelProps) {
  const [users, setUsers] = useState(initialUsers)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const supabase = createClient()

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

  const adminCount = users.filter(u => u.role === 'admin').length
  const memberCount = users.length

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin paneel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Beheer alle gebruikers en shows in CueBoard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Gebruikers', value: memberCount, icon: Users },
          { label: 'Admins', value: adminCount, icon: Shield },
          { label: 'Shows', value: shows.length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gebruikers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alle gebruikers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {users.map(user => (
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
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {new Date(user.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                {/* Rol dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                    disabled={changingRole === user.id}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors',
                      ROLE_COLORS[user.role],
                      'hover:opacity-80'
                    )}
                  >
                    {changingRole === user.id
                      ? <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                      : ROLE_LABELS[user.role]
                    }
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {openMenu === user.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[130px]">
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                          <button
                            key={role}
                            onClick={() => changeRole(user.id, role)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                          >
                            {user.role === role
                              ? <Check className="h-3 w-3 text-primary" />
                              : <div className="h-3 w-3" />
                            }
                            {ROLE_LABELS[role]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shows overzicht */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Alle shows
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {shows.length === 0 && (
              <p className="px-6 py-4 text-sm text-muted-foreground">Geen shows gevonden.</p>
            )}
            {shows.map(show => {
              const owner = initialUsers.find(u => u.id === show.created_by)
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
                    <a href={`/shows/${show.id}`} className="text-xs">Bekijken</a>
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
