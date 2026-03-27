'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, Radio } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

interface AppHeaderProps {
  user: Profile | null
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Radio className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="tracking-tight">CueBoard</span>
        </div>

        <div className="flex-1" />

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.full_name ?? user.email}</p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{user.role}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Uitloggen">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
