'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'

type BackToJobsLinkProps = {
  fallbackHref?: string
  className?: string
  children: ReactNode
}

function isUnmodifiedLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  )
}

function canGoBack() {
  const state = window.history.state as unknown
  if (!state || typeof state !== 'object') return false
  const idx = (state as { idx?: unknown }).idx
  return typeof idx === 'number' && idx > 0
}

export function BackToJobsLink({
  fallbackHref = '/jobs',
  className,
  children,
}: BackToJobsLinkProps) {
  const router = useRouter()

  return (
    <Link
      href={fallbackHref}
      className={className}
      onClick={(event) => {
        if (!isUnmodifiedLeftClick(event)) return
        event.preventDefault()
        if (canGoBack()) {
          router.back()
        } else {
          router.push(fallbackHref)
        }
      }}
    >
      {children}
    </Link>
  )
}

