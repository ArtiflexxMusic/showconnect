'use client'

import { useEffect, useState } from 'react'
import { cn, formatDuration } from '@/lib/utils'

interface CueCountdownProps {
  durationSeconds: number
  startedAt: string
}

export function CueCountdown({ durationSeconds, startedAt }: CueCountdownProps) {
  const [remaining, setRemaining] = useState<number>(durationSeconds)

  useEffect(() => {
    function tick() {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      const rem = Math.max(0, durationSeconds - elapsed)
      setRemaining(Math.ceil(rem))
    }

    tick() // direct uitvoeren
    const interval = setInterval(tick, 500)
    return () => clearInterval(interval)
  }, [durationSeconds, startedAt])

  const isWarning  = remaining <= 60 && remaining > 10
  const isCritical = remaining <= 10
  const isOverrun  = remaining <= 0

  return (
    <span
      className={cn(
        'text-sm font-mono font-bold tabular-nums',
        isCritical  && 'text-red-400 countdown-critical',
        isWarning   && !isCritical && 'text-yellow-400 countdown-warning',
        !isWarning  && !isCritical && 'text-green-400',
        isOverrun   && 'text-red-500'
      )}
    >
      {isOverrun ? (
        <span>+{formatDuration(Math.abs(remaining - durationSeconds))}</span>
      ) : (
        formatDuration(remaining)
      )}
    </span>
  )
}
