'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Check, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends ToastOptions {
  id: string
  message: string
  removing?: boolean
}

// Globale event bus
const listeners: Array<(toast: Omit<ToastItem, 'id'>) => void> = []

export function toast(message: string, options: ToastOptions = {}) {
  listeners.forEach(fn => fn({ message, ...options }))
}
toast.success = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'success' })
toast.error = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'error' })
toast.info = (message: string, options?: Omit<ToastOptions, 'type'>) =>
  toast(message, { ...options, type: 'info' })

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
  }, [])

  useEffect(() => {
    const handler = (item: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setToasts(prev => [...prev, { ...item, id }])
      setTimeout(() => remove(id), item.duration ?? 4000)
    }
    listeners.push(handler)
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1) }
  }, [remove])

  if (!mounted) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm pointer-events-auto',
            'transition-all duration-300',
            t.removing ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
            t.type === 'error'   && 'bg-destructive/15 border-destructive/30 text-destructive',
            t.type === 'success' && 'bg-green-500/10 border-green-500/25 text-green-400',
            t.type === 'info'    && 'bg-muted border-border text-foreground',
            !t.type              && 'bg-muted border-border text-foreground',
          )}
        >
          {t.type === 'success' && <Check       className="h-4 w-4 shrink-0" />}
          {t.type === 'error'   && <AlertCircle className="h-4 w-4 shrink-0" />}
          {t.type === 'info'    && <Info        className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); remove(t.id) }}
              className="ml-1 text-xs font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => remove(t.id)} className="opacity-40 hover:opacity-70 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
