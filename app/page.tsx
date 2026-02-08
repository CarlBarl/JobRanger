import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations('landing')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-4">
          <span className="text-lg font-bold sm:text-xl">{common('appName')}</span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/auth/signin">
              <Button size="sm">{common('signIn')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 text-center sm:py-24">
        <h1 className="mb-4 text-3xl font-bold leading-tight sm:mb-6 sm:text-5xl">
          {t('hero')}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-xl">
          {t('subtitle')}
        </p>
        <Link href="/auth/signin">
          <Button size="lg" className="w-full sm:w-auto">
            {t('getStarted')}
          </Button>
        </Link>
      </section>

      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="p-4 text-center sm:p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.upload.title')}</h3>
            <p className="text-muted-foreground">{t('features.upload.description')}</p>
          </div>
          <div className="p-4 text-center sm:p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.search.title')}</h3>
            <p className="text-muted-foreground">{t('features.search.description')}</p>
          </div>
          <div className="p-4 text-center sm:p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.generate.title')}</h3>
            <p className="text-muted-foreground">{t('features.generate.description')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
