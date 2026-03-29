'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Calendar, ListMusic, X, Loader2 } from 'lucide-react'

interface SearchResult {
  shows: { id: string; name: string; date: string | null; venue: string | null }[]
  rundowns: { id: string; name: string; show_id: string; show_name: string }[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounce cleanup bij unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Focus input wanneer open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults(null)
      setActiveIdx(-1)
    }
  }, [open])

  // Debounced zoek
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
      setActiveIdx(-1)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 250)
  }

  // Flatten resultaten voor keyboard-navigatie
  const flatResults = [
    ...(results?.shows ?? []).map(s => ({ type: 'show' as const, id: s.id, name: s.name, sub: s.date ? new Date(s.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : (s.venue ?? ''), href: `/shows/${s.id}` })),
    ...(results?.rundowns ?? []).map(r => ({ type: 'rundown' as const, id: r.id, name: r.name, sub: r.show_name, href: `/shows/${r.show_id}/rundown/${r.id}` })),
  ]

  const navigate = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!flatResults.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      navigate(flatResults[activeIdx].href)
    }
  }

  const hasResults = flatResults.length > 0
  const showEmptyState = query.length >= 2 && !loading && !hasResults

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border/60 rounded-md px-3 py-1.5 hover:bg-muted hover:text-foreground transition-colors"
        title="Zoeken (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Zoeken…</span>
        <kbd className="ml-1 hidden lg:inline-flex h-4 items-center rounded border border-border/50 bg-background px-1 font-mono text-[10px]">⌘K</kbd>
      </button>
    )
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Zoekmodal */}
      <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 px-4">
        <div className="rounded-xl border border-border bg-background shadow-2xl overflow-hidden">

          {/* Zoekinput */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            {loading
              ? <Loader2 className="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
              : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Zoek shows, rundowns…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            />
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Resultaten */}
          {(hasResults || showEmptyState) && (
            <div className="max-h-80 overflow-y-auto py-2">
              {showEmptyState && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Geen resultaten voor &ldquo;{query}&rdquo;
                </p>
              )}

              {results?.shows && results.shows.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Shows</p>
                  {results.shows.map((show, i) => {
                    const idx = i
                    return (
                      <button
                        key={show.id}
                        onClick={() => navigate(`/shows/${show.id}`)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors ${activeIdx === idx ? 'bg-accent' : ''}`}
                      >
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{show.name}</p>
                          {show.date && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(show.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
                              {show.venue ? ` · ${show.venue}` : ''}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {results?.rundowns && results.rundowns.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rundowns</p>
                  {results.rundowns.map((r, i) => {
                    const idx = (results?.shows?.length ?? 0) + i
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/shows/${r.show_id}/rundown/${r.id}`)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors ${activeIdx === idx ? 'bg-accent' : ''}`}
                      >
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <ListMusic className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.show_name}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Hint wanneer nog niks getypt */}
          {!hasResults && !showEmptyState && query.length === 0 && (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Typ om te zoeken in je shows en rundowns</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Min. 2 tekens</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono">↑↓</kbd> navigeren</span>
            <span><kbd className="font-mono">↵</kbd> openen</span>
            <span><kbd className="font-mono">Esc</kbd> sluiten</span>
          </div>
        </div>
      </div>
    </>
  )
}
