'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Clock, Radio, ExternalLink, CheckCircle, AlertCircle, Lock, Copy, Check, Trash2, AlertTriangle, CopyPlus, FileText, History, RotateCcw, Monitor, Upload, X, Image, ChevronDown, ChevronRight as ChevronRightIcon, Info, Download } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import type { Rundown, RundownSnapshot, Cue } from '@/lib/types/database'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface RundownSettingsProps {
  open: boolean
  onClose: () => void
  rundown: Rundown
  show: { id: string; name: string }
  supabase: AnySupabase
  onSave: (updates: {
    name: string
    show_start_time: string | null
    companion_webhook_url: string | null
    presenter_pin: string | null
    notes: string | null
    stage_names?: string | null
  }) => Promise<void>
  onDelete?: () => Promise<void>
  onDuplicate?: () => Promise<void>
  onRestore?: (cues: Cue[]) => Promise<void>
  onRundownUpdated?: (rundown: Rundown) => void
}

export function RundownSettings({ open, onClose, rundown, show, supabase, onSave, onDelete, onDuplicate, onRestore, onRundownUpdated }: RundownSettingsProps) {
  const [rundownName, setRundownName] = useState('')
  const [startTime, setStartTime]     = useState('')
  const [webhookUrl, setWebhookUrl]   = useState('')
  const [companionMode, setCompanionMode] = useState<'variable' | 'custom'>('variable')
  const [companionIp, setCompanionIp]     = useState('')
  const [companionVar, setCompanionVar]   = useState('cueboard_cue')
  const [presenterPin, setPresenterPin] = useState('')
  const [notes, setNotes]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [testStatus, setTestStatus]   = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [copied, setCopied]           = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [snapshots, setSnapshots]     = useState<RundownSnapshot[]>([])
  const [loadingSnaps, setLoadingSnaps] = useState(false)
  const [restoring, setRestoring]     = useState<string | null>(null)
  const [deletingSnap, setDeletingSnap] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<RundownSnapshot | null>(null)

  // Slide deck state
  const [slideUrl, setSlideUrl]           = useState<string | null>(null)
  const [slidePath, setSlidePath]         = useState<string | null>(null)
  const [slideFilename, setSlideFilename] = useState<string | null>(null)
  const [slideFile, setSlideFile]         = useState<File | null>(null)
  const [uploadingSlide, setUploadingSlide] = useState(false)
  const [slideError, setSlideError]       = useState<string | null>(null)
  const slideInputRef = useRef<HTMLInputElement>(null)

  // Still image state
  const [stillUrl, setStillUrl]           = useState<string | null>(null)
  const [stillPath, setStillPath]         = useState<string | null>(null)
  const [stillFilename, setStillFilename] = useState<string | null>(null)
  const [uploadingStill, setUploadingStill] = useState(false)
  const [stillError, setStillError]       = useState<string | null>(null)
  const stillInputRef = useRef<HTMLInputElement>(null)
  const [showCompanionGuide, setShowCompanionGuide] = useState(false)
  const [showPayloadPreview, setShowPayloadPreview] = useState(false)

  // Companion activeren
  const [companionHost, setCompanionHost]         = useState('')
  const [activating, setActivating]               = useState(false)
  const [activateStatus, setActivateStatus]       = useState<'idle' | 'ok' | 'error'>('idle')

  // Stage-namen state
  const [stageNames, setStageNames]         = useState<string[]>([])
  const [newStageName, setNewStageName]     = useState('')

  useEffect(() => {
    if (open) {
      setRundownName(rundown.name)
      const raw = rundown.show_start_time ?? ''
      setStartTime(raw.length >= 5 ? raw.slice(0, 5) : raw)
      // Onthoud Companion host tussen sessies
      const savedHost = typeof window !== 'undefined' ? (localStorage.getItem('companion_host') ?? '') : ''
      setCompanionHost(savedHost)
      setActivateStatus('idle')
      // Companion: detecteer modus op basis van opgeslagen URL
      const savedUrl = rundown.companion_webhook_url ?? ''
      setWebhookUrl(savedUrl)
      if (savedUrl.includes('/api/custom-variable/')) {
        setCompanionMode('variable')
        // Extraheer IP en variabelenaam uit URL
        try {
          const u = new URL(savedUrl)
          setCompanionIp(u.hostname + (u.port ? ':' + u.port : ':8888'))
          const parts = u.pathname.split('/')
          const varIdx = parts.indexOf('custom-variable')
          setCompanionVar(varIdx >= 0 && parts[varIdx + 1] ? parts[varIdx + 1] : 'cueboard_cue')
        } catch { /* laat defaults */ }
      } else if (savedUrl) {
        setCompanionMode('custom')
      } else {
        setCompanionMode('variable')
        setCompanionIp('')
        setCompanionVar('cueboard_cue')
      }
      setPresenterPin(rundown.presenter_pin ?? '')
      setNotes(rundown.notes ?? '')
      // Stage-namen laden (komma-gescheiden opgeslagen)
      setStageNames(
        rundown.stage_names
          ? rundown.stage_names.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []
      )
      setNewStageName('')
      setSlideUrl(rundown.slide_url ?? null)
      setSlidePath(rundown.slide_path ?? null)
      setSlideFilename(rundown.slide_filename ?? null)
      setSlideFile(null)
      setSlideError(null)
      setStillUrl(rundown.still_url ?? null)
      setStillPath(rundown.still_path ?? null)
      setStillFilename(null)
      setStillError(null)
      setTestStatus('idle')
      setCopied(null)
      setShowDeleteConfirm(false)
      setRestoreConfirm(null)
      // Load snapshots
      setLoadingSnaps(true)
      supabase
        .from('rundown_snapshots')
        .select('*')
        .eq('rundown_id', rundown.id)
        .order('created_at', { ascending: false })
        .limit(20)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data }: { data: any }) => {
          setSnapshots((data ?? []) as RundownSnapshot[])
          setLoadingSnaps(false)
        })
    }
  }, [open, rundown, supabase])

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!rundownName.trim()) return
    setLoading(true)
    try {
      // Sla alleen een webhook URL op als de gebruiker er een heeft ingevuld (geavanceerd)
      const finalWebhookUrl = webhookUrl.trim() || null

      await onSave({
        name:                  rundownName.trim(),
        show_start_time:       startTime ? startTime + ':00' : null,
        companion_webhook_url: finalWebhookUrl,
        presenter_pin:         presenterPin.trim() || null,
        notes:                 notes.trim() || null,
        stage_names:           stageNames.length > 0 ? stageNames.join(', ') : null,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  // Activeer de huidige show in Companion door sc_rundown_id bij te werken
  async function activateInCompanion() {
    const host = companionHost.trim()
    if (!host) return
    const fullHost = host.includes(':') ? host : host + ':8000'
    // Sla host op voor volgende keer
    if (typeof window !== 'undefined') localStorage.setItem('companion_host', companionHost.trim())
    setActivating(true)
    setActivateStatus('idle')
    try {
      // Direct browser → Companion (zelfde netwerk, geen server relay nodig)
      const res = await fetch(`http://${fullHost}/api/custom-variable/sc_rundown_id/value`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: rundown.id }),
      })
      setActivateStatus(res.ok ? 'ok' : 'error')
    } catch {
      setActivateStatus('error')
    } finally {
      setActivating(false)
    }
  }

  function getTestUrl(): string | null {
    if (companionMode === 'variable' && companionIp.trim()) {
      const ip = companionIp.trim().includes(':') ? companionIp.trim() : companionIp.trim() + ':8888'
      const varName = companionVar.trim() || 'cueboard_cue'
      return `http://${ip}/api/custom-variable/${varName}/value`
    }
    if (companionMode === 'custom' && webhookUrl.trim()) return webhookUrl.trim()
    return null
  }

  async function handleTestWebhook() {
    const url = getTestUrl()
    if (!url) return
    setTestStatus('testing')
    const isCompanionVar = url.includes('/api/custom-variable/')
    const payload = isCompanionVar
      ? { value: 'TEST — CueBoard verbinding OK' }
      : { event: 'test', source: 'CueBoard', rundown: rundown.name, timestamp: new Date().toISOString() }
    try {
      // Gebruik server-side proxy om mixed-content (HTTPS→HTTP) te omzeilen
      const res = await fetch('/api/companion/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, payload }),
        signal: AbortSignal.timeout(8000),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setTestStatus('ok')
      } else {
        setTestStatus('error')
      }
    } catch {
      setTestStatus('error')
    }
  }

  async function handleRestoreSnapshot(snap: RundownSnapshot) {
    if (!onRestore) return
    setRestoring(snap.id)
    try {
      await onRestore(snap.cues_json as unknown as Cue[])
      setRestoreConfirm(null)
      onClose()
    } finally {
      setRestoring(null)
    }
  }

  async function handleDeleteSnapshot(snapId: string) {
    setDeletingSnap(snapId)
    await supabase.from('rundown_snapshots').delete().eq('id', snapId)
    setSnapshots(prev => prev.filter(s => s.id !== snapId))
    setDeletingSnap(null)
  }

  function copyLink(key: string, url: string) {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Slide deck upload ───────────────────────────────────────────────────
  async function handleSlideUpload(file: File) {
    setSlideFile(file)
    setSlideError(null)
    setUploadingSlide(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('rundownId', rundown.id)
      const res  = await fetch('/api/upload-rundown-slide', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload mislukt')
      // Direct in DB opslaan
      const { data: updated, error } = await supabase
        .from('rundowns')
        .update({ slide_url: data.url, slide_path: data.path, slide_filename: data.filename, slide_type: data.type ?? 'pdf' })
        .eq('id', rundown.id)
        .select()
        .single()
      if (error) throw error
      setSlideUrl(data.url)
      setSlidePath(data.path)
      setSlideFilename(data.filename)
      if (updated) onRundownUpdated?.(updated as Rundown)
    } catch (err: unknown) {
      setSlideError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setUploadingSlide(false)
      setSlideFile(null)
    }
  }

  async function handleSlideRemove() {
    if (slidePath) {
      await fetch('/api/upload-rundown-slide', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: slidePath }),
      }).catch(() => {})
    }
    const { data: updated } = await supabase
      .from('rundowns')
      .update({ slide_url: null, slide_path: null, slide_filename: null, slide_type: null })
      .eq('id', rundown.id)
      .select()
      .single()
    setSlideUrl(null)
    setSlidePath(null)
    setSlideFilename(null)
    if (updated) onRundownUpdated?.(updated as Rundown)
  }

  // ── Still image upload ──────────────────────────────────────────────────
  async function handleStillUpload(file: File) {
    setStillFilename(file.name)
    setStillError(null)
    setUploadingStill(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('rundownId', rundown.id)
      const res  = await fetch('/api/upload-rundown-still', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload mislukt')
      const { data: updated, error } = await supabase
        .from('rundowns')
        .update({ still_url: data.url, still_path: data.path })
        .eq('id', rundown.id)
        .select()
        .single()
      if (error) throw error
      setStillUrl(data.url)
      setStillPath(data.path)
      setStillFilename(file.name)
      if (updated) onRundownUpdated?.(updated as Rundown)
    } catch (err: unknown) {
      setStillError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setUploadingStill(false)
    }
  }

  async function handleStillRemove() {
    if (stillPath) {
      await fetch('/api/upload-rundown-still', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: stillPath }),
      }).catch(() => {})
    }
    const { data: updated } = await supabase
      .from('rundowns')
      .update({ still_url: null, still_path: null })
      .eq('id', rundown.id)
      .select()
      .single()
    setStillUrl(null)
    setStillPath(null)
    setStillFilename(null)
    if (updated) onRundownUpdated?.(updated as Rundown)
  }

  const baseUrl   = typeof window !== 'undefined' ? window.location.origin : ''
  const basePath  = `/shows/${show.id}/rundown/${rundown.id}`
  const callerUrl   = `${baseUrl}${basePath}/caller`
  const presenterUrl = `${baseUrl}${basePath}/presenter`
  const crewUrl     = `${baseUrl}${basePath}/crew`
  const printUrl    = `${baseUrl}${basePath}/print`
  const outputUrl   = `${baseUrl}${basePath}/output`

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
    <>
    {/* File inputs live OUTSIDE the Dialog so Radix's focus-trap never interferes
        with the native OS file picker. The <label htmlFor> inside the dialog
        still activates them because they share the same document. */}
    <input
      ref={slideInputRef}
      id="slide-upload-input"
      type="file"
      accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.ms-powerpoint,.ppt"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) handleSlideUpload(f)
        e.target.value = ''
      }}
    />
    <input
      ref={stillInputRef}
      id="still-upload-input"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) handleStillUpload(f)
        e.target.value = ''
      }}
    />
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rundown instellingen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 py-2">

          {/* Rundown naam */}
          <div className="space-y-1.5">
            <Label htmlFor="rundown-name">Rundown naam</Label>
            <Input
              id="rundown-name"
              value={rundownName}
              onChange={(e) => setRundownName(e.target.value)}
              placeholder="Hoofdrundown"
              required
            />
          </div>

          {/* Rundown notities */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="rundown-notes">Rundown notities</Label>
            </div>
            <Textarea
              id="rundown-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algemene info voor de show (zichtbaar in caller & crew view)..."
              rows={2}
            />
          </div>

          <hr className="border-border/50" />

          {/* ── Podia / Locaties ─────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Podia / Locaties</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Voeg je podia of locaties toe. Deze verschijnen als keuzelijst in het cue-formulier zodat je sneller cues kunt invullen.
            </p>

            {/* Bestaande stages */}
            {stageNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stageNames.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/50 rounded-full px-3 py-1"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => setStageNames((prev) => prev.filter((n) => n !== name))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Nieuwe stage toevoegen */}
            <div className="flex gap-2">
              <Input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const trimmed = newStageName.trim()
                    if (trimmed && !stageNames.includes(trimmed)) {
                      setStageNames((prev) => [...prev, trimmed])
                    }
                    setNewStageName('')
                  }
                }}
                placeholder="Bijv. Hoofdpodium, Foyer, Zaal B…"
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const trimmed = newStageName.trim()
                  if (trimmed && !stageNames.includes(trimmed)) {
                    setStageNames((prev) => [...prev, trimmed])
                  }
                  setNewStageName('')
                }}
                disabled={!newStageName.trim()}
              >
                Toevoegen
              </Button>
            </div>
          </div>

          <hr className="border-border/50" />

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

          {/* Companion koppeling */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Bitfocus Companion</h3>
            </div>

            {/* Eenmalige setup — download configs */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-3 space-y-2.5">
              <p className="text-xs font-medium text-foreground/90">Stap 1 — Eenmalige setup (één keer importeren)</p>
              <p className="text-xs text-muted-foreground">
                Download beide bestanden en importeer ze in Companion via Settings → Import / Export. Daarna hoef je dit nooit meer te doen.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => {
                    const url = `${baseUrl}/api/companion/download?rundownId=${rundown.id}&mode=page`
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'CueBoard pagina.companionconfig'
                    a.click()
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Knoppen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-1"
                  onClick={() => {
                    const url = `${baseUrl}/api/companion/download?rundownId=${rundown.id}&mode=triggers`
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'CueBoard triggers.companionconfig'
                    a.click()
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Triggers
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Beide configs zijn universeel — ze werken voor elke show. Je hoeft ze maar één keer te importeren.
              </p>
            </div>

            {/* Show activeren in Companion */}
            <div className="rounded-lg bg-green-500/5 border border-green-500/20 px-3 py-3 space-y-2.5">
              <p className="text-xs font-medium text-foreground/90">Stap 2 — Activeer deze show in Companion</p>
              <p className="text-xs text-muted-foreground">
                Geef het IP-adres van je Companion/Raspberry Pi op. CueBoard stuurt de show-ID direct naar Companion — geen nieuwe import nodig.
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  value={companionHost}
                  onChange={e => { setCompanionHost(e.target.value); setActivateStatus('idle') }}
                  placeholder="192.168.1.100  of  192.168.1.100:8000"
                  className="text-xs h-8 flex-1 font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  disabled={!companionHost.trim() || activating}
                  onClick={activateInCompanion}
                >
                  {activating
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : activateStatus === 'ok'
                      ? <CheckCircle className="h-3.5 w-3.5" />
                      : activateStatus === 'error'
                        ? <AlertCircle className="h-3.5 w-3.5" />
                        : <Radio className="h-3.5 w-3.5" />
                  }
                  {activateStatus === 'ok' ? 'Geactiveerd!' : activateStatus === 'error' ? 'Mislukt' : 'Activeer'}
                </Button>
              </div>
              {activateStatus === 'error' && (
                <p className="text-[10px] text-red-400">
                  Kan Companion niet bereiken. Controleer het IP-adres en zorg dat Companion bereikbaar is op poort 8000.
                </p>
              )}
              {activateStatus === 'ok' && (
                <p className="text-[10px] text-green-400">
                  Show <span className="font-semibold">{rundown.name}</span> is nu actief in Companion. GO / BACK / SKIP werken direct.
                </p>
              )}
            </div>

            {/* Poll-URL voor handmatige setup */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Poll-URL (handmatig instellen)</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${baseUrl}/api/companion/cue?rundownId=${rundown.id}`}
                  className="text-[11px] font-mono h-7 text-muted-foreground bg-muted/40 flex-1"
                />
                <Button
                  type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0"
                  onClick={() => copyLink('companion-poll', `${baseUrl}/api/companion/cue?rundownId=${rundown.id}`)}
                  title="Kopieer URL"
                >
                  {copied === 'companion-poll'
                    ? <Check className="h-3.5 w-3.5 text-green-400" />
                    : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60">Voeg <span className="font-mono">?field=next</span> toe voor de volgende cue</p>
            </div>

            {/* Geavanceerd: eigen webhook (optioneel) */}
            <div>
              <button
                type="button"
                onClick={() => setShowCompanionGuide(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCompanionGuide ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                Geavanceerd: eigen webhook (internet-bereikbaar)
              </button>
              {showCompanionGuide && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Vul een publiek bereikbare HTTPS-webhook URL in. CueBoard POST de cuenaam als <span className="font-mono">&#123;"event":"cue_started","cue":&#123;...&#125;&#125;</span> bij elke GO.
                  </p>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); setCompanionMode('custom'); setTestStatus('idle') }}
                    placeholder="https://mijn-server.nl/webhook/..."
                    className="font-mono text-xs"
                  />
                  {webhookUrl.trim() && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={handleTestWebhook}
                        disabled={testStatus === 'testing'}
                        className="gap-2"
                      >
                        {testStatus === 'testing'
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testen...</>
                          : <><ExternalLink className="h-3.5 w-3.5" /> Test webhook</>
                        }
                      </Button>
                      {testStatus === 'ok' && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="h-3.5 w-3.5" /> OK</span>}
                      {testStatus === 'error' && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" /> Geen verbinding</span>}
                    </div>
                  )}
                </div>
              )}
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

          {/* Slide deck voor stage output */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Standaard slide deck (show-breed)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Deze presentatie geldt voor de hele show en wordt getoond als er geen cue-specifieke presentatie actief is.
              Wil je <strong className="text-foreground/70">per spreker/cue een eigen presentatie</strong>?
              Bewerk dan de cue (klik op het potlood-icoon) en upload daar een presentatie onder het tabblad&nbsp;
              <span className="font-medium text-foreground/70">Media & Slides</span>.
            </p>
            {slideUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-emerald-500/5 px-3 py-2">
                <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-emerald-300 truncate flex-1">{slideFilename ?? 'presentatie.pdf'}</span>
                <Button
                  type="button" size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={handleSlideRemove}
                  title="Verwijderen"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="slide-upload-input"
                className="rounded-lg border border-dashed border-white/15 bg-white/2 p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors block"
              >
                {uploadingSlide ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploaden...
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Klik om PDF of PPTX te uploaden</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">PDF of PowerPoint · Max 100 MB</p>
                  </>
                )}
              </label>
            )}
            {slideError && (
              <p className="text-xs text-destructive">{slideError}</p>
            )}
          </div>

          <hr className="border-border/50" />

          {/* Still image voor output scherm */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Still image (inloop / pauze)</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Vaste afbeelding voor het output-scherm — zichtbaar als er géén actieve cue of presentatie loopt.
              Ideaal voor inloop, pauze, of als wachtscherm met logo of sponsor. Voorkomt een zwart beeld.
            </p>
            {stillUrl ? (
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-blue-500/5 px-3 py-2">
                <Image className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-sm text-blue-300 truncate flex-1">
                  {stillFilename ?? 'still.png'}
                </span>
                <Button
                  type="button" size="sm" variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={handleStillRemove}
                  title="Verwijderen"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="still-upload-input"
                className="rounded-lg border border-dashed border-white/15 bg-white/2 p-4 text-center cursor-pointer hover:border-blue-400/40 hover:bg-blue-500/5 transition-colors block"
              >
                {uploadingStill ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploaden...
                  </div>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Klik om afbeelding te uploaden</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">PNG, JPG of WebP · Max 20 MB</p>
                  </>
                )}
              </label>
            )}
            {stillError && (
              <p className="text-xs text-destructive">{stillError}</p>
            )}
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
              <LinkRow label="🖥️ Output" url={outputUrl} linkKey="output" />
            </div>
            <p className="text-xs text-muted-foreground">
              Deel de juiste link met je team. Geen inlog vereist voor Presenter en Crew view.
            </p>
          </div>

          {/* Rundown dupliceren */}
          {onDuplicate && (
            <>
              <hr className="border-border/50" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CopyPlus className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Rundown dupliceren</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Maak een kopie van deze rundown met alle cues. Handig als je een vergelijkbare show hebt.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setDuplicating(true)
                    await onDuplicate()
                    setDuplicating(false)
                    onClose()
                  }}
                  disabled={duplicating}
                  className="gap-2"
                >
                  {duplicating
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Kopiëren…</>
                    : <><CopyPlus className="h-3.5 w-3.5" /> Dupliceer rundown</>
                  }
                </Button>
              </div>
            </>
          )}

          {/* Versiegeschiedenis / snapshots */}
          <>
            <hr className="border-border/50" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Versiegeschiedenis</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Sla tussentijdse versies op via het camera-icoon in de toolbar. Je kunt hier elke versie terugzetten.
              </p>
              {loadingSnaps ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Laden...
                </div>
              ) : snapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">Nog geen snapshots opgeslagen.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {snapshots.map((snap) => (
                    <div key={snap.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{snap.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(snap.created_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                      {restoreConfirm?.id === snap.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-orange-400">Zeker?</span>
                          <Button
                            type="button" size="sm" variant="outline"
                            className="h-6 px-2 text-xs border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                            disabled={restoring === snap.id}
                            onClick={() => handleRestoreSnapshot(snap)}
                          >
                            {restoring === snap.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><RotateCcw className="h-3 w-3" /> Ja</>
                            }
                          </Button>
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => setRestoreConfirm(null)}
                          >
                            Nee
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                            title="Terugzetten naar deze versie"
                            onClick={() => setRestoreConfirm(snap)}
                            disabled={!onRestore}
                          >
                            <RotateCcw className="h-3 w-3" /> Zetten
                          </Button>
                          <Button
                            type="button" size="icon" variant="ghost"
                            className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
                            title="Snapshot verwijderen"
                            disabled={deletingSnap === snap.id}
                            onClick={() => handleDeleteSnapshot(snap.id)}
                          >
                            {deletingSnap === snap.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Trash2 className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>

          {/* Rundown verwijderen */}
          {onDelete && (
            <>
              <hr className="border-border/50" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-destructive">Gevaarlijke zone</h3>
                </div>
                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Rundown verwijderen
                  </Button>
                ) : (
                  <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-3">
                    <p className="text-sm text-destructive">
                      Weet je zeker dat je <strong>&ldquo;{rundown.name}&rdquo;</strong> wilt verwijderen?
                      Alle cues worden ook verwijderd en dit kan niet ongedaan worden gemaakt.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                      >
                        Annuleren
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verwijderen...</>
                          : 'Ja, verwijder rundown'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuleren
          </Button>
          <Button onClick={handleSave as unknown as React.MouseEventHandler} disabled={loading || !rundownName.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</> : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
