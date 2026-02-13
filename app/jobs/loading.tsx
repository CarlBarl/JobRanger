export default function JobsLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="skeleton h-5 w-28" />
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-16" />
            <div className="skeleton h-5 w-12" />
            <div className="skeleton h-5 w-12" />
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="skeleton h-9 w-48" />

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <div className="skeleton h-8 flex-1 rounded-md" />
          <div className="skeleton h-8 flex-1 rounded-md" />
        </div>

        {/* Search bar */}
        <div className="skeleton h-11 w-full rounded-lg" />

        {/* Job cards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-64" />
                <div className="skeleton h-4 w-20" />
              </div>
              <div className="skeleton h-4 w-40" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
