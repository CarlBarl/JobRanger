import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AFJobHit } from '@/lib/services/arbetsformedlingen'

type JobCardProps = {
  job: Pick<AFJobHit, 'id' | 'headline' | 'employer' | 'workplace_address'>
}

export function JobCard({ job }: JobCardProps) {
  const employerName = job.employer?.name ?? 'Unknown employer'
  const municipality = job.workplace_address?.municipality

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link href={`/jobs/${job.id}`} className="hover:underline">
            {job.headline ?? 'Untitled role'}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p className="text-foreground">{employerName}</p>
        {municipality ? <p>{municipality}</p> : null}
      </CardContent>
    </Card>
  )
}

