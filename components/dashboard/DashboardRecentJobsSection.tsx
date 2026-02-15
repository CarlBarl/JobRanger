import { SavedJobsList } from '@/components/dashboard/SavedJobsList'
import { getSavedJobsCount, getRecentSavedJobsWithDetails } from '@/lib/data/dashboard-loaders'

interface DashboardRecentJobsSectionProps {
  userId: string
}

export async function DashboardRecentJobsSection({ userId }: DashboardRecentJobsSectionProps) {
  const [savedJobsData, totalCount] = await Promise.all([
    getRecentSavedJobsWithDetails(userId),
    getSavedJobsCount(userId),
  ])

  return (
    <SavedJobsList
      jobs={savedJobsData}
      totalCount={totalCount}
    />
  )
}
