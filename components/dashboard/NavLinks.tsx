'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'navDashboard', guideId: 'top-nav-dashboard' },
  { href: '/jobs', labelKey: 'navJobs', guideId: 'top-nav-jobs' },
] as const

export function NavLinks() {
  const pathname = usePathname()
  const t = useTranslations('common')

  return (
    <>
      {NAV_ITEMS.map(({ href, labelKey, guideId }) => {
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            data-guide-id={guideId}
            className={cn(
              'nav-link relative rounded-md px-1.5 py-1.5 sm:px-3 text-[13px] font-medium transition-all duration-150',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(labelKey)}
            {/* Active indicator bar */}
            <span
              className={cn(
                'absolute -bottom-[13px] left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-primary transition-all duration-200',
                isActive ? 'w-4 opacity-100' : 'w-0 opacity-0'
              )}
            />
          </Link>
        )
      })}
    </>
  )
}
