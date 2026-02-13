interface JobTextFields {
  headline?: string | null
  description?: string | null
  occupation?: string | null
}

interface RelevanceScore {
  matched: number
  total: number
  score: number
  matchedSkills: string[]
}

const DIACRITIC_REGEX = /[\u0300-\u036f]/g
const SPACE_REGEX = /\s+/g
export const DEFAULT_JOB_SKILL_CATALOG = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Java',
  'C#',
  'C++',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'Terraform',
  'Git',
  'REST',
  'GraphQL',
  'HTML',
  'CSS',
  'Tailwind',
  'Linux',
  'Bash',
  'CI/CD',
  'Agile',
  'Scrum',
] as const

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(DIACRITIC_REGEX, '')
    .toLowerCase()
}

function cleanSpaces(value: string): string {
  return value.replace(SPACE_REGEX, ' ').trim()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForSkillMatching(value: string): string {
  return cleanSpaces(normalize(value).replace(/[./_-]+/g, ' '))
}

function buildSkillVariants(skill: string): string[] {
  const normalized = normalizeForSkillMatching(skill)
  if (!normalized) return []

  const variants = new Set<string>([normalized])

  if (normalized === 'node' || normalized === 'nodejs' || normalized === 'node js') {
    variants.add('node.js')
    variants.add('node js')
    variants.add('nodejs')
  }

  if (normalized === 'c#' || normalized === 'c sharp' || normalized === 'csharp') {
    variants.add('c#')
    variants.add('c sharp')
    variants.add('csharp')
  }

  if (normalized === 'c++' || normalized === 'cpp') {
    variants.add('c++')
    variants.add('cpp')
  }

  return Array.from(variants)
}

function hasSkillMatch(text: string, skill: string): boolean {
  const variants = buildSkillVariants(skill)
  for (const variant of variants) {
    const pattern = variant
      .split(' ')
      .filter(Boolean)
      .map((token) => escapeRegex(token))
      .join('\\s+')

    if (!pattern) continue

    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}($|[^\\p{L}\\p{N}])`, 'u')
    if (regex.test(text)) {
      return true
    }
  }

  return false
}

function buildJobText(job: JobTextFields): string {
  return normalizeForSkillMatching(
    [job.headline, job.description, job.occupation]
      .filter(Boolean)
      .join(' ')
  )
}

function dedupeSkills(skills: readonly string[]): string[] {
  const byKey = new Map<string, string>()
  for (const skill of skills) {
    const key = normalizeForSkillMatching(skill)
    if (!key || byKey.has(key)) continue
    byKey.set(key, skill)
  }
  return Array.from(byKey.values())
}

export function extractJobSkills(
  job: JobTextFields,
  catalog?: readonly string[]
): string[] {
  const text = buildJobText(job)
  if (!text) return []

  const candidates = dedupeSkills(catalog ?? DEFAULT_JOB_SKILL_CATALOG)

  return candidates.filter((skill) => hasSkillMatch(text, skill))
}

export function scoreJobRelevance(
  job: JobTextFields,
  skills: string[]
): RelevanceScore {
  if (skills.length === 0) {
    return { matched: 0, total: 0, score: 0, matchedSkills: [] }
  }

  const text = buildJobText(job)

  const matchedSkills = skills.filter((skill) => hasSkillMatch(text, skill))
  const matched = matchedSkills.length

  return {
    matched,
    total: skills.length,
    score: matched / skills.length,
    matchedSkills,
  }
}
