import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { NavLinks } from '@/components/dashboard/NavLinks'
import { GuideReplayControl } from '@/components/dashboard/GuideReplayControl'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('common')

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md"
      >
        <div className="container mx-auto flex min-w-0 items-center justify-between px-4 py-3 sm:px-6" data-guide-id="top-nav">
          <Link
            href="/dashboard"
            data-guide-id="top-nav-brand"
            className="text-[15px] font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-muted-foreground"
          >
            {t('appName')}
          </Link>
          <nav className="flex min-w-0 items-center gap-0.5">
            <div data-guide-id="top-nav-links">
              <NavLinks />
            </div>
            <div className="mx-2 hidden h-3.5 w-px bg-border/60 sm:block" />
            <div className="flex items-center gap-2" data-guide-id="top-nav-actions">
              {user?.email ? (
                <>
                  <GuideReplayControl />
                  <SignOutButton />
                </>
              ) : null}
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}
