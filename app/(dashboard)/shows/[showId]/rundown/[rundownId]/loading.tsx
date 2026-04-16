// Skeleton die verschijnt tijdens navigatie naar de rundown-editor.
// Direct zichtbaar via Next.js loading.tsx, geen witte flits meer.

export default function RundownEditorLoading() {
  return (
    <div className="animate-pulse">
      {/* Topbar */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-muted rounded" />
          <div className="h-6 w-56 bg-muted rounded" />
          <div className="flex-1" />
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-7 w-28 bg-muted rounded-md" />
          <div className="h-7 w-24 bg-muted rounded-md" />
          <div className="h-7 w-24 bg-muted rounded-md" />
          <div className="h-7 w-20 bg-muted rounded-md" />
        </div>
      </div>

      {/* Lijst van cues */}
      <div className="px-4 py-6 space-y-2 max-w-6xl">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-border/60 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="h-4 w-4 bg-muted rounded" />
            <div className="h-4 w-8 bg-muted rounded" />
            <div className="flex-1 h-5 bg-muted rounded" style={{ width: `${40 + (i * 7) % 50}%` }} />
            <div className="h-6 w-20 bg-muted rounded hidden sm:block" />
            <div className="h-5 w-14 bg-muted rounded" />
            <div className="h-6 w-24 bg-muted rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
