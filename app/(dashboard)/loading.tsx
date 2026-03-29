// Skeleton die verschijnt tijdens paginanavigatie (Next.js loading.tsx)

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? 'h-4 w-full'}`} />
  )
}

function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <SkeletonLine className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={`h-3.5 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      {/* Paginatitel */}
      <div className="space-y-2">
        <SkeletonLine className="h-7 w-48" />
        <SkeletonLine className="h-4 w-80" />
      </div>

      {/* Stat-kaarten rij */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="h-6 w-10" />
            </div>
            <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content kaarten */}
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>
    </div>
  )
}
