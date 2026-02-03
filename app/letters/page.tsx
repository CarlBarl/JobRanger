import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LettersPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const letters = await prisma.generatedLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Generated Letters</h1>

        {letters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No letters generated yet. Generate one from a job ad.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {letters.map((letter) => (
              <Card key={letter.id}>
                <CardHeader>
                  <CardTitle className="text-base">Job ID: {letter.afJobId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(letter.createdAt).toLocaleString()}
                  </p>
                  <pre className="whitespace-pre-wrap text-sm">{letter.content}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

