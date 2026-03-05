import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { formatShortDate } from '@/lib/formatting'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  const t = await getTranslations('dashboard')
  const locale = await getLocale()

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">{t('documentNotFound')}</h1>
        </main>
      </div>
    )
  }

  const title = document.type === 'cv' ? t('yourCV') : t('yourPersonalLetter')

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold break-words">{title}</h1>
        <div className="text-sm text-muted-foreground">
          {t('uploaded')}: {formatShortDate(document.createdAt, locale)}
        </div>
        {document.parsedContent ? (
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap break-words text-sm">
              {document.parsedContent}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('noContent')}</p>
        )}
        {document.type === 'cv' && document.skills && Array.isArray(document.skills) && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('extractedSkills')}</h2>
            <div className="flex flex-wrap gap-2">
              {(document.skills as string[]).map((skill, i) => (
                <span key={i} className="bg-muted px-2 py-1 rounded text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
