import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

interface OnboardingPageProps {
  searchParams: Promise<{ debug?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/auth/signin')
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)
  const { debug } = await searchParams
  const isReplay = Boolean(user.onboardingGuideResetAt)

  // Already completed onboarding — go to dashboard
  // In dev mode, ?debug=true bypasses this redirect for testing
  const isDebug = process.env.NODE_ENV === 'development' && debug === 'true'
  if (user.onboardingCompleted && !isDebug && !isReplay) {
    redirect('/dashboard')
  }

  const existingCvDocument = isReplay
    ? await prisma.document.findFirst({
        where: { userId: user.id, type: 'cv' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
    : null

  return (
    <OnboardingWizard
      userName={user.name}
      isReplay={isReplay}
      existingCvDocumentId={existingCvDocument?.id ?? null}
    />
  )
}
