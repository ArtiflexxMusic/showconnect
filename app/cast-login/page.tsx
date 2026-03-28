'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CastLoginPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [pin, setPin]       = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, value: string) {
    // Alleen cijfers
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...pin]
    next[index] = digit
    setPin(next)
    setError(null)

    if (digit && index < 5) {
      inputs.current[index + 1]?.focus()
    }

    // Auto-submit wanneer alle 6 velden ingevuld zijn
    if (digit && index === 5) {
      const full = [...next].join('')
      if (full.length === 6) submitPin(full)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter') {
      const full = pin.join('')
      if (full.length === 6) submitPin(full)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setPin(next)
    inputs.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6) submitPin(pasted)
  }

  async function submitPin(fullPin: string) {
    if (fullPin.length !== 6) return
    setLoading(true)
    setError(null)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc('get_cast_portal_by_pin', {
        member_pin: fullPin,
      })

      if (rpcError) throw rpcError
      if (!data || !data.token) {
        setError('Onbekende PIN. Vraag je organisator om de juiste code.')
        setLoading(false)
        setPin(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
        return
      }

      router.push(`/cast/${data.token}`)
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.')
      setLoading(false)
    }
  }

  const filled = pin.filter(Boolean).length

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          <span className="font-extrabold uppercase tracking-widest text-white text-lg">CueBoard</span>
        </div>
        <p className="text-white/30 text-sm">Cast Portal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-white font-bold text-xl">Voer je PIN in</h1>
          <p className="text-white/40 text-sm">Je ontvangt deze code van je organisator.</p>
        </div>

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

        {/* Submit knop */}
        <button
          onClick={() => submitPin(pin.join(''))}
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

      <p className="mt-8 text-white/15 text-xs text-center">
        Geen account nodig &nbsp;·&nbsp; CueBoard Cast Portal
      </p>
    </div>
  )
}
