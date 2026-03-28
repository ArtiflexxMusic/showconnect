'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function CallerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Caller error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Fout bij laden</h2>
        <p className="text-sm text-muted-foreground mb-6">
          De caller- of presenterweergave kon niet worden geladen. Controleer de verbinding en probeer opnieuw.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-4 font-mono">Code: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}
