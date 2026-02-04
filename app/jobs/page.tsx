import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobSearch } from '@/components/jobs/JobSearch'
import { getTranslations } from 'next-intl/server'

export default async function JobsPage() {
  const t = await getTranslations('jobs')

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <JobSearch />
      </main>
    </div>
  )
}
