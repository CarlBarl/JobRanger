interface JobTextFields {
  headline?: string | null
  description?: string | null
  occupation?: string | null
}

interface RelevanceScore {
  matched: number
  total: number
  score: number
}

export function scoreJobRelevance(
  job: JobTextFields,
  skills: string[]
): RelevanceScore {
  if (skills.length === 0) {
    return { matched: 0, total: 0, score: 0 }
  }

  const text = [job.headline, job.description, job.occupation]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const matched = skills.filter((skill) =>
    text.includes(skill.toLowerCase())
  ).length

  return {
    matched,
    total: skills.length,
    score: matched / skills.length,
  }
}
