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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">{common('appName')}</span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/auth/signin">
              <Button>{common('signIn')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold mb-6">
          {t('hero')}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
        <Link href="/auth/signin">
          <Button size="lg">{t('getStarted')}</Button>
        </Link>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.upload.title')}</h3>
            <p className="text-muted-foreground">{t('features.upload.description')}</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.search.title')}</h3>
            <p className="text-muted-foreground">{t('features.search.description')}</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.generate.title')}</h3>
            <p className="text-muted-foreground">{t('features.generate.description')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
