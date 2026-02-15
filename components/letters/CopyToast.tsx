'use client'

type CopyToastProps = {
  copiedId: string | null
  label: string
}

export function CopyToast({ copiedId, label }: CopyToastProps) {
  if (!copiedId) return null

  return (
    <div
      key={copiedId}
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center pointer-events-none animate-fade-up"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 shadow-lg">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-primary">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
          <path d="M5 8.5L7 10.5L11 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  )
}
