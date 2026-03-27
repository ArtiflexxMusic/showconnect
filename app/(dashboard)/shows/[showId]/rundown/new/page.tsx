'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function NewRundownPage() {
  const router = useRouter()
  const params = useParams<{ showId: string }>()
  const supabase = createClient()

  const [name, setName] = useState('Rundown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: rundown, error: err } = await supabase
      .from('rundowns')
      .insert({ show_id: params.showId, name: name.trim() })
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push(`/shows/${params.showId}/rundown/${rundown.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nieuwe rundown</h1>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-4">
            {error && (
              <div className="text-sm text-destructive border border-destructive/50 bg-destructive/10 rounded-md p-3">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Naam rundown *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Technische rundown"
                required
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Aanmaken...</> : 'Aanmaken'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
