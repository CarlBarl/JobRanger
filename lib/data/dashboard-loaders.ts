import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { createClient } from '@/lib/supabase/server'
import { resolveDocumentAccessUrl } from '@/lib/storage'

// ---------------------------------------------------------------------------
// Cached base loaders – React cache() deduplicates within the same request so
// multiple Suspense sections that need the same data only hit the DB once.
// ---------------------------------------------------------------------------

export const getSavedJobsCount = cache(async (userId: string) => {
  return prisma.savedJob.count({ where: { userId } })
})

export const getLettersCount = cache(async (userId: string) => {
  return prisma.generatedLetter.count({ where: { userId } })
})

export const getCvDocument = cache(async (userId: string) => {
  return prisma.document.findFirst({
    where: { userId, type: 'cv' },
    orderBy: { createdAt: 'desc' },
  })
})

export const getPersonalLetter = cache(async (userId: string) => {
  return prisma.document.findFirst({
    where: { userId, type: 'personal_letter' },
    orderBy: { createdAt: 'desc' },
  })
})

export const getRecentSavedJobs = cache(async (userId: string) => {
  return prisma.savedJob.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    take: 3,
  })
})

// ---------------------------------------------------------------------------
// Composed loaders – build on the cached primitives above.
// ---------------------------------------------------------------------------

export interface SavedJobWithDetails {
  afJobId: string
  headline: string
  employer: string
  location: string
  occupation: string
  deadline: string | null
  webpageUrl: string | null
  isStale: boolean
}

export async function getRecentSavedJobsWithDetails(
  userId: string,
): Promise<SavedJobWithDetails[]> {
  const recentSavedJobs = await getRecentSavedJobs(userId)

  return Promise.all(
    recentSavedJobs.map(async (saved): Promise<SavedJobWithDetails> => {
      try {
        const job = await getJobById(saved.afJobId)
        return {
          afJobId: saved.afJobId,
          headline: job.headline || saved.headline || 'Untitled',
          employer: job.employer?.name || saved.employer || '',
          location:
            job.workplace_address?.municipality ||
            job.workplace_address?.region ||
            saved.location ||
            '',
          occupation: job.occupation?.label || saved.occupation || '',
          deadline: job.application_deadline || saved.deadline || null,
          webpageUrl: job.webpage_url || saved.webpageUrl || null,
          isStale: false,
        }
      } catch {
        // AF API failed -- use cached data from DB
        return {
          afJobId: saved.afJobId,
          headline: saved.headline || `Jobb ${saved.afJobId.slice(0, 8)}`,
          employer: saved.employer || '',
          location: saved.location || '',
          occupation: saved.occupation || '',
          deadline: saved.deadline || null,
          webpageUrl: saved.webpageUrl || null,
          isStale: true,
        }
      }
    }),
  )
}

export interface SerializedDocument {
  id: string
  createdAt: string
  parsedContent: string | null
  fileUrl: string | null
  skills: string[] | null
}

export async function getDocumentWithAccessUrl(
  userId: string,
  type: 'cv' | 'personal_letter',
): Promise<SerializedDocument | null> {
  const doc =
    type === 'cv'
      ? await getCvDocument(userId)
      : await getPersonalLetter(userId)

  if (!doc) return null

  const supabase = await createClient()
  const accessUrl = await resolveDocumentAccessUrl(supabase, doc.fileUrl)

  return {
    id: doc.id,
    createdAt: doc.createdAt.toISOString(),
    parsedContent: doc.parsedContent,
    fileUrl: accessUrl,
    skills: doc.skills as string[] | null,
  }
}
