import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
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

  // Already completed onboarding — go to dashboard
  // In dev mode, ?debug=true bypasses this redirect for testing
  const isDebug = process.env.NODE_ENV === 'development' && debug === 'true'
  if (user.onboardingCompleted && !isDebug) {
    redirect('/dashboard')
  }

  return <OnboardingWizard userName={user.name} />
}
