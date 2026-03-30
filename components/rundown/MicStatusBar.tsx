'use client'

/**
 * MicStatusBar
 * Compact read-only overzicht van actieve microfoons voor een gegeven cue.
 *
 * Gebruik bij voorkeur de preloaded-props variant (preloadedDevices +
 * preloadedActiveIds) om N×queries te voorkomen wanneer dit component
 * meerdere keren op dezelfde pagina staat (bijv. in CrewView per cue).
 *
 * Zonder preloaded-props valt het component terug op eigen fetches +
 * Realtime-subscription — handig als het maar 1× per pagina staat.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mic } from 'lucide-react'

export interface MicDevice {
  id: string
  name: string
  color: string
  channel: number | null
}

interface MicStatusBarProps {
  /** show_id om alle apparaten van te laden (fallback-mode) */
  showId: string
  /** Actieve cue-id — null = geen actieve cue (alles grijs) */
  cueId: string | null
  /** Verberg component als er geen actieve mics zijn */
  hideIfEmpty?: boolean
  /**
   * Pre-geladen apparaten vanuit de parent — als doorgegeven worden
   * geen eigen queries gedaan (performance-mode).
   */
  preloadedDevices?: MicDevice[]
  /**
   * Pre-geladen actieve device-ids voor deze cue — als doorgegeven
   * wordt de assignment-query + Realtime-subscription overgeslagen.
   */
  preloadedActiveIds?: Set<string>
}

export function MicStatusBar({
  showId,
  cueId,
  hideIfEmpty = false,
  preloadedDevices,
  preloadedActiveIds,
}: MicStatusBarProps) {
  const isPreloaded = preloadedDevices !== undefined && preloadedActiveIds !== undefined

  const [devices, setDevices]     = useState<MicDevice[]>(preloadedDevices ?? [])
  const [activeIds, setActiveIds] = useState<Set<string>>(preloadedActiveIds ?? new Set())

  // Sync als preloaded props veranderen (parent update via Realtime)
  useEffect(() => {
    if (preloadedDevices !== undefined) setDevices(preloadedDevices)
  }, [preloadedDevices])

  useEffect(() => {
    if (preloadedActiveIds !== undefined) setActiveIds(preloadedActiveIds)
  }, [preloadedActiveIds])

  // ── Fallback: eigen fetches als er geen preloaded data is ────────────────
  useEffect(() => {
    if (isPreloaded) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('audio_devices')
      .select('id, name, color, channel')
      .eq('show_id', showId)
      .order('name')
      .then(({ data }: { data: MicDevice[] | null }) => {
        setDevices(data ?? [])
      })
  }, [showId, isPreloaded])

  useEffect(() => {
    if (isPreloaded || !cueId) {
      if (!cueId) setActiveIds(new Set())
      return
    }
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('cue_audio_assignments')
      .select('device_id')
      .eq('cue_id', cueId)
      .then(({ data }: { data: { device_id: string }[] | null }) => {
        setActiveIds(new Set((data ?? []).map(a => a.device_id)))
      })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ch = (supabase as any)
      .channel(`mic-status:${cueId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'cue_audio_assignments', filter: `cue_id=eq.${cueId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setActiveIds(prev => new Set([...prev, payload.new.device_id]))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'cue_audio_assignments', filter: `cue_id=eq.${cueId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          setActiveIds(prev => {
            const next = new Set(prev)
            next.delete(payload.old.device_id)
            return next
          })
        }
      )
      .subscribe()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { ;(supabase as any).removeChannel(ch) }
  }, [cueId, isPreloaded])

  if (devices.length === 0) return null

  const activeDevices = devices.filter(d => activeIds.has(d.id))
  if (hideIfEmpty && activeDevices.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Mic className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      {devices.map(dev => {
        const isOn = activeIds.has(dev.id)
        return (
          <div
            key={dev.id}
            title={`${dev.name}${dev.channel ? ` — ch.${dev.channel}` : ''}${isOn ? ' · actief' : ' · inactief'}`}
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-all duration-200"
            style={isOn ? {
              backgroundColor: dev.color + '20',
              borderColor:     dev.color + '55',
              color:           dev.color,
            } : {
              backgroundColor: 'transparent',
              borderColor:     'rgba(255,255,255,0.08)',
              color:           'rgba(255,255,255,0.2)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: isOn ? dev.color : 'rgba(255,255,255,0.12)',
                boxShadow:       isOn ? `0 0 5px ${dev.color}` : 'none',
              }}
            />
            {dev.name}
            {dev.channel !== null && (
              <span className="text-[10px] opacity-50 font-mono">ch.{dev.channel}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
