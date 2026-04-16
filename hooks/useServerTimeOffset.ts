'use client'

/**
 * useServerTimeOffset
 *
 * Meet offset tussen Date.now() op dit device en Postgres server_time().
 * Elk device (caller, crew, elk crew-lid) corrigeert vervolgens alle
 * countdown/elapsed berekeningen met deze offset, zodat timers niet driften
 * door klokverschillen tussen devices.
 *
 * Gebruik:
 *   const { offsetRef, ready } = useServerTimeOffset()
 *   const nowCorrected = Date.now() + offsetRef.current
 *
 * Neemt 3 samples en kiest de sample met laagste round-trip (minst ruis).
 * Re-meet elke 5 minuten, voor het geval device-klok drift gedurende show.
 */

import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const SAMPLES           = 3
const REMEASURE_MS      = 5 * 60 * 1000
const SAMPLE_GAP_MS     = 120

async function measureOnce(supabase: SupabaseClient): Promise<{ rtt: number; offset: number } | null> {
  const t0 = Date.now()
  const { data, error } = await supabase.rpc('server_time')
  const t1 = Date.now()
  if (error || !data) return null
  const rtt     = t1 - t0
  const serverMs = new Date(data as string).getTime()
  // Aanname: round-trip symmetrisch. Server-tijd op moment van response ≈ t0 + rtt/2 lokaal.
  const offset = serverMs - (t0 + rtt / 2)
  return { rtt, offset }
}

export function useServerTimeOffset(supabase: SupabaseClient) {
  const offsetRef = useRef(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function measure() {
      let best: { rtt: number; offset: number } | null = null
      for (let i = 0; i < SAMPLES; i++) {
        if (cancelled) return
        const sample = await measureOnce(supabase)
        if (sample && (!best || sample.rtt < best.rtt)) best = sample
        if (i < SAMPLES - 1) await new Promise(r => setTimeout(r, SAMPLE_GAP_MS))
      }
      if (cancelled || !best) return
      offsetRef.current = best.offset
      setReady(true)
    }

    measure()
    const id = setInterval(measure, REMEASURE_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [supabase])

  return { offsetRef, ready }
}
