export function StatsSkeleton() {
  return (
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
  )
}

export function DocumentsSkeleton() {
  return (
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
  )
}

export function SkillsSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="skeleton h-4 w-24" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-20" />
        ))}
      </div>
    </div>
  )
}

export function RecentJobsSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="skeleton h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-4 w-3/4" />
            <div className="flex gap-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
