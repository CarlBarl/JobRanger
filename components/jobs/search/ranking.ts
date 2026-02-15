import type { AFJobHit } from '@/lib/services/arbetsformedlingen'
import type { ScoredJob } from '@/components/jobs/search/types'

export function sortByDateDesc(left?: string | null, right?: string | null): number {
  const leftDate = Date.parse(left ?? '')
  const rightDate = Date.parse(right ?? '')
  const safeLeft = Number.isNaN(leftDate) ? 0 : leftDate
  const safeRight = Number.isNaN(rightDate) ? 0 : rightDate
  return safeRight - safeLeft
}

export function textRelevanceBonus(job: AFJobHit, queryLower: string): number {
  if (!queryLower) return 0
  let bonus = 0
  if (job.headline?.toLowerCase().includes(queryLower)) bonus += 3
  if (job.employer?.name?.toLowerCase().includes(queryLower)) bonus += 2
  if (job.description?.text?.toLowerCase().includes(queryLower)) bonus += 1
  return bonus
}

export function normalizeRegion(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesRegionFilter(
  jobRegion: string | null | undefined,
  selectedRegion: string
): boolean {
  const normalizedSelected = normalizeRegion(selectedRegion)
  if (!normalizedSelected) return true

  const normalizedJobRegion = normalizeRegion(jobRegion ?? '')
  if (!normalizedJobRegion) return false

  return (
    normalizedJobRegion === normalizedSelected ||
    normalizedJobRegion.includes(normalizedSelected) ||
    normalizedSelected.includes(normalizedJobRegion)
  )
}

export function matchesLocationHint(job: AFJobHit, selectedRegion: string): boolean {
  const selected = selectedRegion.trim()
  if (!selected) return false

  const address = job.workplace_address
  const candidates = [
    address?.region,
    address?.municipality,
    address?.city,
    address?.country,
  ]

  return candidates.some((value) => matchesRegionFilter(value, selected))
}

export function sortStreamedSkillJobs(
  jobs: ScoredJob[],
  currentSkillMatches: Record<string, number>
): ScoredJob[] {
  return [...jobs].sort((left, right) => {
    const coverageLeft = currentSkillMatches[left.id] ?? 0
    const coverageRight = currentSkillMatches[right.id] ?? 0
    if (coverageRight !== coverageLeft) return coverageRight - coverageLeft

    const scoreLeft = left.relevance?.matched ?? 0
    const scoreRight = right.relevance?.matched ?? 0
    if (scoreRight !== scoreLeft) return scoreRight - scoreLeft

    const dateLeft = Date.parse(left.publication_date ?? '') || 0
    const dateRight = Date.parse(right.publication_date ?? '') || 0
    if (dateRight !== dateLeft) return dateRight - dateLeft

    return left.id.localeCompare(right.id)
  })
}
