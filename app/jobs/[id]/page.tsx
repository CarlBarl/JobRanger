import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobActions } from '@/components/jobs/JobActions'
import { createClient } from '@/lib/supabase/server'
import { getJobById } from '@/lib/services/arbetsformedlingen'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  try {
    const job = await getJobById(params.id)
    const title = job.headline ?? 'Untitled role'
    const employerName = job.employer?.name ?? 'Unknown employer'
    const description = job.description?.text ?? ''

    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{employerName}</p>
          </header>

          {description ? (
            <section className="prose max-w-none">
              <p>{description}</p>
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">No description available.</p>
          )}

          <JobActions afJobId={params.id} />
        </main>
      </div>
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load job'
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <h1 className="text-2xl font-bold">Could not load job</h1>
          <p className="text-sm text-destructive">{message}</p>
        </main>
      </div>
    )
  }
}
