'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'navDashboard' },
  { href: '/jobs', labelKey: 'navJobs' },
  { href: '/letters', labelKey: 'navLetters' },
] as const

export function NavLinks() {
  const pathname = usePathname()
  const t = useTranslations('common')

  return (
    <>
      {NAV_ITEMS.map(({ href, labelKey }) => {
        const isActive =
          href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'nav-link relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-150',
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
