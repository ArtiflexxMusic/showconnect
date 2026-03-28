'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Plus, Shield, User, HelpCircle, Zap, Receipt } from 'lucide-react'

const showItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overzicht' },
  { href: '/shows/new', icon: Plus,            label: 'Nieuwe show' },
]

const accountItems = [
  { href: '/profile',  icon: User,        label: 'Mijn profiel' },
  { href: '/billing',  icon: Receipt,     label: 'Facturen' },
  { href: '/upgrade',  icon: Zap,         label: 'Plannen' },
  { href: '/help',     icon: HelpCircle,  label: 'Help & Uitleg' },
]

interface AppSidebarProps {
  isAdmin?: boolean
}

function NavGroup({ label, items, pathname }: {
  label: string
  items: { href: string; icon: React.ElementType; label: string }[]
  pathname: string
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {items.map(({ href, icon: Icon, label: itemLabel }) => (
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
          {itemLabel}
        </Link>
      ))}
    </div>
  )
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border/50 bg-background/50 hidden md:flex flex-col">
      <nav className="flex-1 p-3 space-y-4">
        <NavGroup label="Shows" items={showItems} pathname={pathname} />
        <NavGroup label="Account" items={accountItems} pathname={pathname} />

        {isAdmin && (
          <div className="space-y-1">
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
          </div>
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
