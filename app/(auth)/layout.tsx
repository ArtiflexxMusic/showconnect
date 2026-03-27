export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-background to-background pointer-events-none" />
      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SC</span>
            </div>
            <span className="text-xl font-bold tracking-tight">ShowConnect</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Show control voor live events
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
