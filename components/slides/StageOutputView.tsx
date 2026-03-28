'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cue, Rundown } from '@/lib/types/database'

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

// ── PPTX viewer via Microsoft Office Online ───────────────────────────────────
function PptxOutputView({ url, rundownId }: { url: string; rundownId: string }) {
  const supabase = createClient()
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`

  useEffect(() => {
    const channel = supabase
      .channel(`slide:${rundownId}`)
      .on('broadcast', { event: 'slide_change' }, () => {
        const iframe = document.getElementById('pptx-frame') as HTMLIFrameElement | null
        if (iframe) iframe.src = embedUrl
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rundownId, supabase, embedUrl])

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        id="pptx-frame"
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
      />
      <div className="fixed bottom-2 right-3 text-white/10 text-[10px] font-mono pointer-events-none select-none">
        PPTX · automatische navigatie alleen bij PDF
      </div>
    </div>
  )
}

// ── PDF viewer via pdf.js ─────────────────────────────────────────────────────
function PdfOutputView({
  url,
  rundownId,
  initialSlideIndex = 0,
}: {
  url: string
  rundownId: string
  initialSlideIndex?: number
}) {
  const supabase      = createClient()
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef        = useRef<any>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const [slideIndex, setSlideIndex] = useState(initialSlideIndex)
  const [totalPages, setTotalPages] = useState(0)
  const [loaded, setLoaded]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // ── pdf.js laden + PDF inladen ──────────────────────────────────────────────
  useEffect(() => {
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

        const urlWithCacheBust = `${url}?t=${Date.now()}`
        const pdf = await window.pdfjsLib.getDocument({
          url: urlWithCacheBust,
          withCredentials: false,
        }).promise

        if (cancelled) return
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setLoaded(true)
      } catch (e) {
        if (!cancelled) {
          console.error('[StageOutputView] PDF load error:', e)
          setError('Kon PDF niet laden. Controleer de upload en probeer opnieuw.')
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [url])

  // ── Slide renderen op canvas ────────────────────────────────────────────────
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
          window.innerWidth  / vp.width,
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

  // ── Realtime: luister naar slide_change broadcasts ──────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`slide:${rundownId}`)
      .on('broadcast', { event: 'slide_change' }, (payload) => {
        const idx = payload.payload?.index
        if (typeof idx === 'number') setSlideIndex(idx)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [rundownId, supabase])

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-3">
        <p className="text-red-400/70 text-sm font-mono text-center max-w-xs">{error}</p>
        <button
          onClick={() => { setError(null); setLoaded(false); pdfRef.current = null }}
          className="text-xs text-white/30 hover:text-white/60 underline"
        >
          Opnieuw proberen
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {!loaded && (
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          <p className="text-white/20 text-xs font-mono">PDF laden…</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{ display: loaded ? 'block' : 'none' }}
      />

      {loaded && totalPages > 1 && (
        <div className="fixed bottom-2 right-3 text-white/10 text-[10px] font-mono tabular-nums pointer-events-none select-none">
          {slideIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  )
}

// ── Still image weergave ───────────────────────────────────────────────────────
function StillImageView({ url, showName }: { url: string; showName: string }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <img
        src={url}
        alt={showName}
        className="max-w-full max-h-full object-contain"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  )
}

// ── Leeg scherm (geen inhoud geconfigureerd) ───────────────────────────────────
function NoContentView({ showName }: { showName: string }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
      <div className="text-center space-y-2">
        <p className="text-white/20 text-sm font-mono tracking-widest uppercase">
          {showName}
        </p>
        <p className="text-white/10 text-xs font-mono">
          Geen presentatie geladen — upload een PDF, PPTX of still in de rundown instellingen
        </p>
      </div>
    </div>
  )
}

// ── Hoofd component ───────────────────────────────────────────────────────────
export function StageOutputView({ rundown, showName }: StageOutputViewProps) {
  const supabase = createClient()

  // Track de actieve cue (om per-cue presentaties te tonen)
  const [activeCue, setActiveCue] = useState<Cue | null>(null)
  const activeCueRef = useRef<Cue | null>(null)

  useEffect(() => {
    // Haal direct de actieve cue op
    async function fetchActiveCue() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('cues')
        .select('*')
        .eq('rundown_id', rundown.id)
        .eq('status', 'running')
        .maybeSingle()
      activeCueRef.current = data ?? null
      setActiveCue(data ?? null)
    }
    fetchActiveCue()

    // Luister naar cue-statuswijzigingen
    const channel = supabase
      .channel(`stage_cues:${rundown.id}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'cues',
        filter: `rundown_id=eq.${rundown.id}`,
      }, (payload: { new: Cue }) => {
        const updated = payload.new
        if (updated.status === 'running') {
          activeCueRef.current = updated
          setActiveCue(updated)
        } else if (activeCueRef.current?.id === updated.id) {
          activeCueRef.current = null
          setActiveCue(null)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rundown.id, supabase])

  // ── Prioriteit: per-cue presentatie > rundown deck > still > leeg ─────────

  // 1. Per-cue presentatie (als de actieve cue een eigen presentatie heeft)
  if (activeCue?.presentation_url && activeCue.presentation_type) {
    const isPptx = activeCue.presentation_type === 'pptx'
    if (isPptx) {
      return (
        <PptxOutputView
          key={`cue-${activeCue.id}`}
          url={activeCue.presentation_url}
          rundownId={rundown.id}
        />
      )
    }
    return (
      <PdfOutputView
        key={`cue-${activeCue.id}`}
        url={activeCue.presentation_url}
        rundownId={rundown.id}
        initialSlideIndex={activeCue.current_slide_index ?? 0}
      />
    )
  }

  // 2. Rundown-breed slide deck
  if (rundown.slide_url) {
    const isPptx = rundown.slide_type === 'pptx' || rundown.slide_type === 'ppt'
    if (isPptx) {
      return <PptxOutputView key="rundown-pptx" url={rundown.slide_url} rundownId={rundown.id} />
    }
    return <PdfOutputView key="rundown-pdf" url={rundown.slide_url} rundownId={rundown.id} />
  }

  // 3. Still image (fallback tussen sprekers)
  if (rundown.still_url) {
    return <StillImageView url={rundown.still_url} showName={showName} />
  }

  // 4. Leeg scherm
  return <NoContentView showName={showName} />
}
