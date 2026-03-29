'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// pdf.js types (geladen via CDN)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfjsLib: any
  }
}

interface SlideViewerProps {
  /** Publieke URL naar het PDF of PPTX bestand */
  url: string
  type: 'pdf' | 'pptx'
  /** Huidige slide (0-based) */
  slideIndex: number
  /** Totaal aantal slides (alleen voor PDF, PPTX is unknown) */
  totalSlides?: number
  /** Of de viewer navigatieknoppen toont */
  showControls?: boolean
  /** Of de gebruiker hier mag navigeren */
  canControl?: boolean
  onSlideChange?: (index: number) => void
  /** Callback zodra het totale aantal pagina's bekend is (alleen PDF) */
  onPageCount?: (n: number) => void
  className?: string
  /** Fullscreen modus tonen */
  allowFullscreen?: boolean
}

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error(`Script laden mislukt: ${src}`))
    document.head.appendChild(s)
  })
}

// ── Auto-hide hook voor controls ───────────────────────────────────────────────
function useAutoHideControls(delay = 1200) {
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), delay)
  }, [delay])

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  useEffect(() => {
    // Start timer bij mount
    timerRef.current = setTimeout(() => setVisible(false), delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [delay])

  return { visible, show, hide }
}

// ── PDF Viewer ─────────────────────────────────────────────────────────────────
function PdfViewer({
  url, slideIndex, onPageCount, onSlideChange, showControls, canControl, allowFullscreen
}: {
  url: string
  slideIndex: number
  onPageCount: (n: number) => void
  onSlideChange?: (i: number) => void
  showControls?: boolean
  canControl?: boolean
  allowFullscreen?: boolean
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef     = useRef<any>(null)
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [error, setError]       = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const renderTaskRef = useRef<{cancel: () => void} | null>(null)
  const { visible: controlsVisible, show: showControls_, hide: hideControls } = useAutoHideControls()

  // pdf.js laden
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await loadScript(PDFJS_CDN)
        if (cancelled) return
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN
        const pdf = await window.pdfjsLib.getDocument(url).promise
        if (cancelled) return
        pdfRef.current = pdf
        setTotal(pdf.numPages)
        onPageCount(pdf.numPages)
        setLoading(false)
      } catch (e) {
        if (!cancelled) setError('Kon PDF niet laden. Controleer of het bestand correct is geüpload.')
      }
    }
    init()
    return () => { cancelled = true }
  }, [url, onPageCount])

  // Slide renderen
  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || loading) return
    const pageNum = Math.min(Math.max(slideIndex + 1, 1), total || 1)

    async function renderPage() {
      try {
        // Annuleer vorige render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
          renderTaskRef.current = null
        }
        const page     = await pdfRef.current.getPage(pageNum)
        const canvas   = canvasRef.current!
        const ctx      = canvas.getContext('2d')!
        const vp       = page.getViewport({ scale: 1 })
        const scale    = canvas.parentElement
          ? Math.min(canvas.parentElement.clientWidth / vp.width, (canvas.parentElement.clientHeight || 600) / vp.height)
          : 1
        const viewport = page.getViewport({ scale: Math.max(scale, 0.5) })
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        const task     = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (e: unknown) {
        // RenderingCancelledException is niet erg
        if (e instanceof Error && !e.message.includes('Rendering cancelled')) {
          setError('Slide renderen mislukt.')
        }
      }
    }
    renderPage()
  }, [slideIndex, loading, total])

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8 text-center">
      <FileText className="h-10 w-10 opacity-30" />
      <p className="text-sm">{error}</p>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div
      className={cn('relative flex flex-col h-full', fullscreen && 'fixed inset-0 z-[100] bg-black')}
      onMouseMove={showControls_}
      onMouseLeave={hideControls}
    >
      {/* Canvas + klikzones */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-black">
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />

        {/* Klikzone links → vorige slide */}
        {canControl && slideIndex > 0 && (
          <button
            onClick={() => onSlideChange?.(slideIndex - 1)}
            className="absolute left-0 top-0 h-full w-1/3 flex items-center justify-start pl-3 group opacity-0 hover:opacity-100 transition-opacity"
            title="Vorige slide"
          >
            <span className="bg-black/40 rounded-full p-2 group-hover:bg-black/70 transition-colors">
              <ChevronLeft className="h-6 w-6 text-white" />
            </span>
          </button>
        )}

        {/* Klikzone rechts → volgende slide */}
        {canControl && slideIndex < total - 1 && (
          <button
            onClick={() => onSlideChange?.(slideIndex + 1)}
            className="absolute right-0 top-0 h-full w-1/3 flex items-center justify-end pr-3 group opacity-0 hover:opacity-100 transition-opacity"
            title="Volgende slide"
          >
            <span className="bg-black/40 rounded-full p-2 group-hover:bg-black/70 transition-colors">
              <ChevronRight className="h-6 w-6 text-white" />
            </span>
          </button>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2 bg-[#080f0a] border-t border-white/5 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              onClick={() => onSlideChange?.(Math.max(0, slideIndex - 1))}
              disabled={!canControl || slideIndex <= 0}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-mono text-muted-foreground min-w-[5rem] text-center">
              {slideIndex + 1} / {total}
            </span>
            <Button
              size="sm" variant="outline"
              onClick={() => onSlideChange?.(Math.min(total - 1, slideIndex + 1))}
              disabled={!canControl || slideIndex >= total - 1}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {allowFullscreen && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── PPTX Viewer (Office Online embed) ──────────────────────────────────────────
function PptxViewer({ url, showControls, canControl, allowFullscreen }: {
  url: string
  showControls?: boolean
  canControl?: boolean
  allowFullscreen?: boolean
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const { visible: controlsVisible, show: showControls_, hide: hideControls } = useAutoHideControls()
  const encoded = encodeURIComponent(url)
  const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`

  return (
    <div
      className={cn('relative flex flex-col h-full', fullscreen && 'fixed inset-0 z-[100] bg-black')}
      onMouseMove={showControls_}
      onMouseLeave={hideControls}
    >
      <iframe
        src={embedUrl}
        className="flex-1 w-full border-0"
        title="Presentatie"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
      {showControls && (
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2 bg-[#080f0a] border-t border-white/5 transition-opacity duration-300',
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <p className="text-xs text-muted-foreground">
            PPTX — gebruik de pijltjes in de viewer om te navigeren
            {canControl && ' of laat presentator dit doen'}
          </p>
          {allowFullscreen && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
              onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ── SlideViewer (hoofd-export) ─────────────────────────────────────────────────
export function SlideViewer({
  url, type, slideIndex, totalSlides, showControls = true,
  canControl = false, onSlideChange, onPageCount, className, allowFullscreen = false,
}: SlideViewerProps) {
  const [pageCount, setPageCount] = useState(totalSlides ?? 0)

  const handlePageCount = useCallback((n: number) => {
    setPageCount(n)
    onPageCount?.(n)
  }, [onPageCount])

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-white/8 bg-[#080f0a]', className)}>
      {type === 'pdf' ? (
        <PdfViewer
          url={url}
          slideIndex={slideIndex}
          onPageCount={handlePageCount}
          onSlideChange={onSlideChange}
          showControls={showControls}
          canControl={canControl}
          allowFullscreen={allowFullscreen}
        />
      ) : (
        <PptxViewer
          url={url}
          showControls={showControls}
          canControl={canControl}
          allowFullscreen={allowFullscreen}
        />
      )}
    </div>
  )
}

export type { SlideViewerProps }
