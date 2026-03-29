'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, Plus, Shield, User, Menu, X, HelpCircle, Zap } from 'lucide-react'
import type { Profile } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { ChangelogBell } from './ChangelogBell'
import { GlobalSearch } from './GlobalSearch'

interface AppHeaderProps {
  user: Profile | null
  isAdmin?: boolean
}

function UserAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  return (
    <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
      {initials}
    </div>
  )
}

export function AppHeader({ user, isAdmin }: AppHeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const mobileNavItems = [
    { href: '/dashboard',  icon: LayoutDashboard, label: 'Overzicht' },
    { href: '/shows/new',  icon: Plus,             label: 'Nieuwe show' },
    { href: '/profile',    icon: User,             label: 'Mijn profiel' },
    { href: '/upgrade',    icon: Zap,              label: 'Plannen & betaling' },
    { href: '/help',       icon: HelpCircle,       label: 'Help & Uitleg' },
    ...(isAdmin ? [{ href: '/admin', icon: Shield, label: 'Admin' }] : []),
  ]

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6 gap-4">

          {/* Hamburger (mobile only) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            <span className="font-black text-base tracking-tight text-white uppercase">CueBoard</span>
          </Link>

          <div className="flex-1" />

          {/* Globale zoekfunctie */}
          {user && <GlobalSearch />}

          {/* Changelog bell */}
          <ChangelogBell />

          {/* User info + profiel link + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-accent transition-colors"
                title="Mijn profiel"
              >
                <UserAvatar name={user.full_name} email={user.email} />
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium leading-none">{user.full_name ?? user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {user.role === 'beheerder' ? 'Beheerder' : user.role === 'admin' ? 'Admin' : 'Gebruiker'}
                  </p>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Uitloggen" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="fixed top-14 left-0 bottom-0 z-30 w-64 bg-background border-r border-border md:hidden flex flex-col">
            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
              <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Navigatie
              </p>
              {mobileNavItems.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    pathname === href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Uitloggen
              </Button>
            </div>
          </nav>
        </>
      )}
    </>
  )
}
