import { prisma } from '@/lib/prisma'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import type { CvStudioJobTarget } from '@/lib/services/gemini'

export interface ResolvedCvJobTargets {
  targets: CvStudioJobTarget[]
  warnings: string[]
  selectedCount: number
}

export async function resolveCvJobTargets(
  userId: string,
  selectedJobIds: string[]
): Promise<ResolvedCvJobTargets> {
  const uniqueIds = Array.from(new Set(selectedJobIds))
  if (uniqueIds.length === 0) {
    return { targets: [], warnings: [], selectedCount: 0 }
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: {
      userId,
      afJobId: {
        in: uniqueIds,
      },
    },
    select: {
      afJobId: true,
      headline: true,
      employer: true,
    },
  })

  const savedMap = new Map(savedJobs.map((job) => [job.afJobId, job]))
  const warnings: string[] = []

  const missing = uniqueIds.filter((jobId) => !savedMap.has(jobId))
  if (missing.length > 0) {
    warnings.push(
      `Ignored ${missing.length} selected job(s) not found in your saved jobs list.`
    )
  }

  const fetchResults = await Promise.all(
    uniqueIds
      .filter((jobId) => savedMap.has(jobId))
      .map(async (jobId) => {
        const saved = savedMap.get(jobId)
        try {
          const job = await getJobById(jobId)
          return {
            ok: true as const,
            target: {
              afJobId: jobId,
              jobTitle: job.headline || saved?.headline || `Job ${jobId}`,
              companyName: job.employer?.name || saved?.employer || undefined,
              jobDescription: job.description?.text || '',
            },
          }
        } catch {
          return {
            ok: false as const,
            jobId,
          }
        }
      })
  )

  const targets: CvStudioJobTarget[] = []

  for (const result of fetchResults) {
    if (result.ok) {
      targets.push(result.target)
    } else {
      warnings.push(`Could not load job description for saved job ${result.jobId}.`)
    }
  }

  return {
    targets,
    warnings,
    selectedCount: uniqueIds.length,
  }
}
