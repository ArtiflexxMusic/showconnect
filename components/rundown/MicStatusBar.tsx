'use client'

/**
 * MicStatusBar
 * Compact read-only overzicht van actieve microfoons voor een gegeven cue.
 * Gebruikt in CallerView en CrewView.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mic } from 'lucide-react'

interface Device {
  id: string
  name: string
  color: string
  channel: number | null
}

interface MicStatusBarProps {
  /** show_id om alle apparaten van te laden */
  showId: string
  /** Actieve cue-id — null = geen actieve cue (alles grijs) */
  cueId: string | null
  /** Verberg component als er geen apparaten of geen actieve mics zijn */
  hideIfEmpty?: boolean
}

export function MicStatusBar({ showId, cueId, hideIfEmpty = false }: MicStatusBarProps) {
  const supabase = createClient()

  const [devices, setDevices]   = useState<Device[]>([])
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  // Laad alle apparaten voor deze show (eenmalig)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('audio_devices')
      .select('id, name, color, channel')
      .eq('show_id', showId)
      .order('name')
      .then(({ data }: { data: Device[] | null }) => {
        setDevices(data ?? [])
      })
  }, [showId, supabase])

  // Laad assignments voor de actieve cue + Realtime sync
  useEffect(() => {
    if (!cueId) {
      setActiveIds(new Set())
      return
    }

    // Initieel laden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('cue_audio_assignments')
      .select('device_id')
      .eq('cue_id', cueId)
      .then(({ data }: { data: { device_id: string }[] | null }) => {
        setActiveIds(new Set((data ?? []).map(a => a.device_id)))
      })

    // Realtime: luister naar wijzigingen voor deze cue
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

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).removeChannel(ch)
    }
  }, [cueId, supabase])

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
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border transition-all"
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
            {/* LED-dot */}
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
