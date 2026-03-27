'use client'

import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Clock, Radio, ExternalLink, CheckCircle, AlertCircle, Lock, Copy, Check } from 'lucide-react'
import type { Rundown } from '@/lib/types/database'

interface RundownSettingsProps {
  open: boolean
  onClose: () => void
  rundown: Rundown
  show: { id: string; name: string }
  onSave: (updates: {
    show_start_time: string | null
    companion_webhook_url: string | null
    presenter_pin: string | null
  }) => Promise<void>
}

export function RundownSettings({ open, onClose, rundown, show, onSave }: RundownSettingsProps) {
  const [startTime, setStartTime]     = useState('')
  const [webhookUrl, setWebhookUrl]   = useState('')
  const [presenterPin, setPresenterPin] = useState('')
  const [loading, setLoading]         = useState(false)
  const [testStatus, setTestStatus]   = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [copied, setCopied]           = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const raw = rundown.show_start_time ?? ''
      setStartTime(raw.length >= 5 ? raw.slice(0, 5) : raw)
      setWebhookUrl(rundown.companion_webhook_url ?? '')
      setPresenterPin(rundown.presenter_pin ?? '')
      setTestStatus('idle')
      setCopied(null)
    }
  }, [open, rundown])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        show_start_time:       startTime ? startTime + ':00' : null,
        companion_webhook_url: webhookUrl.trim() || null,
        presenter_pin:         presenterPin.trim() || null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleTestWebhook() {
    if (!webhookUrl.trim()) return
    setTestStatus('testing')
    try {
      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          source: 'CueBoard',
          rundown: rundown.name,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      })
      setTestStatus('ok')
    } catch {
      setTestStatus('error')
    }
  }

  function copyLink(key: string, url: string) {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const baseUrl   = typeof window !== 'undefined' ? window.location.origin : ''
  const basePath  = `/shows/${show.id}/rundown/${rundown.id}`
  const callerUrl   = `${baseUrl}${basePath}/caller`
  const presenterUrl = `${baseUrl}${basePath}/presenter`
  const crewUrl     = `${baseUrl}${basePath}/crew`
  const printUrl    = `${baseUrl}${basePath}/print`

  function LinkRow({ label, url, linkKey }: { label: string; url: string; linkKey: string }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
        <Input
          readOnly
          value={url}
          className="text-xs font-mono h-7 text-muted-foreground bg-muted/40 flex-1"
        />
        <Button
          type="button" size="icon" variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => copyLink(linkKey, url)}
          title="Kopieer link"
        >
          {copied === linkKey
            ? <Check className="h-3.5 w-3.5 text-green-400" />
            : <Copy className="h-3.5 w-3.5" />
          }
        </Button>
        <Button
          type="button" size="icon" variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => window.open(url, '_blank')}
          title="Openen"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rundown instellingen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 py-2">

          {/* Show starttijd */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Show starttijd</h3>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-time">Geplande aanvangstijd</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono w-36"
              />
              <p className="text-xs text-muted-foreground">
                Wordt gebruikt om verwachte starttijden per cue te berekenen.
              </p>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Companion webhook */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Bitfocus Companion webhook</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => { setWebhookUrl(e.target.value); setTestStatus('idle') }}
                placeholder="http://192.168.1.x:8888/api/custom-variable/..."
              />
              <p className="text-xs text-muted-foreground">
                Bij elke GO wordt een POST gestuurd met cue-data.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={handleTestWebhook}
                  disabled={!webhookUrl.trim() || testStatus === 'testing'}
                  className="gap-2"
                >
                  {testStatus === 'testing'
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testen...</>
                    : <><ExternalLink className="h-3.5 w-3.5" /> Test verbinding</>
                  }
                </Button>
                {testStatus === 'ok' && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle className="h-3.5 w-3.5" /> Verbinding OK
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Geen verbinding
                  </span>
                )}
              </div>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Presenter PIN */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Presenter PIN</h3>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="presenter-pin">4-cijferige PIN (optioneel)</Label>
              <Input
                id="presenter-pin"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{0,4}"
                maxLength={4}
                value={presenterPin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPresenterPin(val)
                }}
                placeholder="1234"
                className="font-mono w-28 tracking-widest text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Bescherm de Presenter View met een PIN-code.
                Laat leeg voor vrije toegang.
              </p>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* View links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">View-links</h3>
            <div className="space-y-2">
              <LinkRow label="Caller" url={callerUrl} linkKey="caller" />
              <LinkRow label="Presenter" url={presenterUrl} linkKey="presenter" />
              <LinkRow label="Crew" url={crewUrl} linkKey="crew" />
              <LinkRow label="Afdrukken" url={printUrl} linkKey="print" />
            </div>
            <p className="text-xs text-muted-foreground">
              Deel de juiste link met je team. Geen inlog vereist voor Presenter en Crew view.
            </p>
          </div>

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuleren
          </Button>
          <Button onClick={handleSave as unknown as React.MouseEventHandler} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</> : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
