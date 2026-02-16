import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardGuideController } from '@/components/dashboard/guide/DashboardGuideController'
import { DashboardStatsSection } from '@/components/dashboard/DashboardStatsSection'
import { DashboardDocumentsSection } from '@/components/dashboard/DashboardDocumentsSection'
import { DashboardSkillsSection } from '@/components/dashboard/DashboardSkillsSection'
import { DashboardRecentJobsSection } from '@/components/dashboard/DashboardRecentJobsSection'
import { StatsSkeleton, DocumentsSkeleton, SkillsSkeleton, RecentJobsSkeleton } from '@/components/dashboard/skeletons'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { DebugChat } from '@/components/dashboard/DebugChat'
import { GEMINI_MODEL } from '@/lib/services/gemini'

const DEBUG_EMAIL = process.env.DEBUG_EMAIL

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)

  // Redirect to onboarding if not completed
  if (!user.onboardingCompleted) {
    redirect('/onboarding')
  }

  const dashboardGuideState = {
    dashboardGuidePromptedAt: user.dashboardGuidePromptedAt?.toISOString() ?? null,
    dashboardGuideCompletedAt: user.dashboardGuideCompletedAt?.toISOString() ?? null,
    dashboardGuideDismissedAt: user.dashboardGuideDismissedAt?.toISOString() ?? null,
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <DashboardGuideController initialState={dashboardGuideState} />
      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStatsSection
            userId={user.id}
            userName={user.name}
            userEmail={user.email}
          />
        </Suspense>

        <Suspense fallback={<DocumentsSkeleton />}>
          <DashboardDocumentsSection userId={user.id} />
        </Suspense>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
          <Suspense fallback={<SkillsSkeleton />}>
            <DashboardSkillsSection userId={user.id} />
          </Suspense>

          <Suspense fallback={<RecentJobsSkeleton />}>
            <DashboardRecentJobsSection userId={user.id} />
          </Suspense>
        </div>
      </main>

      {authUser.email === DEBUG_EMAIL && <DebugChat modelName={GEMINI_MODEL} />}
    </div>
  )
}
