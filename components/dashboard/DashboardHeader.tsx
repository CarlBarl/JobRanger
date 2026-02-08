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
    <header className="border-b">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard" className="text-lg font-semibold sm:text-xl">
          {t('appName')}
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              {t('navJobs')}
            </Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost" size="sm">
              {t('navLetters')}
            </Button>
          </Link>
          <LanguageSwitcher />
          {user?.email ? (
            <div className="flex min-w-0 items-center gap-2 sm:ml-1">
              <span className="hidden max-w-[14rem] truncate text-sm text-muted-foreground md:inline">
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
