import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'E-mail bevestigd – CueBoard' }

// Publieke bevestigingspagina — vereist GEEN auth.
// Gebruikers landen hier na het klikken op de bevestigingslink in hun signup-mail.
export default function EmailConfirmedPage() {
  return (
    <div className="min-h-screen bg-[#050f09] text-white flex items-center justify-center px-6 py-16">
      {/* Achtergrond glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-emerald-500/[0.06] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md text-center space-y-8">
        {/* Logo */}
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.6)]" />
          <span className="font-black text-xl tracking-tight text-white uppercase">
            Cue<span className="text-emerald-400">Board</span>
          </span>
        </div>

        {/* Success icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" strokeWidth={2.5} />
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-white">
            Je e-mail is bevestigd
          </h1>
          <p className="text-white/50 leading-relaxed">
            Je CueBoard-account is geactiveerd. Log in om je eerste show op te zetten en je team uit te nodigen.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3 pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 py-3 rounded-xl transition-all uppercase tracking-wide text-sm shadow-[0_0_24px_rgba(16,185,129,0.35)]"
          >
            Nu inloggen <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-xs text-white/30">
            Gebruik het e-mailadres en wachtwoord waarmee je je hebt aangemeld.
          </p>
        </div>

        {/* Helper link */}
        <div className="pt-6 border-t border-white/5">
          <p className="text-xs text-white/30">
            Problemen met inloggen?{' '}
            <a href="mailto:info@artiflexx.nl" className="text-emerald-400/70 hover:text-emerald-400 transition-colors">
              info@artiflexx.nl
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
