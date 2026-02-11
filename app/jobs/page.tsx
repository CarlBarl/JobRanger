import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobSearch } from '@/components/jobs/JobSearch'
import { getTranslations } from 'next-intl/server'

export default async function JobsPage() {
  const t = await getTranslations('jobs')

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto space-y-6 px-6 py-8 sm:py-12">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        </div>
        <div className="animate-fade-up delay-1">
          <JobSearch />
        </div>
      </main>
    </div>
  )
}
