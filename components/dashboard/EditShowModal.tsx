'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ShowEditValues {
  id: string
  name: string
  date: string | null
  venue: string | null
  description: string | null
  client?: string | null
}

interface EditShowModalProps {
  open: boolean
  show: ShowEditValues | null
  onClose: () => void
  onSaved: (updated: ShowEditValues) => void
}

export function EditShowModal({ open, show, onClose, onSaved }: EditShowModalProps) {
  const supabase = createClient()

  const [name, setName]               = useState('')
  const [date, setDate]               = useState('')
  const [venue, setVenue]             = useState('')
  const [description, setDescription] = useState('')
  const [client, setClient]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    if (open && show) {
      setName(show.name)
      setDate(show.date ?? '')
      setVenue(show.venue ?? '')
      setDescription(show.description ?? '')
      setClient(show.client ?? '')
      setError(null)
    }
  }, [open, show])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!show || !name.trim()) return
    setLoading(true)
    setError(null)

    const updates = {
      name:        name.trim(),
      date:        date || null,
      venue:       venue.trim() || null,
      description: description.trim() || null,
      client:      client.trim() || null,
    }

    const { error: supabaseError } = await supabase
      .from('shows')
      .update(updates as Record<string, unknown>)
      .eq('id', show.id)

    setLoading(false)

    if (supabaseError) {
      setError('Opslaan mislukt. Probeer het opnieuw.')
      return
    }

    onSaved({ ...show, ...updates })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Show bewerken</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-show-name">Show naam *</Label>
              <Input
                id="edit-show-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bedrijfsevenement 2026"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-show-date">Datum</Label>
                <Input
                  id="edit-show-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-show-venue">Locatie</Label>
                <Input
                  id="edit-show-venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Stadsschouwburg Amsterdam"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-show-client">
                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Opdrachtgever</span>
              </Label>
              <Input
                id="edit-show-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Bedrijfsnaam of klant"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-show-description">Omschrijving</Label>
              <Textarea
                id="edit-show-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Korte omschrijving van het evenement..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</>
                : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
