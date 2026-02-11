import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { SignOutButton } from '@/components/auth/SignOutButton'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function DashboardHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('common')

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-semibold uppercase tracking-[0.2em] transition-opacity hover:opacity-70"
        >
          {t('appName')}
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider">
              {t('navDashboard')}
            </Button>
          </Link>
          <Link href="/jobs">
            <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider">
              {t('navJobs')}
            </Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider">
              {t('navLetters')}
            </Button>
          </Link>
          <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <LanguageSwitcher />
          {user?.email ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden max-w-[12rem] truncate text-xs text-muted-foreground md:inline">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
