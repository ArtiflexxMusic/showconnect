import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-bold text-muted-foreground/30 mb-4">404</p>
        <h2 className="text-xl font-semibold mb-2">Pagina niet gevonden</h2>
        <p className="text-sm text-muted-foreground mb-6">
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <Button asChild>
          <Link href="/dashboard">Terug naar dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
