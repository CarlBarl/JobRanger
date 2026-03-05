'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  footerText?: string
  footerHref?: string
  footerLabel?: string
}

export function AuthShell({
  title,
  description,
  children,
  footerText,
  footerHref,
  footerLabel,
}: AuthShellProps) {
  const common = useTranslations('common')
  const landing = useTranslations('landing')
  const steps = [
    {
      step: '01',
      title: landing('features.upload.title'),
      description: landing('features.upload.description'),
    },
    {
      step: '02',
      title: landing('features.search.title'),
      description: landing('features.search.description'),
    },
    {
      step: '03',
      title: landing('features.generate.title'),
      description: landing('features.generate.description'),
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--muted))_0,transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--muted))_0,transparent_36%)]" />
      <div className="absolute inset-0 dot-grid opacity-40" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="container mx-auto flex items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.24em] transition-opacity hover:opacity-70"
          >
            {common('appName')}
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="container mx-auto flex flex-1 items-center px-4 pb-10 pt-4 sm:px-6">
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-12">
            <section className="hidden lg:flex lg:flex-col lg:justify-center">
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                {common('metaEyebrow')}
              </p>
              <h1 className="max-w-lg text-4xl font-bold leading-[1.05] tracking-tight xl:text-5xl">
                {landing('hero')}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground xl:text-lg">
                {landing('subtitle')}
              </p>

              <div className="mt-8 grid gap-3">
                {steps.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-2xl border bg-background/80 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {step.step}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <p className="text-sm font-semibold tracking-tight">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <Card className="w-full border bg-background/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur-sm">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {children}
                {footerHref && footerLabel ? (
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    {footerText ? `${footerText} ` : null}
                    <Link href={footerHref} className="font-medium text-primary hover:underline">
                      {footerLabel}
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
