'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Magic link info (opgehaald via token) ─────────────────────────────────────
interface CastInfo {
  member_id: string
  name: string
  role: string | null
  color: string
  show_name: string
  token: string
}

// ── PIN-invoer component ──────────────────────────────────────────────────────
function PinInput({
  onSubmit,
  loading,
  error,
  castInfo,
}: {
  onSubmit: (pin: string) => void
  loading: boolean
  error: string | null
  castInfo: CastInfo | null
}) {
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[index] = digit
    setPin(next)
    if (digit && index < 5) inputs.current[index + 1]?.focus()
    if (digit && index === 5) {
      const full = [...next].join('')
      if (full.length === 6) onSubmit(full)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) inputs.current[index - 1]?.focus()
    if (e.key === 'Enter') { const full = pin.join(''); if (full.length === 6) onSubmit(full) }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setPin(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) onSubmit(pasted)
  }

  const filled = pin.filter(Boolean).length

  return (
    <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-8">

      {/* Begroeting als magic link bekend is */}
      {castInfo ? (
        <div className="text-center space-y-1">
          <div
            className="h-12 w-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: castInfo.color + '25', color: castInfo.color }}
          >
            {castInfo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-white font-bold text-xl">Welkom, {castInfo.name.split(' ')[0]}!</h1>
          <p className="text-white/40 text-sm">{castInfo.show_name}</p>
          {castInfo.role && <p className="text-xs" style={{ color: castInfo.color }}>{castInfo.role}</p>}
          <p className="text-white/30 text-xs pt-2">Voer je PIN in om verder te gaan.</p>
        </div>
      ) : (
        <div className="text-center space-y-1">
          <h1 className="text-white font-bold text-xl">Voer je PIN in</h1>
          <p className="text-white/40 text-sm">Je ontvangt deze code van je organisator.</p>
        </div>
      )}

      {/* PIN invoer */}
      <div className="flex items-center justify-center gap-2">
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={handlePaste}
            autoFocus={i === 0}
            className={[
              'h-14 w-11 rounded-xl text-center text-2xl font-bold font-mono',
              'bg-white/5 border text-white outline-none',
              'transition-all duration-150',
              digit
                ? 'border-emerald-400/60 bg-emerald-400/5 text-emerald-300'
                : 'border-white/10 focus:border-white/30',
            ].join(' ')}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-red-400/80 bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={() => onSubmit(pin.join(''))}
        disabled={filled < 6 || loading}
        className={[
          'w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200',
          filled === 6 && !loading
            ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
            : 'bg-white/5 text-white/20 cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
            Bezig…
          </span>
        ) : (
          'Inloggen →'
        )}
      </button>
    </div>
  )
}

// ── Hoofdpagina (Suspense-wrapper nodig voor useSearchParams) ─────────────────
function GreenRoomLoginInner() {
  const router   = useRouter()
  const params   = useSearchParams()
  const supabase = createClient()

  const magicToken = params.get('magic')

  const [castInfo, setCastInfo]       = useState<CastInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(!!magicToken)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Als er een magic token is → haal cast member info op
  useEffect(() => {
    if (!magicToken) return
    setLoadingInfo(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .rpc('get_cast_info_by_token', { p_token: magicToken })
      .then(({ data, error: err }: { data: CastInfo | null; error: unknown }) => {
        if (!err && data) setCastInfo(data)
        setLoadingInfo(false)
      })
  }, [magicToken, supabase])

  async function handlePin(fullPin: string) {
    if (fullPin.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      if (magicToken && castInfo) {
        // Magic link flow: verifieer PIN bij dit token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: valid } = await (supabase as any)
          .rpc('verify_cast_pin_for_token', { p_token: magicToken, p_pin: fullPin })

        if (!valid) {
          setError('Verkeerde PIN. Controleer de code van je organisator.')
          setLoading(false)
          return
        }
        router.push(`/green-room/${magicToken}`)
      } else {
        // Reguliere flow: zoek token via PIN
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcErr } = await (supabase as any)
          .rpc('get_cast_portal_by_pin', { member_pin: fullPin })

        if (rpcErr) throw rpcErr
        if (!data?.token) {
          setError('Onbekende PIN. Vraag je organisator om de juiste code.')
          setLoading(false)
          return
        }
        router.push(`/green-room/${data.token}`)
      }
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          <span className="font-extrabold uppercase tracking-widest text-white text-lg">CueBoard</span>
        </div>
        <p className="text-white/30 text-sm">Green Room</p>
      </div>

      {loadingInfo ? (
        <div className="flex flex-col items-center gap-3 text-white/30">
          <span className="h-6 w-6 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
          <span className="text-xs">Laden…</span>
        </div>
      ) : (
        <PinInput
          onSubmit={handlePin}
          loading={loading}
          error={error}
          castInfo={castInfo}
        />
      )}

      <p className="mt-8 text-white/15 text-xs text-center">
        Geen account nodig &nbsp;·&nbsp; CueBoard Green Room
      </p>
    </div>
  )
}

export default function GreenRoomLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
      </div>
    }>
      <GreenRoomLoginInner />
    </Suspense>
  )
}
