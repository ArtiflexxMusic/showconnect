export default function ShowLoading() {
  return (
    <div className="max-w-3xl mx-auto animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-20 bg-muted rounded mb-5" />

      {/* Show header */}
      <div className="mb-7">
        <div className="h-9 w-64 bg-muted rounded mb-3" />
        <div className="flex items-center gap-4 mt-2">
          <div className="h-4 w-28 bg-muted rounded" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/40">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-24 bg-muted rounded-md" />
          <div className="h-8 w-20 bg-muted rounded-md" />
        </div>
      </div>

      {/* Rundowns sectie */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-8 w-36 bg-muted rounded-md" />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="border border-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="h-7 w-7 bg-muted rounded" />
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <div className="h-8 w-20 bg-muted rounded-md" />
              <div className="h-8 w-20 bg-muted rounded-md" />
              <div className="h-8 w-20 bg-muted rounded-md" />
              <div className="h-8 w-20 bg-muted rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
