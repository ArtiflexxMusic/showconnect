'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export function CreateShowForm() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [description, setDescription] = useState('')
  const [rundownName, setRundownName] = useState('Hoofdrundown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd')

      // Show aanmaken
      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert({
          name: name.trim(),
          date:        date || null,
          venue:       venue.trim() || null,
          description: description.trim() || null,
          created_by:  user.id,
        })
        .select()
        .single()

      if (showError) throw showError

      // Creator als owner toevoegen aan show_members
      await supabase.from('show_members').insert({
        show_id: show.id,
        user_id: user.id,
        role:    'owner',
      })

      // Hoofdrundown aanmaken
      const { data: rundown, error: rundownError } = await supabase
        .from('rundowns')
        .insert({
          show_id: show.id,
          name:    rundownName.trim() || 'Hoofdrundown',
        })
        .select()
        .single()

      if (rundownError) throw rundownError

      // Direct naar de rundown editor
      router.push(`/shows/${show.id}/rundown/${rundown.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="show-name">Show naam *</Label>
            <Input
              id="show-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bedrijfsevenement 2026"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="show-date">Datum</Label>
              <Input
                id="show-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="show-venue">Locatie</Label>
              <Input
                id="show-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Stadsschouwburg Amsterdam"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="show-description">Omschrijving</Label>
            <Textarea
              id="show-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Korte omschrijving van het evenement..."
              rows={3}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="rundown-name">Naam eerste rundown</Label>
            <Input
              id="rundown-name"
              value={rundownName}
              onChange={(e) => setRundownName(e.target.value)}
              placeholder="Hoofdrundown"
            />
            <p className="text-xs text-muted-foreground">
              Er wordt direct een rundown aangemaakt zodat je meteen kunt beginnen.
            </p>
          </div>
        </CardContent>

        <CardFooter className="gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuleren
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Aanmaken...</>
            ) : (
              'Show aanmaken'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
