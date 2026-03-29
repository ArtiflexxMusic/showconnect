'use client'

import Link from 'next/link'
import { Zap, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  /** De foutmelding van de API (bijv. "Je Individual plan staat maximaal 1 show toe.") */
  message?: string
  /** Optionele extra context — bijv. welke feature geblokkeerd is */
  feature?: string
}

export function UpgradeModal({ open, onClose, message, feature }: UpgradeModalProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header met gradient */}
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 px-6 pt-6 pb-5 border-b border-border/50">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Plan limiet bereikt</h2>
                <p className="text-xs text-muted-foreground">
                  {feature ?? 'Upgrade voor meer toegang'}
                </p>
              </div>
            </div>

            {message && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {message}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              Kies een hoger plan om door te gaan.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/upgrade"
                onClick={onClose}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-center"
              >
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Team</span>
                <span className="text-[10px] text-muted-foreground">€9,99/mnd</span>
              </Link>
              <Link
                href="/upgrade"
                onClick={onClose}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-center"
              >
                <Zap className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-semibold text-violet-400">Business</span>
                <span className="text-[10px] text-muted-foreground">€29,99/mnd</span>
              </Link>
            </div>

            <Button asChild className="w-full gap-2">
              <Link href="/upgrade" onClick={onClose}>
                Plannen bekijken
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <button
              onClick={onClose}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Misschien later
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
