import { UserTier, UsageEventType } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

type ProOnboardingStepId = 'visitCvStudio' | 'useCvAi' | 'generateLetter' | 'complete'

export type ProOnboardingProgress = {
  isEligible: boolean
  isCompleted: boolean
  completedAt: string | null
  dismissedAt: string | null
  activatedAt: string | null
  completedSteps: number
  totalSteps: number
  nextStepId: ProOnboardingStepId
  nextHref: '/cv-studio' | '/jobs' | '/dashboard'
  steps: {
    visitCvStudio: boolean
    useCvAi: boolean
    generateLetter: boolean
  }
}

export type ProOnboardingUserState = {
  id: string
  tier: UserTier
  proActivatedAt: Date | null
  proOnboardingDismissedAt: Date | null
  proOnboardingCompletedAt: Date | null
  proOnboardingCvStudioVisitedAt: Date | null
}

const TOTAL_STEPS = 3

function createDefaultProgress(state: ProOnboardingUserState): ProOnboardingProgress {
  return {
    isEligible: false,
    isCompleted: !!state.proOnboardingCompletedAt,
    completedAt: state.proOnboardingCompletedAt?.toISOString() ?? null,
    dismissedAt: state.proOnboardingDismissedAt?.toISOString() ?? null,
    activatedAt: state.proActivatedAt?.toISOString() ?? null,
    completedSteps: 0,
    totalSteps: TOTAL_STEPS,
    nextStepId: 'complete',
    nextHref: '/dashboard',
    steps: {
      visitCvStudio: false,
      useCvAi: false,
      generateLetter: false,
    },
  }
}

function getNextStep(steps: ProOnboardingProgress['steps']) {
  if (!steps.visitCvStudio) {
    return { nextStepId: 'visitCvStudio' as const, nextHref: '/cv-studio' as const }
  }
  if (!steps.useCvAi) {
    return { nextStepId: 'useCvAi' as const, nextHref: '/cv-studio' as const }
  }
  if (!steps.generateLetter) {
    return { nextStepId: 'generateLetter' as const, nextHref: '/jobs' as const }
  }
  return { nextStepId: 'complete' as const, nextHref: '/dashboard' as const }
}

function isEligibleForProOnboarding(state: ProOnboardingUserState) {
  return state.tier === UserTier.PRO && !!state.proActivatedAt && !state.proOnboardingCompletedAt
}

export async function getProOnboardingProgress(
  state: ProOnboardingUserState,
  options?: { syncCompletion?: boolean }
): Promise<ProOnboardingProgress> {
  if (!isEligibleForProOnboarding(state)) {
    return createDefaultProgress(state)
  }

  const activatedAt = state.proActivatedAt as Date
  const [usedCvAiCount, generatedLetterCount] = await Promise.all([
    prisma.usageEvent.count({
      where: {
        userId: state.id,
        type: { in: [UsageEventType.CV_FEEDBACK, UsageEventType.CV_EDIT] },
        createdAt: { gte: activatedAt },
      },
    }),
    prisma.usageEvent.count({
      where: {
        userId: state.id,
        type: UsageEventType.GENERATE_LETTER,
        createdAt: { gte: activatedAt },
      },
    }),
  ])

  const steps = {
    visitCvStudio: !!state.proOnboardingCvStudioVisitedAt,
    useCvAi: usedCvAiCount > 0,
    generateLetter: generatedLetterCount > 0,
  }
  const completedSteps = Number(steps.visitCvStudio) + Number(steps.useCvAi) + Number(steps.generateLetter)

  let completedAt = state.proOnboardingCompletedAt
  if (options?.syncCompletion && completedSteps === TOTAL_STEPS && !completedAt) {
    const updated = await prisma.user.update({
      where: { id: state.id },
      data: { proOnboardingCompletedAt: new Date() },
      select: { proOnboardingCompletedAt: true },
    })
    completedAt = updated.proOnboardingCompletedAt
  }

  const next = getNextStep(steps)

  return {
    isEligible: true,
    isCompleted: !!completedAt,
    completedAt: completedAt?.toISOString() ?? null,
    dismissedAt: state.proOnboardingDismissedAt?.toISOString() ?? null,
    activatedAt: activatedAt.toISOString(),
    completedSteps,
    totalSteps: TOTAL_STEPS,
    nextStepId: next.nextStepId,
    nextHref: next.nextHref,
    steps,
  }
}
