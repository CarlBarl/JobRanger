import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { CvStudioClient } from '@/components/cv-studio/CvStudioClient'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function CvStudioPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)

  if (!user.onboardingCompleted) {
    redirect('/onboarding')
  }

  const [cvDocuments, savedJobs] = await Promise.all([
    prisma.document.findMany({
      where: { userId: user.id, type: 'cv' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        parsedContent: true,
      },
    }),
    prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: 'desc' },
      select: {
        afJobId: true,
        headline: true,
        employer: true,
        location: true,
      },
      take: 50,
    }),
  ])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <CvStudioClient
          userTier={user.tier}
          initialCvDocuments={cvDocuments.map((doc) => ({
            id: doc.id,
            createdAt: doc.createdAt.toISOString(),
            parsedContent: doc.parsedContent,
          }))}
          savedJobs={savedJobs.map((job) => ({
            afJobId: job.afJobId,
            headline: job.headline || `Job ${job.afJobId}`,
            employer: job.employer || null,
            location: job.location || null,
          }))}
        />
      </main>
    </div>
  )
}
