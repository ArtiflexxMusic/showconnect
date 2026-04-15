'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, ChevronDown, ChevronUp, Upload, X, Music, Video, Volume2, Play, Square, Presentation, Trash2 } from 'lucide-react'
import { parseDuration, formatDuration } from '@/lib/utils'
import type { CreateCueInput, Cue, CueType } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

const CUE_TYPES: { value: CueType; label: string; emoji: string }[] = [
  { value: 'intro',    label: 'Intro',    emoji: '🎬' },
  { value: 'video',    label: 'Video',    emoji: '📹' },
  { value: 'audio',    label: 'Audio',    emoji: '🎵' },
  { value: 'lighting', label: 'Licht',    emoji: '💡' },
  { value: 'speech',   label: 'Spreker',  emoji: '🎤' },
  { value: 'break',        label: 'Pauze',       emoji: '☕' },
  { value: 'outro',        label: 'Outro',       emoji: '🏁' },
  { value: 'presentation', label: 'Presentatie', emoji: '📊' },
  { value: 'custom',       label: 'Overig',      emoji: '⚙️' },
]

const MEDIA_TYPES: CueType[] = ['audio', 'video', 'intro', 'outro']

interface CueFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (input: CreateCueInput) => void | Promise<void>
  initialValues?: Partial<Cue>
  loading?: boolean
  mode?: 'add' | 'edit'
  // Voor media-upload
  supabase?: ReturnType<typeof createClient>
  rundownId?: string
  /** Externe foutmelding vanuit de parent (bijv. DB-fout) */
  saveError?: string | null
  /** Beschikbare podia/locaties voor de datalist (uit RundownSettings) */
  stageNames?: string[]
}

export function CueFormModal({
  open, onClose, onSave, initialValues, loading = false, mode = 'add',
  supabase, rundownId, saveError, stageNames = [],
}: CueFormModalProps) {
  const [title, setTitle]           = useState('')
  const [type, setType]             = useState<CueType>('custom')
  const [secondaryTypes, setSecondaryTypes] = useState<CueType[]>([])
  const [durationStr, setDurationStr] = useState('0:00')
  const [notes, setNotes]           = useState('')
  const [techNotes, setTechNotes]   = useState('')
  const [presenter, setPresenter]   = useState('')
  const [location, setLocation]     = useState('')
  const [showExtra, setShowExtra]   = useState(false)
  const [color, setColor]           = useState<string | null>(null)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [slideIndex, setSlideIndex]   = useState<string>('')  // '' = geen koppeling

  // Presentatie state
  const [presentationFile, setPresentationFile]   = useState<File | null>(null)
  const [presentationUrl, setPresentationUrl]     = useState<string | null>(null)
  const [presentationPath, setPresentationPath]   = useState<string | null>(null)
  const [presentationFilename, setPresentationFilename] = useState<string | null>(null)
  const [presentationType, setPresentationType]   = useState<'pdf' | 'pptx' | null>(null)
  const [slideControlMode, setSlideControlMode]   = useState<'caller' | 'presenter' | 'both'>('caller')
  const [uploadingPresentation, setUploadingPresentation] = useState(false)
  const [presentationError, setPresentationError] = useState<string | null>(null)
  const presentationInputRef = useRef<HTMLInputElement>(null)

  // Media state
  const [mediaFile, setMediaFile]       = useState<File | null>(null)
  const [mediaUrl, setMediaUrl]         = useState<string | null>(null)
  const [mediaPath, setMediaPath]       = useState<string | null>(null)
  const [mediaFilename, setMediaFilename] = useState<string | null>(null)
  const [mediaSize, setMediaSize]       = useState<number | null>(null)
  const [mediaType, setMediaType]       = useState<string | null>(null)
  const [mediaVolume, setMediaVolume]   = useState(1.0)
  const [mediaLoop, setMediaLoop]       = useState(false)
  const [mediaAutoplay, setMediaAutoplay] = useState(true)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [previewing, setPreviewing]     = useState(false)
  const previewRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportsMedia = MEDIA_TYPES.includes(type)

  useEffect(() => {
    if (!open) {
      // Stop preview bij sluiten
      if (previewRef.current) {
        previewRef.current.pause()
        previewRef.current.src = ''
        previewRef.current = null
        setPreviewing(false)
      }
    }
    if (open) {
      if (initialValues) {
        setTitle(initialValues.title ?? '')
        setType(initialValues.type ?? 'custom')
        setSecondaryTypes(initialValues.secondary_types ?? [])
        setDurationStr(formatDuration(initialValues.duration_seconds ?? 0))
        setNotes(initialValues.notes ?? '')
        setTechNotes(initialValues.tech_notes ?? '')
        setPresenter(initialValues.presenter ?? '')
        setLocation(initialValues.location ?? '')
        setShowExtra(
          !!(initialValues.tech_notes || initialValues.presenter || initialValues.location)
        )
        setColor(initialValues.color ?? null)
        setAutoAdvance(initialValues.auto_advance ?? false)
        setSlideIndex(initialValues.slide_index != null ? String(initialValues.slide_index + 1) : '')
        // Presentatie uit bestaande cue
        setPresentationUrl(initialValues.presentation_url ?? null)
        setPresentationPath(initialValues.presentation_path ?? null)
        setPresentationFilename(initialValues.presentation_filename ?? null)
        setPresentationType(initialValues.presentation_type ?? null)
        setSlideControlMode(initialValues.slide_control_mode ?? 'caller')
        setPresentationFile(null)
        // Media uit bestaande cue
        setMediaUrl(initialValues.media_url ?? null)
        setMediaPath(initialValues.media_path ?? null)
        setMediaFilename(initialValues.media_filename ?? null)
        setMediaSize(initialValues.media_size ?? null)
        setMediaType(initialValues.media_type ?? null)
        setMediaVolume(initialValues.media_volume ?? 1.0)
        setMediaLoop(initialValues.media_loop ?? false)
        setMediaAutoplay(initialValues.media_autoplay ?? true)
      } else {
        setTitle('')
        setType('custom')
        setSecondaryTypes([])
        setDurationStr('0:00')
        setNotes('')
        setTechNotes('')
        setPresenter('')
        setLocation('')
        setShowExtra(false)
        setColor(null)
        setAutoAdvance(false)
        setSlideIndex('')
        setMediaFile(null)
        setMediaUrl(null)
        setMediaPath(null)
        setMediaFilename(null)
        setMediaSize(null)
        setMediaType(null)
        setMediaVolume(1.0)
        setMediaLoop(false)
        setMediaAutoplay(true)
        setPresentationFile(null)
        setPresentationUrl(null)
        setPresentationPath(null)
        setPresentationFilename(null)
        setPresentationType(null)
        setSlideControlMode('caller')
      }
      setUploadError(null)
      setPresentationError(null)
    }
  }, [initialValues, open])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaFilename(file.name)
    setMediaSize(file.size)
    setMediaType(file.type)
    setUploadError(null)

    // Auto-detecteer duur van het mediabestand
    const url = URL.createObjectURL(file)
    const el = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio')
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      if (isFinite(el.duration) && el.duration > 0) {
        setDurationStr(formatDuration(Math.round(el.duration)))
      }
      URL.revokeObjectURL(url)
    }
    el.onerror = () => URL.revokeObjectURL(url)
    el.src = url
  }

  function removeMedia() {
    if (previewRef.current) {
      previewRef.current.pause()
      previewRef.current.src = ''
      previewRef.current = null
      setPreviewing(false)
    }
    setMediaFile(null)
    setMediaUrl(null)
    setMediaPath(null)
    setMediaFilename(null)
    setMediaSize(null)
    setMediaType(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function togglePreview() {
    // Preview het geselecteerde bestand of bestaande URL
    const src = mediaFile ? URL.createObjectURL(mediaFile) : mediaUrl
    if (!src) return

    if (previewing && previewRef.current) {
      previewRef.current.pause()
      previewRef.current.src = ''
      previewRef.current = null
      setPreviewing(false)
      return
    }

    const isVideo = mediaType?.startsWith('video/')
    const el = isVideo ? document.createElement('video') : document.createElement('audio')
    el.src = src
    el.volume = mediaVolume
    el.onended = () => { setPreviewing(false); previewRef.current = null }
    el.onpause = () => { setPreviewing(false); previewRef.current = null }
    previewRef.current = el as HTMLAudioElement
    setPreviewing(true)
    el.play().catch(() => setPreviewing(false))
  }

  async function uploadMedia(): Promise<{ url: string; path: string } | null> {
    if (!mediaFile || !supabase || !rundownId) return null
    setUploading(true)
    setUploadError(null)
    try {
      const ext = mediaFile.name.split('.').pop()
      const path = `${rundownId}/${Date.now()}_${mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { data, error } = await supabase.storage
        .from('cue-media')
        .upload(path, mediaFile, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage
        .from('cue-media')
        .getPublicUrl(data.path)
      return { url: publicUrl, path: data.path }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload mislukt')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function uploadPresentation(cueId: string): Promise<{ url: string; path: string; type: 'pdf' | 'pptx'; filename: string } | null> {
    if (!presentationFile) return null
    setUploadingPresentation(true)
    setPresentationError(null)
    try {
      const form = new FormData()
      form.append('file', presentationFile)
      form.append('cueId', cueId)
      const res  = await fetch('/api/upload-presentation', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload mislukt')
      return { url: data.url, path: data.path, type: data.type, filename: data.filename }
    } catch (err: unknown) {
      setPresentationError(err instanceof Error ? err.message : 'Upload mislukt')
      return null
    } finally {
      setUploadingPresentation(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    let finalMediaUrl = mediaUrl
    let finalMediaPath = mediaPath

    // Upload nieuw mediabestand als dat geselecteerd is
    if (mediaFile && supabase && rundownId) {
      const result = await uploadMedia()
      if (!result) return
      finalMediaUrl = result.url
      finalMediaPath = result.path
    }

    // Presentatie upload (cueId is nog niet bekend bij nieuwe cue, gebruik tijdstempel als placeholder)
    let finalPresentationUrl  = presentationUrl
    let finalPresentationPath = presentationPath
    let finalPresentationType = presentationType
    let finalPresentationFilename = presentationFilename

    if (presentationFile) {
      const tempId = initialValues?.id ?? crypto.randomUUID()
      const result = await uploadPresentation(tempId)
      if (!result) return
      finalPresentationUrl      = result.url
      finalPresentationPath     = result.path
      finalPresentationType     = result.type
      finalPresentationFilename = result.filename
    }

    onSave({
      title:            title.trim(),
      type,
      secondary_types:  secondaryTypes,
      duration_seconds: parseDuration(durationStr),
      notes:            notes.trim() || null,
      tech_notes:       techNotes.trim() || null,
      presenter:        presenter.trim() || null,
      location:         location.trim() || null,
      media_url:        finalMediaUrl,
      media_path:       finalMediaPath,
      media_type:       mediaType,
      media_filename:   mediaFilename,
      media_size:       mediaSize,
      media_volume:     mediaVolume,
      media_loop:       mediaLoop,
      media_autoplay:   mediaAutoplay,
      color:            color,
      auto_advance:     autoAdvance,
      presentation_url:      finalPresentationUrl,
      presentation_path:     finalPresentationPath,
      presentation_type:     finalPresentationType,
      presentation_filename: finalPresentationFilename,
      slide_control_mode:    slideControlMode,
      current_slide_index:   0,
      slide_index:           slideIndex.trim() !== '' ? (parseInt(slideIndex, 10) - 1) : null,
    })
  }

  function handleDurationBlur() {
    setDurationStr(formatDuration(parseDuration(durationStr)))
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isSubmitting = loading || uploading || uploadingPresentation

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Cue toevoegen' : 'Cue bewerken'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">

            {/* Titel */}
            <div className="space-y-2">
              <Label htmlFor="cue-title">Titel *</Label>
              <Input
                id="cue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Opening intro video"
                required
                autoFocus
              />
            </div>

            {/* Type + Duur */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => {
                  const next = v as CueType
                  setType(next)
                  // Als het nieuwe primair-type in de tags stond, haal hem eruit
                  setSecondaryTypes(prev => prev.filter(t => t !== next))
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="mr-1.5">{t.emoji}</span>{t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cue-duration">Duur (M:SS)</Label>
                <Input
                  id="cue-duration"
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  onBlur={handleDurationBlur}
                  placeholder="5:00"
                  className="font-mono"
                />
              </div>
            </div>

            {/* Extra types (tags naast primair) */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Extra types <span className="text-muted-foreground/60">(optioneel — tags naast primaire type)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {CUE_TYPES.filter(t => t.value !== type).map((t) => {
                  const active = secondaryTypes.includes(t.value)
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setSecondaryTypes(prev => active
                        ? prev.filter(x => x !== t.value)
                        : [...prev, t.value]
                      )}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                        active
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                          : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    >
                      <span>{t.emoji}</span>{t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Media sectie (audio/video types) ── */}
            {supportsMedia && (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center gap-2">
                  {type === 'audio' ? (
                    <Music className="h-4 w-4 text-primary" />
                  ) : (
                    <Video className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium">Media bestand</span>
                  {!supabase && (
                    <span className="text-xs text-muted-foreground ml-auto">(upload beschikbaar na opslaan)</span>
                  )}
                </div>

                {/* Bestand selecteren / huidig bestand tonen */}
                {mediaFilename ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mediaFilename}</p>
                      {mediaSize && (
                        <p className="text-xs text-muted-foreground">{formatBytes(mediaSize)}</p>
                      )}
                    </div>
                    {/* Preview knop */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 shrink-0 ${previewing ? 'text-blue-400' : 'text-muted-foreground hover:text-blue-400'}`}
                      onClick={togglePreview}
                      title={previewing ? 'Stop preview' : 'Preview afspelen'}
                    >
                      {previewing
                        ? <Square className="h-3.5 w-3.5" />
                        : <Play className="h-3.5 w-3.5" />
                      }
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={removeMedia}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={type === 'audio' ? 'audio/*' : 'audio/*,video/*'}
                      onChange={handleFileSelect}
                      className="hidden"
                      id="media-file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!supabase}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {type === 'audio' ? 'Audiobestand kiezen' : 'Video- of audiobestand kiezen'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Max. 50 MB · MP3, WAV, MP4, MOV, WebM
                    </p>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}

                {/* Volume + opties */}
                {(mediaFilename || mediaUrl) && (
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1.5">
                          <Volume2 className="h-3.5 w-3.5" /> Volume
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {Math.round(mediaVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={mediaVolume}
                        onChange={(e) => setMediaVolume(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mediaAutoplay}
                          onChange={(e) => setMediaAutoplay(e.target.checked)}
                          className="rounded accent-primary"
                        />
                        Automatisch afspelen bij GO
                      </label>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mediaLoop}
                          onChange={(e) => setMediaLoop(e.target.checked)}
                          className="rounded accent-primary"
                        />
                        Herhalen
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Presenter + Locatie */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cue-presenter">Spreker / Artiest</Label>
                <Input
                  id="cue-presenter"
                  value={presenter}
                  onChange={(e) => setPresenter(e.target.value)}
                  placeholder="Jan de Vries"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cue-location">Locatie / Podium</Label>
                {stageNames.length > 0 ? (
                  <>
                    <datalist id="stage-names-list">
                      {stageNames.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <Input
                      id="cue-location"
                      list="stage-names-list"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={stageNames[0] ?? 'Hoofdpodium'}
                    />
                  </>
                ) : (
                  <Input
                    id="cue-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Hoofdpodium"
                  />
                )}
              </div>
            </div>

            {/* Algemene notities */}
            <div className="space-y-2">
              <Label htmlFor="cue-notes">Notities (zichtbaar voor iedereen)</Label>
              <Textarea
                id="cue-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Extra info voor de crew..."
                rows={2}
              />
            </div>

            {/* Technische notities (uitklapbaar) */}
            <div>
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showExtra ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Technische notities
              </button>

              {showExtra && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={techNotes}
                    onChange={(e) => setTechNotes(e.target.value)}
                    placeholder="Interne technische details (niet zichtbaar voor sprekers)..."
                    rows={2}
                    className="text-sm border-yellow-500/30 bg-yellow-500/5"
                  />
                </div>
              )}
            </div>

            {/* Kleur label */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Kleur label (optioneel)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {[null, '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'].map((c) => (
                  <button
                    key={c ?? 'none'}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${
                      color === c
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: c ?? 'transparent' }}
                    title={c ?? 'Geen kleur'}
                  >
                    {c === null && (
                      <span className="flex items-center justify-center w-full h-full text-muted-foreground text-xs border border-border rounded-full">✕</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-advance */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="rounded accent-primary"
              />
              <span>Auto-advance: volgende cue automatisch starten bij 0</span>
            </label>

            {/* Slide koppeling (voor stage output) */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground shrink-0 w-28" htmlFor="slide-index-input">
                🖥️ Slide bij GO
              </label>
              <Input
                id="slide-index-input"
                type="number"
                min={1}
                placeholder="—"
                value={slideIndex}
                onChange={(e) => setSlideIndex(e.target.value)}
                className="w-20 h-7 text-sm font-mono"
              />
              <span className="text-xs text-muted-foreground">
                {slideIndex.trim() !== '' ? `Ga naar slide ${slideIndex} bij GO` : 'Geen automatische slide'}
              </span>
            </div>

            {/* ── Presentatie / Slides ──────────────────────────────────── */}
            <hr className="border-border/50" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Presentation className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Presentatie / Slides (optioneel)</Label>
              </div>

              {(presentationUrl || presentationFile) ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                  <Presentation className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {presentationFile?.name ?? presentationFilename ?? 'Presentatie'}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {presentationFile ? presentationType ?? (presentationFile.name.endsWith('.pptx') ? 'PPTX' : 'PDF') : (presentationType?.toUpperCase() ?? '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPresentationFile(null)
                      setPresentationUrl(null)
                      setPresentationPath(null)
                      setPresentationFilename(null)
                      setPresentationType(null)
                      if (presentationInputRef.current) presentationInputRef.current.value = ''
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={presentationInputRef}
                    type="file"
                    accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const isPdf  = file.type === 'application/pdf' || file.name.endsWith('.pdf')
                      const isPptx = file.name.endsWith('.pptx')
                      if (!isPdf && !isPptx) {
                        setPresentationError('Alleen PDF en PPTX zijn toegestaan')
                        return
                      }
                      setPresentationFile(file)
                      setPresentationFilename(file.name)
                      setPresentationType(isPdf ? 'pdf' : 'pptx')
                      setPresentationError(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => presentationInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border/50 hover:border-primary/50 rounded-lg py-4 text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    PDF of PPTX uploaden (max 50 MB)
                  </button>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    PPTX tip: exporteer vanuit PowerPoint als PDF voor de beste weergave met slide-controle.
                  </p>
                </div>
              )}

              {presentationError && (
                <p className="text-xs text-destructive">{presentationError}</p>
              )}

              {/* Bediening */}
              {(presentationUrl || presentationFile) && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Wie bedient de slides?</Label>
                  <div className="flex gap-2">
                    {(['caller', 'presenter', 'both'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSlideControlMode(mode)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          slideControlMode === mode
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-border'
                        }`}
                      >
                        {mode === 'caller' ? 'Caller' : mode === 'presenter' ? 'Presentator' : 'Beiden'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Foutmelding van de parent (bijv. DB-fout) */}
          {saveError && (
            <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <p className="text-xs text-destructive leading-relaxed">{saveError}</p>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploaden...</>
              ) : loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan...</>
              ) : mode === 'add' ? 'Cue toevoegen' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
