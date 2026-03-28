'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Rundown } from '@/lib/types/database'

// pdf.js types
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfjsLib: any
  }
}

const PDFJS_CDN        = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

interface StageOutputViewProps {
  rundown: Rundown
  showName: string
}

export function StageOutputView({ rundown, showName }: StageOutputViewProps) {
  const supabase     = createClient()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef       = useRef<any>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const [slideIndex, setSlideIndex] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loaded, setLoaded]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── pdf.js laden + PDF inladen ────────────────────────────────────────────
  useEffect(() => {
    if (!rundown.slide_url) return
    let cancelled = false

    async function loadScript(src: string) {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload  = () => resolve()
        s.onerror = () => reject(new Error(`Script laden mislukt: ${src}`))
        document.head.appendChild(s)
      })
    }

    async function init() {
      try {
        if (!window.pdfjsLib) {
          await loadScript(PDFJS_CDN)
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
        }
        if (cancelled) return
        const pdf = await window.pdfjsLib.getDocument(rundown.slide_url!).promise
        if (cancelled) return
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setLoaded(true)
      } catch (e) {
        if (!cancelled) setError('Kon PDF niet laden. Controleer de upload en probeer opnieuw.')
      }
    }
    init()
    return () => { cancelled = true }
  }, [rundown.slide_url])

  // ── Slide renderen op canvas ──────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !pdfRef.current || !canvasRef.current) return
    const pageNum = Math.min(Math.max(slideIndex + 1, 1), totalPages)

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
          renderTaskRef.current = null
        }
        const page   = await pdfRef.current.getPage(pageNum)
        const canvas = canvasRef.current!
        const ctx    = canvas.getContext('2d')!
        const vp     = page.getViewport({ scale: 1 })
        const scale  = Math.min(
          window.innerWidth / vp.width,
          window.innerHeight / vp.height,
        )
        const viewport = page.getViewport({ scale: Math.max(scale, 0.5) })
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (e: unknown) {
        if (e instanceof Error && !e.message.includes('Rendering cancelled')) {
          console.error('Render error:', e)
        }
      }
    }
    renderPage()
  }, [slideIndex, loaded, totalPages])

  // ── Realtime: luister naar slide_change broadcasts ────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`slide:${rundown.id}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        const idx = payload.payload?.index
        if (typeof idx === 'number') setSlideIndex(idx)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  // ── Geen slide deck ───────────────────────────────────────────────────────
  if (!rundown.slide_url) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <p className="text-white/20 text-sm font-mono tracking-widest uppercase">
            {showName}
          </p>
          <p className="text-white/10 text-xs font-mono">
            Geen presentatie geladen — upload een PDF in de rundown instellingen
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-red-400/60 text-sm font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Spinner tijdens laden */}
      {!loaded && (
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
      )}

      {/* De canvas */}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{ display: loaded ? 'block' : 'none' }}
      />

      {/* Subtiele slide-teller — zo transparant dat het mixer niet opvalt */}
      {loaded && totalPages > 1 && (
        <div className="fixed bottom-2 right-3 text-white/10 text-[10px] font-mono tabular-nums pointer-events-none select-none">
          {slideIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  )
}
