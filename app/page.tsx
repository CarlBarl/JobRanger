import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Sparkles } from 'lucide-react'

export default async function HomePage() {
  const t = await getTranslations('landing')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-sm">
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
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="hero-glow absolute inset-0" />
        <div className="relative z-10 container mx-auto px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="animate-fade-up text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {t('hero')}
            </h1>
            <p className="animate-fade-up delay-1 mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('subtitle')}
            </p>
            <div className="animate-fade-up delay-2 mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/auth/signin">
                <Button size="lg" className="group rounded-full px-8 text-sm uppercase tracking-wider">
                  {t('getStarted')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-primary/30 px-8 text-sm uppercase tracking-wider text-primary hover:bg-primary/10"
                >
                  {t('howItWorks')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Så funkar det */}
      <section id="how-it-works" className="scroll-mt-24 border-t">
        <div className="container mx-auto px-6 py-24 sm:py-32">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            {t('howItWorks')}
          </h2>

          {/* Step 1: Upload */}
          <div className="mt-14 grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <span className="font-mono text-sm text-muted-foreground/40">01</span>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('features.upload.title')}
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {t('features.upload.description')}
              </p>
            </div>
            <div>
              <div className="rounded-2xl border bg-card p-5 sm:p-6">
                <div className="flex items-center gap-5">
                  {/* Miniature CV document */}
                  <div className="w-[72px] flex-shrink-0 rounded-lg border-2 border-dashed border-border/60 p-3">
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-3/4 rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-full rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/30" />
                  {/* Extracted skill tags */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">React</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">TypeScript</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Node.js</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">SQL</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">Docker</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">Figma</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Search (reversed layout) */}
          <div className="mt-20 grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div className="md:order-2">
              <span className="font-mono text-sm text-muted-foreground/40">02</span>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('features.search.title')}
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {t('features.search.description')}
              </p>
            </div>
            <div className="md:order-1">
              {/* Miniature job listing cards */}
              <div className="rounded-2xl border bg-card p-4 space-y-2.5">
                <div className="rounded-xl border-2 border-primary/20 bg-primary/[0.02] p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium">Frontend-utvecklare</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">Spotify &middot; Stockholm</div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">4/5</span>
                  </div>
                </div>
                <div className="rounded-xl border p-3.5 opacity-50">
                  <div className="text-sm font-medium">Backend-utvecklare</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Klarna &middot; Stockholm</div>
                </div>
                <div className="rounded-xl border p-3.5 opacity-30">
                  <div className="text-sm font-medium">Fullstack-utvecklare</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">Ericsson &middot; Kista</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Generate */}
          <div className="mt-20 grid items-center gap-8 md:grid-cols-2 md:gap-16">
            <div>
              <span className="font-mono text-sm text-muted-foreground/40">03</span>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('features.generate.title')}
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                {t('features.generate.description')}
              </p>
            </div>
            <div>
              {/* Miniature generated letter */}
              <div className="rounded-2xl border bg-card p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-primary">Personligt brev</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-4/5 rounded-full bg-foreground/10" />
                  <div className="h-2 w-full rounded-full bg-foreground/10" />
                  <div className="h-2 w-[90%] rounded-full bg-foreground/10" />
                  <div className="h-2 w-full rounded-full bg-foreground/10" />
                  <div className="h-2 w-3/5 rounded-full bg-foreground/10" />
                </div>
                <div className="mt-5">
                  <span className="rounded-md border px-3 py-1.5 text-[11px] font-medium text-muted-foreground">Kopiera</span>
                </div>
              </div>
            </div>
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
