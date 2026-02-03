import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobSearch } from '@/components/jobs/JobSearch'

export default function JobsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Search Jobs</h1>
        <JobSearch />
      </main>
    </div>
  )
}

