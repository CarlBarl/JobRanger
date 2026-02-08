import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'

export default async function LettersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations('letters')

  if (!user) return null

  const letters = await prisma.generatedLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>

        {letters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('empty')}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {letters.map((letter) => (
              <Card key={letter.id}>
                <CardHeader>
                  <CardTitle className="break-words text-base">
                    {(letter as typeof letter & { jobTitle?: string | null }).jobTitle ??
                      `${t('jobIdLabel')}: ${letter.afJobId}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(letter.createdAt).toLocaleString()}
                  </p>
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {letter.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
