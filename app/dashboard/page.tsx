import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { SkillsEditor } from '@/components/dashboard/SkillsEditor'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { DebugChat } from '@/components/dashboard/DebugChat'
import { GEMINI_MODEL } from '@/lib/services/gemini'

const DEBUG_EMAIL = 'carlelelid@gmail.com'

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

  // Serialize documents for client component
  const serializedCv = cvDocument
    ? {
        id: cvDocument.id,
        createdAt: cvDocument.createdAt.toISOString().slice(0, 10),
        parsedContent: cvDocument.parsedContent,
        fileUrl: cvDocument.fileUrl,
        skills: cvDocument.skills as string[] | null,
      }
    : null

  const serializedLetter = personalLetter
    ? {
        id: personalLetter.id,
        createdAt: personalLetter.createdAt.toISOString().slice(0, 10),
        parsedContent: personalLetter.parsedContent,
        fileUrl: personalLetter.fileUrl,
        skills: personalLetter.skills as string[] | null,
      }
    : null

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {t('welcome', { name: user.name || user.email })}
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* CV and Personal Letter sections */}
          <DashboardClient
            cvDocument={serializedCv}
            personalLetter={serializedLetter}
            cvUploadComponent={<FileUpload />}
            personalLetterUploadComponent={<PersonalLetterUpload />}
          />

          {/* Saved Jobs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t('savedJobs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{savedJobsCount}</p>
              <p className="text-sm text-muted-foreground">{t('jobsSaved')}</p>
              <Link href="/jobs">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  {t('searchJobs')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Generated Letters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('generatedLetters')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{lettersCount}</p>
              <p className="text-sm text-muted-foreground">{t('lettersGenerated')}</p>
              <Link href="/letters">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  {t('viewLetters')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Skills Editor - Full width below the grid */}
        {serializedCv && (
          <div className="mt-6">
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
