export function StatsSkeleton() {
  return (
    <div className="rounded-2xl border border-primary/[0.08] bg-gradient-to-br from-primary/[0.03] to-transparent p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="skeleton h-7 w-48" />
          <div className="skeleton h-4 w-32" />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <div className="skeleton h-[52px] w-32 rounded-xl sm:w-36" />
          <div className="skeleton h-[52px] w-32 rounded-xl sm:w-36" />
        </div>
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
