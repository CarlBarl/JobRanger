import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { SkillsEditor } from '@/components/dashboard/SkillsEditor'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
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

  // Get user's CV
  const cvDocument = await prisma.document.findFirst({
    where: { userId: user.id, type: 'cv' },
    orderBy: { createdAt: 'desc' },
  })

  // Get user's Personal Letter
  const personalLetter = await prisma.document.findFirst({
    where: { userId: user.id, type: 'personal_letter' },
    orderBy: { createdAt: 'desc' },
  })

  // Get counts
  const [savedJobsCount, lettersCount] = await Promise.all([
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.generatedLetter.count({ where: { userId: user.id } }),
  ])

  const [cvAccessUrl, personalLetterAccessUrl] = await Promise.all([
    resolveDocumentAccessUrl(supabase, cvDocument?.fileUrl),
    resolveDocumentAccessUrl(supabase, personalLetter?.fileUrl),
  ])

  // Serialize documents for client component
  const serializedCv = cvDocument
    ? {
        id: cvDocument.id,
        createdAt: cvDocument.createdAt.toISOString().slice(0, 10),
        parsedContent: cvDocument.parsedContent,
        fileUrl: cvAccessUrl,
        skills: cvDocument.skills as string[] | null,
      }
    : null

  const serializedLetter = personalLetter
    ? {
        id: personalLetter.id,
        createdAt: personalLetter.createdAt.toISOString().slice(0, 10),
        parsedContent: personalLetter.parsedContent,
        fileUrl: personalLetterAccessUrl,
        skills: personalLetter.skills as string[] | null,
      }
    : null

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-6 py-8 sm:py-12">
        {/* Welcome + inline stats */}
        <div className="animate-fade-up mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t('welcome', { name: '' }).trim()}
            </p>
            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
              {user.name || user.email}
            </h1>
          </div>
          <div className="flex gap-6">
            <Link
              href="/jobs"
              className="group text-right transition-opacity hover:opacity-70"
            >
              <p className="text-2xl font-bold tracking-tight">{savedJobsCount}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('jobsSaved')}
              </p>
            </Link>
            <div className="w-px bg-border" />
            <Link
              href="/letters"
              className="group text-right transition-opacity hover:opacity-70"
            >
              <p className="text-2xl font-bold tracking-tight">{lettersCount}</p>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('lettersGenerated')}
              </p>
            </Link>
          </div>
        </div>

        {/* Documents section */}
        <div className="animate-fade-up delay-1">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <DashboardClient
              cvDocument={serializedCv}
              personalLetter={serializedLetter}
              cvUploadComponent={<FileUpload />}
              personalLetterUploadComponent={<PersonalLetterUpload />}
            />
          </div>
        </div>

        {/* Skills Editor - Full width below */}
        {serializedCv && (
          <div className="animate-fade-up delay-2 mt-8">
            <SkillsEditor
              skills={serializedCv.skills || []}
              documentId={serializedCv.id}
            />
          </div>
        )}
      </main>

      {authUser.email === DEBUG_EMAIL && <DebugChat modelName={GEMINI_MODEL} />}
    </div>
  )
}
