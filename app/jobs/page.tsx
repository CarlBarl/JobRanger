import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobSearch } from '@/components/jobs/JobSearch'
import { getTranslations } from 'next-intl/server'

export default async function JobsPage() {
  const t = await getTranslations('jobs')

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('title')}</h1>
        <JobSearch />
      </main>
    </div>
  )
}
