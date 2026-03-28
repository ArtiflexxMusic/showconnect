'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-1">Er ging iets mis</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Er is een onverwachte fout opgetreden. Je kunt het opnieuw proberen of terugkeren naar het dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">Code: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Naar dashboard
        </Button>
        <Button onClick={reset}>Opnieuw proberen</Button>
      </div>
    </div>
  )
}
