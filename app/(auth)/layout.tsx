export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-background to-background pointer-events-none" />
      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_10px_3px_rgba(52,211,153,0.7)]" />
              <span className="font-black text-2xl tracking-tight text-white uppercase">CueBoard</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Show control voor live events
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
