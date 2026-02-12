import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { SkillsEditor } from '@/components/dashboard/SkillsEditor'
import { SavedJobsList } from '@/components/dashboard/SavedJobsList'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DebugChat } from '@/components/dashboard/DebugChat'
import { GEMINI_MODEL } from '@/lib/services/gemini'
import { resolveDocumentAccessUrl } from '@/lib/storage'

const DEBUG_EMAIL = process.env.DEBUG_EMAIL

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  const t = await getTranslations('dashboard')

  if (!authUser?.email) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)

  const cvDocument = await prisma.document.findFirst({
    where: { userId: user.id, type: 'cv' },
    orderBy: { createdAt: 'desc' },
  })

  const personalLetter = await prisma.document.findFirst({
    where: { userId: user.id, type: 'personal_letter' },
    orderBy: { createdAt: 'desc' },
  })

  const [savedJobsCount, lettersCount, recentSavedJobs] = await Promise.all([
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.generatedLetter.count({ where: { userId: user.id } }),
    prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: 'desc' },
      take: 3,
    }),
  ])

  const savedJobsData = await Promise.all(
    recentSavedJobs.map(async (saved) => {
      try {
        const job = await getJobById(saved.afJobId)
        return {
          afJobId: saved.afJobId,
          headline: job.headline || saved.headline || 'Untitled',
          employer: job.employer?.name || saved.employer || '',
          location: job.workplace_address?.municipality || job.workplace_address?.region || saved.location || '',
          occupation: job.occupation?.label || saved.occupation || '',
          deadline: job.application_deadline || saved.deadline || null,
          webpageUrl: job.webpage_url || saved.webpageUrl || null,
          isStale: false,
        }
      } catch {
        // AF API failed — use cached data from DB
        return {
          afJobId: saved.afJobId,
          headline: saved.headline || `Jobb ${saved.afJobId.slice(0, 8)}`,
          employer: saved.employer || '',
          location: saved.location || '',
          occupation: saved.occupation || '',
          deadline: saved.deadline || null,
          webpageUrl: saved.webpageUrl || null,
          isStale: true,
        }
      }
    })
  )

  const validSavedJobs = savedJobsData

  const [cvAccessUrl, personalLetterAccessUrl] = await Promise.all([
    resolveDocumentAccessUrl(supabase, cvDocument?.fileUrl),
    resolveDocumentAccessUrl(supabase, personalLetter?.fileUrl),
  ])

  const serializedCv = cvDocument
    ? {
        id: cvDocument.id,
        createdAt: cvDocument.createdAt.toISOString(),
        parsedContent: cvDocument.parsedContent,
        fileUrl: cvAccessUrl,
        skills: cvDocument.skills as string[] | null,
      }
    : null

  const serializedLetter = personalLetter
    ? {
        id: personalLetter.id,
        createdAt: personalLetter.createdAt.toISOString(),
        parsedContent: personalLetter.parsedContent,
        fileUrl: personalLetterAccessUrl,
        skills: personalLetter.skills as string[] | null,
      }
    : null

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Hero: name + stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
              {user.name || user.email}
            </h1>
            {user.name && (
              <p className="mt-0.5 text-[13px] text-muted-foreground/80">{user.email}</p>
            )}
          </div>
          <div className="flex gap-8">
            <Link
              href="/jobs"
              className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
            >
              <span className="text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{savedJobsCount}</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                {t('jobsSaved')}
              </span>
            </Link>
            <Link
              href="/letters"
              className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
            >
              <span className="text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{lettersCount}</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                {t('lettersGenerated')}
              </span>
            </Link>
          </div>
        </div>

        {/* Documents */}
        <DashboardClient
          cvDocument={serializedCv}
          personalLetter={serializedLetter}
          cvUploadComponent={<FileUpload />}
          personalLetterUploadComponent={<PersonalLetterUpload />}
        />

        {/* Skills */}
        {serializedCv && (
          <SkillsEditor
            skills={serializedCv.skills || []}
            documentId={serializedCv.id}
          />
        )}

        {/* Saved Jobs */}
        <SavedJobsList
          jobs={validSavedJobs}
          totalCount={savedJobsCount}
        />
      </main>

      {authUser.email === DEBUG_EMAIL && <DebugChat modelName={GEMINI_MODEL} />}
    </div>
  )
}
