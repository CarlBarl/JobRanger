import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUpload } from '@/components/upload/FileUpload'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  // Middleware should redirect, but keep this safe for direct rendering contexts.
  if (!authUser?.email) return null

  const user = await getOrCreateUser(authUser.id, authUser.email)

  const [latestCv, savedJobsCount, lettersCount] = await Promise.all([
    prisma.document.findFirst({
      where: { userId: user.id, type: 'cv' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.generatedLetter.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Your CV</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {latestCv ? <p>CV uploaded.</p> : <FileUpload />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{savedJobsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Letters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{lettersCount}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
