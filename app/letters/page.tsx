import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTranslations } from 'next-intl/server'
import { FileText } from 'lucide-react'

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
      <main className="container mx-auto space-y-8 px-6 py-8 sm:py-12">
        <div className="animate-fade-up">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {letters.length} {letters.length === 1 ? 'brev' : 'brev'}
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        </div>

        {letters.length === 0 ? (
          <div className="animate-fade-up delay-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full border p-4">
              <FileText className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('empty')}
            </p>
          </div>
        ) : (
          <div className="animate-fade-up delay-1 grid gap-6 md:grid-cols-2">
            {letters.map((letter) => {
              const title = (letter as typeof letter & { jobTitle?: string | null }).jobTitle ??
                `${t('jobIdLabel')}: ${letter.afJobId}`

              return (
                <Card key={letter.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                  <CardHeader className="border-b bg-muted/30 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="break-words text-base font-semibold tracking-tight">
                          {title}
                        </CardTitle>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {new Date(letter.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="shrink-0 rounded-full border p-2 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                          <path d="M21 15V6a2 2 0 0 0-2-2H8" />
                          <rect x="3" y="9" width="13" height="13" rx="2" />
                        </svg>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {letter.content}
                    </pre>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
