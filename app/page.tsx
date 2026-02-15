import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Sparkles } from 'lucide-react'

export default async function HomePage() {
  const t = await getTranslations('landing')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-background/85 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
            {common('appName')}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <LinkButton href="/auth/signin" size="sm" className="rounded-full px-5 text-xs uppercase tracking-wider">
              {common('signIn')}
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-24 sm:pb-24 sm:pt-28">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="hero-glow absolute inset-0" />
        <div className="pointer-events-none absolute -top-28 left-1/2 h-[30rem] w-[30rem] -translate-x-1/3 rounded-full border border-primary/20 bg-primary/[0.08] blur-3xl" />
        <div className="container relative z-10 mx-auto px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-8">
            <div className="lg:col-span-7">
              <h1 className="animate-fade-up max-w-3xl text-balance text-4xl font-bold leading-[1.02] tracking-[-0.02em] sm:text-5xl lg:text-7xl">
                {t('hero')}
              </h1>
              <p className="animate-fade-up delay-1 mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t('subtitle')}
              </p>
              <div className="animate-fade-up delay-2 mt-9 flex flex-wrap items-center gap-3">
                <LinkButton href="/auth/signin" size="lg" className="group rounded-full px-8 text-sm uppercase tracking-wider">
                  {t('getStarted')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </LinkButton>
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

            <div className="animate-fade-up delay-3 lg:col-span-5">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-foreground/15 bg-background/90 p-5 shadow-[0_20px_55px_-35px_hsl(var(--foreground)/0.6)] sm:p-6">
                <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-3xl border border-primary/20" />
                <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-2xl border border-primary/30 bg-primary/[0.08]" />

                <div className="relative space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">React</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">TypeScript</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Node</span>
                    <span className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground">SQL</span>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-2 w-28 rounded-full bg-foreground/15" />
                        <div className="h-2 w-20 rounded-full bg-foreground/10" />
                      </div>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">4/5</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-foreground/10 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                      <div className="h-1.5 w-16 rounded-full bg-primary/40" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded-full bg-foreground/10" />
                      <div className="h-2 w-11/12 rounded-full bg-foreground/10" />
                      <div className="h-2 w-4/5 rounded-full bg-foreground/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Så funkar det */}
      <section id="how-it-works" className="relative scroll-mt-24 border-y border-foreground/10 bg-muted/[0.35]">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="container relative mx-auto px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('howItWorks')}
          </h2>
          <p className="text-base text-muted-foreground mt-3 max-w-lg">
            {t('howItWorksSubtitle')}
          </p>

          <div className="mt-12 space-y-12 sm:mt-16 sm:space-y-16">
            {/* Step 1 */}
            <article className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/90 p-6 shadow-sm sm:p-8 lg:col-span-6">
                <span className="pointer-events-none absolute right-4 top-1 font-mono text-6xl text-foreground/[0.06] sm:text-7xl">
                  01
                </span>
                <h3 className="relative text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('features.upload.title')}
                </h3>
                <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {t('features.upload.description')}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm sm:p-6 lg:col-span-6">
                <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-2xl border border-primary/25" />
                <div className="relative flex items-center gap-5">
                  <div className="w-[78px] flex-shrink-0 rounded-xl border-2 border-dashed border-border/70 p-3">
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-4/5 rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-3/5 rounded-full bg-foreground/10" />
                      <div className="h-1.5 w-5/6 rounded-full bg-foreground/10" />
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                  <div className="flex flex-1 flex-wrap gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">React</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">TypeScript</span>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Node.js</span>
                    <span className="rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground">SQL</span>
                    <span className="rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground">Docker</span>
                    <span className="rounded-full border border-border/80 bg-background/90 px-3 py-1 text-[11px] text-muted-foreground">Figma</span>
                  </div>
                </div>
              </div>
            </article>

            {/* Step 2 */}
            <article className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="order-2 relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/90 p-6 shadow-sm sm:p-8 lg:order-1 lg:col-span-6">
                <span className="pointer-events-none absolute right-4 top-1 font-mono text-6xl text-foreground/[0.06] sm:text-7xl">
                  02
                </span>
                <h3 className="relative text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('features.search.title')}
                </h3>
                <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {t('features.search.description')}
                </p>
              </div>

              <div className="order-1 relative overflow-hidden rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm sm:p-6 lg:order-2 lg:col-span-6">
                <div className="pointer-events-none absolute -left-12 -top-12 h-24 w-24 rounded-full border border-primary/20" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] p-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-foreground">Frontend-utvecklare</p>
                      <p className="text-[11px] text-muted-foreground">Spotify &middot; Stockholm</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">4/5</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/90 p-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-foreground">Backend-utvecklare</p>
                      <p className="text-[11px] text-muted-foreground">Klarna &middot; Stockholm</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-background/90 p-3 opacity-60">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-foreground">Fullstack-utvecklare</p>
                      <p className="text-[11px] text-muted-foreground">Ericsson &middot; Kista</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* Step 3 */}
            <article className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/90 p-6 shadow-sm sm:p-8 lg:col-span-6">
                <span className="pointer-events-none absolute right-4 top-1 font-mono text-6xl text-foreground/[0.06] sm:text-7xl">
                  03
                </span>
                <h3 className="relative text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('features.generate.title')}
                </h3>
                <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {t('features.generate.description')}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-card p-5 shadow-sm sm:p-6 lg:col-span-6">
                <div className="pointer-events-none absolute -bottom-14 -right-10 h-32 w-32 rounded-3xl border border-primary/20" />
                <div className="relative rounded-xl border border-foreground/10 bg-background/95 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-primary">Personligt brev</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-foreground/10" />
                    <div className="h-2 w-11/12 rounded-full bg-foreground/10" />
                    <div className="h-2 w-5/6 rounded-full bg-foreground/10" />
                    <div className="h-2 w-full rounded-full bg-foreground/10" />
                    <div className="h-2 w-3/4 rounded-full bg-foreground/10" />
                  </div>
                  <span className="mt-5 inline-flex h-7 items-center rounded-md border border-border/80 bg-muted/40 px-3 text-[11px] font-medium text-muted-foreground">Kopiera</span>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-14 flex justify-center sm:mt-20">
            <LinkButton href="/auth/signin" size="lg" className="group rounded-full px-8 text-sm uppercase tracking-wider">
              {t('getStarted')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </LinkButton>
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
