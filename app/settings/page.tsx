import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { LetterGuidanceSettings } from '@/components/dashboard/LetterGuidanceSettings'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/auth/signin')
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)

  if (!user.onboardingCompleted) {
    redirect('/onboarding')
  }

  const t = await getTranslations('settings')

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-xl border bg-card p-5">
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('subtitle')}</p>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="text-[13px] font-medium text-foreground/70">{t('languageTitle')}</h2>
          <p className="mt-1 text-[12px] text-muted-foreground">{t('languageDescription')}</p>
          <div
            className="mt-3 inline-flex rounded-md border border-border/60 bg-background p-1"
            data-guide-id="settings-language-switcher"
          >
            <LanguageSwitcher />
          </div>
        </section>

        <LetterGuidanceSettings initialValue={user.letterGuidanceDefault ?? null} />
      </main>
    </div>
  )
}
