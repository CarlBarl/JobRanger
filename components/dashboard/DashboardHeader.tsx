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
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-xl font-semibold">
          {t('appName')}
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/jobs">
            <Button variant="ghost">Jobs</Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost">Letters</Button>
          </Link>
          <LanguageSwitcher />
          {user?.email ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <SignOutButton />
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
