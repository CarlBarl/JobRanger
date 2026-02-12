import { createClient } from '@/lib/supabase/server'
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/90 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/dashboard"
          className="text-[15px] font-semibold tracking-tight text-foreground transition-colors duration-200 hover:text-muted-foreground"
        >
          {t('appName')}
        </Link>
        <nav className="flex items-center gap-0.5">
          <Link
            href="/dashboard"
            className="link-underline rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {t('navDashboard')}
          </Link>
          <Link
            href="/jobs"
            className="link-underline rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {t('navJobs')}
          </Link>
          <Link
            href="/letters"
            className="link-underline rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            {t('navLetters')}
          </Link>
          <div className="mx-2 hidden h-3.5 w-px bg-border/60 sm:block" />
          <LanguageSwitcher />
          {user?.email ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[10rem] truncate text-[13px] text-muted-foreground/80 md:inline">
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
