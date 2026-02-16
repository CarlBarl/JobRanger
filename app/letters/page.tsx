import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { isValidAfJobId } from '@/lib/security/sanitize'
import { LettersList } from '@/components/letters/LettersList'

interface LettersPageProps {
  searchParams: Promise<{ jobId?: string }>
}

export default async function LettersPage({ searchParams }: LettersPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { jobId } = await searchParams
  const activeJobId = jobId && isValidAfJobId(jobId) ? jobId : null

  const letters = await prisma.generatedLetter.findMany({
    where: {
      userId: user.id,
      ...(activeJobId ? { afJobId: activeJobId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      afJobId: true,
      jobTitle: true,
      content: true,
      createdAt: true,
      savedJob: {
        select: {
          headline: true,
          employer: true,
          location: true,
          deadline: true,
          webpageUrl: true,
        },
      },
    },
  })

  const initialLetters = letters.map((letter) => ({
    id: letter.id,
    afJobId: letter.afJobId,
    jobTitle: letter.jobTitle ?? null,
    content: letter.content,
    createdAt: letter.createdAt.toISOString(),
    savedJob: letter.savedJob
      ? {
          headline: letter.savedJob.headline ?? null,
          employer: letter.savedJob.employer ?? null,
          location: letter.savedJob.location ?? null,
          deadline: letter.savedJob.deadline ?? null,
          webpageUrl: letter.savedJob.webpageUrl ?? null,
        }
      : null,
  }))

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto space-y-8 px-6 py-8 sm:py-12">
        <LettersList initialLetters={initialLetters} activeJobId={activeJobId ?? undefined} />
      </main>
    </div>
  )
}
