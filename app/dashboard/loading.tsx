export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Name + stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="flex gap-6">
            <div className="skeleton h-6 w-20" />
            <div className="skeleton h-6 w-20" />
          </div>
        </div>

        {/* Document cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-4 w-28" />
          </div>
        </div>

        {/* Skills */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="skeleton h-4 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-7 w-20" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
