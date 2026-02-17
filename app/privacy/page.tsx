import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const SECTION_KEYS = [
  'dataCollected',
  'howWeUse',
  'thirdParty',
  'retention',
  'rights',
  'deletion',
  'cookies',
  'contact',
  'changes',
] as const

export default async function PrivacyPage() {
  const t = await getTranslations('privacy')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">{common('appName')}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>

          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">{t('effectiveDate')}</p>
          </header>

          <div className="space-y-8">
            {SECTION_KEYS.map((key) => (
              <section key={key} className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {t(`sections.${key}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(`sections.${key}.body`)}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
