import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getTranslations } from 'next-intl/server'
import { FileText, Search, Sparkles, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const t = await getTranslations('landing')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            {common('appName')}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/auth/signin">
              <Button size="sm" className="rounded-full px-5 text-xs uppercase tracking-wider">
                {common('signIn')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative z-10 container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-fade-up mb-4 text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              AI-Powered Job Matching
            </p>
            <h1 className="animate-fade-up delay-1 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              {t('hero')}
            </h1>
            <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
              {t('subtitle')}
            </p>
            <div className="animate-fade-up delay-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/signin">
                <Button size="lg" className="group rounded-full px-8 text-sm uppercase tracking-wider">
                  {t('getStarted')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="container mx-auto px-6 py-24">
          <div className="grid gap-0 md:grid-cols-3">
            {[
              {
                icon: FileText,
                title: t('features.upload.title'),
                description: t('features.upload.description'),
                step: '01',
              },
              {
                icon: Search,
                title: t('features.search.title'),
                description: t('features.search.description'),
                step: '02',
              },
              {
                icon: Sparkles,
                title: t('features.generate.title'),
                description: t('features.generate.description'),
                step: '03',
              },
            ].map((feature, i) => (
              <div
                key={feature.step}
                className={`animate-fade-up delay-${i + 1} group relative p-8 sm:p-10 ${
                  i < 2 ? 'md:border-r' : ''
                }`}
              >
                <div className="mb-6 flex items-center gap-4">
                  <span className="font-mono text-xs text-muted-foreground">
                    {feature.step}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <feature.icon className="mb-4 h-5 w-5" strokeWidth={1.5} />
                <h3 className="mb-2 text-lg font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex items-center justify-between px-6">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {common('appName')}
          </span>
          <span className="text-xs text-muted-foreground">
            Stockholm, Sverige
          </span>
        </div>
      </footer>
    </main>
  )
}
