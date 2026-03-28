'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Plus, Shield, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overzicht' },
  { href: '/shows/new', icon: Plus,            label: 'Nieuwe show' },
  { href: '/profile',   icon: User,             label: 'Mijn profiel' },
]

interface AppSidebarProps {
  isAdmin?: boolean
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border/50 bg-background/50 hidden md:flex flex-col">
      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Navigatie
        </p>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Beheer
            </p>
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              Admin
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border/50">
        <div className="px-3 py-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">CueBoard</p>
        </div>
      </div>
    </aside>
  )
}
