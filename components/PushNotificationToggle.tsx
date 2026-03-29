'use client'

/**
 * PushNotificationToggle
 *
 * Knop om push notificaties in/uit te schakelen.
 * Toon dit in de instellingen of dashboard header.
 *
 * Gebruik:
 *   <PushNotificationToggle />
 */

import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { cn } from '@/lib/utils'

interface PushNotificationToggleProps {
  className?: string
  /** Als true: toon alleen icoon (geen label) */
  iconOnly?: boolean
}

export function PushNotificationToggle({ className, iconOnly = false }: PushNotificationToggleProps) {
  const { isSupported, isSubscribed, isLoading, status, subscribe, unsubscribe } = usePushNotifications()

  if (!isSupported) return null

  const handleClick = () => {
    if (isSubscribed) unsubscribe()
    else subscribe()
  }

  const label = isLoading
    ? 'Bezig...'
    : isSubscribed
    ? 'Notificaties uit'
    : 'Notificaties aan'

  const title = isLoading
    ? 'Bezig...'
    : isSubscribed
    ? 'Push notificaties uitschakelen'
    : 'Push notificaties inschakelen'

  return (
    <Button
      variant={isSubscribed ? 'default' : 'outline'}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      title={title}
      className={cn(
        'gap-2',
        isSubscribed && 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30',
        status === 'denied' && 'text-destructive border-destructive/30',
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      )}
      {!iconOnly && <span>{label}</span>}
      {status === 'denied' && !iconOnly && (
        <span className="text-[10px] text-destructive/70">(geblokkeerd)</span>
      )}
    </Button>
  )
}
