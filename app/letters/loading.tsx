export default function LettersLoading() {
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

      <main className="container mx-auto space-y-8 px-6 py-8 sm:py-12">
        {/* Title */}
        <div className="space-y-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-9 w-56" />
        </div>

        {/* Letter list */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="border-b bg-muted/30 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton h-5 w-56" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="skeleton h-8 w-20 rounded-md" />
                    <div className="skeleton h-8 w-16 rounded-md" />
                    <div className="skeleton h-8 w-16 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-4/5" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
