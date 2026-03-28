import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CueType, CueStatus } from '@/lib/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatteer seconden naar MM:SS
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Parseer MM:SS of M:SS naar seconden
export function parseDuration(input: string): number {
  const parts = input.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secs = parseInt(parts[1], 10) || 0
    return mins * 60 + secs
  }
  return parseInt(input, 10) || 0
}

// Totale duur van een rundown
export function totalDuration(durations: number[]): number {
  return durations.reduce((acc, d) => acc + d, 0)
}

// Kleur per cue-type
export function cueTypeColor(type: CueType): string {
  const colors: Record<CueType, string> = {
    video:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    audio:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    lighting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    speech:   'bg-green-500/20 text-green-400 border-green-500/30',
    break:    'bg-gray-500/20 text-gray-400 border-gray-500/30',
    intro:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    outro:    'bg-red-500/20 text-red-400 border-red-500/30',
    custom:   'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return colors[type] ?? colors.custom
}

// Kleur per cue-status
export function cueStatusColor(status: CueStatus): string {
  const colors: Record<CueStatus, string> = {
    pending: 'text-slate-400',
    running: 'text-green-400',
    done:    'text-slate-600',
    skipped: 'text-red-400',
  }
  return colors[status] ?? 'text-slate-400'
}

// Label per cue-type (NL)
export function cueTypeLabel(type: CueType): string {
  const labels: Record<CueType, string> = {
    video:    'Video',
    audio:    'Audio',
    lighting: 'Licht',
    speech:   'Spreker',
    break:    'Pauze',
    intro:    'Intro',
    outro:    'Outro',
    custom:   'Overig',
  }
  return labels[type] ?? 'Overig'
}

// Formatteer datum
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

// Bereken verwachte starttijden per cue op basis van show starttijd (HH:MM of HH:MM:SS)
export function calculateCueStartTimes(
  cues: { duration_seconds: number }[],
  showStartTime: string | null = null
): string[] {
  if (!showStartTime) return cues.map(() => '--:--')

  const parts = showStartTime.split(':').map(Number)
  let elapsed = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)

  return cues.map((cue) => {
    const h = Math.floor(elapsed / 3600)
    const m = Math.floor((elapsed % 3600) / 60)
    elapsed += cue.duration_seconds
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  })
}

// Bereken of de show voor of achter loopt (in seconden)
export function calcScheduleDelta(
  cues: { duration_seconds: number; status: string; started_at: string | null }[],
  showStartTime: string | null
): number | null {
  if (!showStartTime) return null

  const parts = showStartTime.split(':').map(Number)
  const showStartSeconds = (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60

  const runningCue = cues.find((c) => c.status === 'running')
  if (!runningCue?.started_at) return null

  // Bereken hoeveel seconden er op schema gepland hadden moeten zijn verstreken
  const plannedElapsed = cues
    .filter((c) => c.status === 'done' || c.status === 'running')
    .reduce((acc, c) => acc + c.duration_seconds, 0)

  const now = Date.now() / 1000
  const showStart = showStartSeconds
  const actualElapsed = now - (showStart + (new Date().setHours(0, 0, 0, 0) / 1000))

  // Positief = loopt voor, negatief = loopt achter
  return plannedElapsed - Math.floor(actualElapsed)
}
