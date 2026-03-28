'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, cueTypeColor, cueTypeLabel, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CueCountdown } from './CueCountdown'
import {
  GripVertical, Play, SkipForward, RotateCcw,
  Pencil, Trash2, ChevronDown, Mic, MapPin, Wrench, Copy, Music, Video, FastForward
} from 'lucide-react'
import type { Cue } from '@/lib/types/database'
import { useState } from 'react'

interface SortableCueRowProps {
  cue: Cue
  index: number
  expectedTime?: string      // Verwachte starttijd bv "14:32"
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onStart: () => void
  onSkip: () => void
  onReset: () => void
}

export function SortableCueRow({
  cue, index, expectedTime, onEdit, onDelete, onDuplicate, onStart, onSkip, onReset
}: SortableCueRowProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: cue.id })

  const [showDetails, setShowDetails] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isRunning = cue.status === 'running'
  const isDone    = cue.status === 'done'
  const isSkipped = cue.status === 'skipped'
  const hasDetails = !!(cue.notes || cue.tech_notes || cue.presenter || cue.location || cue.media_filename)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-md border border-transparent transition-all duration-150 overflow-hidden',
        isDragging  && 'shadow-2xl border-primary/50 bg-accent z-50',
        isRunning   && 'cue-running',
        isDone      && 'opacity-50',
        isSkipped   && 'opacity-40',
        !isDragging && 'hover:bg-accent/30'
      )}
    >
      {/* Kleurlabel balk links */}
      {cue.color && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
          style={{ backgroundColor: cue.color }}
        />
      )}
      <div className="rundown-grid px-2 py-2 items-center">

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* # + verwachte tijd */}
        <div className="pl-1">
          <span className="text-xs font-mono text-muted-foreground block">
            {(index + 1).toString().padStart(2, '0')}
          </span>
          {expectedTime && expectedTime !== '--:--' && (
            <span className="text-[10px] font-mono text-muted-foreground/50 block leading-tight">
              {expectedTime}
            </span>
          )}
        </div>

        {/* Titel + metadata */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-sm font-medium truncate',
              (isDone || isSkipped) && 'line-through'
            )}>
              {cue.title}
            </span>
            {cue.media_url && (
              <span
                className="shrink-0 text-blue-400/60"
                title={cue.media_filename ?? 'Media bijgevoegd'}
              >
                {cue.media_type?.startsWith('video/')
                  ? <Video className="h-3 w-3" />
                  : <Music className="h-3 w-3" />
                }
              </span>
            )}
            {cue.auto_advance && (
              <span className="shrink-0 text-primary/50" title="Auto-advance aan">
                <FastForward className="h-3 w-3" />
              </span>
            )}
            {hasDetails && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                title="Details tonen"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', showDetails && 'rotate-180')} />
              </button>
            )}
          </div>

          {/* Presenter + locatie inline badges */}
          {(cue.presenter || cue.location) && (
            <div className="flex items-center gap-2 mt-0.5">
              {cue.presenter && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
                  <Mic className="h-2.5 w-2.5" />
                  {cue.presenter}
                </span>
              )}
              {cue.location && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
                  <MapPin className="h-2.5 w-2.5" />
                  {cue.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Type badge */}
        <div>
          <span className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            cueTypeColor(cue.type)
          )}>
            {cueTypeLabel(cue.type)}
          </span>
        </div>

        {/* Duur / Countdown */}
        <div className="text-right">
          {isRunning && cue.started_at ? (
            <CueCountdown
              durationSeconds={cue.duration_seconds}
              startedAt={cue.started_at}
            />
          ) : (
            <span className="text-sm font-mono text-muted-foreground">
              {formatDuration(cue.duration_seconds)}
            </span>
          )}
        </div>

        {/* Status badge */}
        <div>
          {isRunning && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border text-xs">
              ● Live
            </Badge>
          )}
          {isDone && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              ✓ Klaar
            </Badge>
          )}
          {isSkipped && (
            <Badge variant="outline" className="text-xs text-red-400 border-red-500/30">
              Overgeslagen
            </Badge>
          )}
        </div>

        {/* Acties (hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          {!isRunning && !isDone && !isSkipped && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={onStart} title="Start"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          {(isRunning || isDone) && (
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
              onClick={onSkip} title="Overslaan"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
          {(isDone || isSkipped || isRunning) && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset} title="Resetten">
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Dupliceren">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Bewerken">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete} title="Verwijderen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Uitklapbare details */}
      {showDetails && hasDetails && (
        <div className="px-12 pb-3 space-y-1.5">
          {cue.notes && (
            <p className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-0.5">
              {cue.notes}
            </p>
          )}
          {cue.tech_notes && (
            <div className="flex items-start gap-1.5 text-xs text-yellow-400/80 border-l-2 border-yellow-500/30 pl-3 py-0.5">
              <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{cue.tech_notes}</span>
            </div>
          )}
          {cue.media_filename && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400/70 border-l-2 border-blue-500/20 pl-3 py-0.5">
              {cue.media_type?.startsWith('video/')
                ? <Video className="h-3 w-3 shrink-0" />
                : <Music className="h-3 w-3 shrink-0" />
              }
              <span className="truncate">{cue.media_filename}</span>
              {cue.media_size && (
                <span className="text-muted-foreground/50 shrink-0">
                  ({cue.media_size < 1024 * 1024
                    ? `${(cue.media_size / 1024).toFixed(0)} KB`
                    : `${(cue.media_size / (1024 * 1024)).toFixed(1)} MB`})
                </span>
              )}
              <span className="text-muted-foreground/40 shrink-0">
                · Vol {Math.round((cue.media_volume ?? 1.0) * 100)}%
                {cue.media_autoplay !== false && ' · Autoplay'}
                {cue.media_loop && ' · Loop'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
