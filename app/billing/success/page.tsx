import Link from 'next/link'
import { redirect } from 'next/navigation'
import { UserTier } from '@/generated/prisma/client'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { getMonthlyQuotaLimit, USAGE_EVENT_TYPES } from '@/lib/security/monthly-quota'
import { getProOnboardingProgress } from '@/lib/pro-onboarding'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SearchParams = {
  checkout?: string | string[]
  session_id?: string | string[]
}

function readSearchParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  if (Array.isArray(value) && value[0]) return value[0]
  return null
}

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const t = await getTranslations('billingSuccess')
  const params = (await searchParams) ?? {}
  const checkoutState = readSearchParam(params.checkout)
  const sessionId = readSearchParam(params.session_id)

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/auth/signin?next=%2Fbilling%2Fsuccess')
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)
  const isPro = user.tier === UserTier.PRO
  const proOnboarding = await getProOnboardingProgress(
    {
      id: user.id,
      tier: user.tier,
      proActivatedAt: user.proActivatedAt,
      proOnboardingDismissedAt: user.proOnboardingDismissedAt,
      proOnboardingCompletedAt: user.proOnboardingCompletedAt,
      proOnboardingCvStudioVisitedAt: user.proOnboardingCvStudioVisitedAt,
    },
    { syncCompletion: true }
  )

  const proGenerateLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.GENERATE_LETTER)
  const proSkillsExtractLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.SKILLS_EXTRACT)
  const proCvFeedbackLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.CV_FEEDBACK)
  const proCvEditLimit = getMonthlyQuotaLimit(UserTier.PRO, USAGE_EVENT_TYPES.CV_EDIT)

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {isPro ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('title')}</CardTitle>
              <CardDescription>{t('subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-sm font-semibold text-foreground">{t('featuresTitle')}</h2>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li>{t('featureLetters', { count: proGenerateLimit })}</li>
                  <li>{t('featureSkills', { count: proSkillsExtractLimit })}</li>
                  <li>{t('featureCvFeedback', { count: proCvFeedbackLimit })}</li>
                  <li>{t('featureCvEdit', { count: proCvEditLimit })}</li>
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-sm font-semibold text-foreground">{t('guideTitle')}</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>{t('guideStep1')}</li>
                  <li>{t('guideStep2')}</li>
                  <li>{t('guideStep3')}</li>
                </ol>
              </div>

              {proOnboarding.isEligible ? (
                <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-4">
                  <h2 className="text-sm font-semibold text-foreground">{t('activationTitle')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('activationProgress', {
                      completed: proOnboarding.completedSteps,
                      total: proOnboarding.totalSteps,
                    })}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li
                      className={
                        proOnboarding.steps.visitCvStudio ? 'text-emerald-700' : 'text-muted-foreground'
                      }
                    >
                      {proOnboarding.steps.visitCvStudio ? '✓ ' : '○ '}
                      {t('activationStepVisitCvStudio')}
                    </li>
                    <li
                      className={
                        proOnboarding.steps.useCvAi ? 'text-emerald-700' : 'text-muted-foreground'
                      }
                    >
                      {proOnboarding.steps.useCvAi ? '✓ ' : '○ '}
                      {t('activationStepUseCvAi')}
                    </li>
                    <li
                      className={
                        proOnboarding.steps.generateLetter ? 'text-emerald-700' : 'text-muted-foreground'
                      }
                    >
                      {proOnboarding.steps.generateLetter ? '✓ ' : '○ '}
                      {t('activationStepGenerateLetter')}
                    </li>
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/dashboard">{t('goDashboard')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={proOnboarding.isEligible ? proOnboarding.nextHref : '/cv-studio'}>
                    {proOnboarding.isCompleted ? t('continueDone') : t('continueActivation')}
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/settings">{t('manageBilling')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t('pendingTitle')}</CardTitle>
              <CardDescription>{t('pendingDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('pendingHint')}</p>
              {checkoutState === 'success' && sessionId ? (
                <p className="text-xs text-muted-foreground">
                  {t('sessionReference', { sessionId })}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/billing/success?checkout=success">{t('refreshStatus')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard">{t('goDashboard')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
