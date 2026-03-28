export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-background to-background pointer-events-none" />
      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cueboard-logo.svg" alt="CueBoard" className="h-10 w-auto" />
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
