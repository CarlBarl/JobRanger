import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Briefcase, Mail } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

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

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {t('welcome', { name: user.name || user.email })}
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* CV Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('yourCV')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cvDocument ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('uploaded')}: {new Date(cvDocument.createdAt).toLocaleDateString()}
                  </p>
                  {cvDocument.skills && (
                    <div>
                      <p className="text-xs font-medium mb-1">{t('extractedSkills')}:</p>
                      <div className="flex flex-wrap gap-1">
                        {(cvDocument.skills as string[]).slice(0, 3).map((skill, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                        {(cvDocument.skills as string[]).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            {t('moreSkills', { count: (cvDocument.skills as string[]).length - 3 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('noCV')}</p>
                  <FileUpload />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Letter Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('yourPersonalLetter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalLetter ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('uploaded')}: {new Date(personalLetter.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {personalLetter.parsedContent?.substring(0, 150)}...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('noPersonalLetter')}</p>
                  <PersonalLetterUpload />
                </div>
              )}
            </CardContent>
          </Card>

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
      </main>
    </div>
  )
}
