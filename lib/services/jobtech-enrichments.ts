import { z } from 'zod'

const AF_ENRICHMENTS_BASE = 'https://jobad-enrichments-api.jobtechdev.se'

const SynonymItemSchema = z.object({
  concept_label: z.string().min(1),
})

const SynonymDictionarySchema = z.object({
  items: z.array(SynonymItemSchema),
})

export async function fetchSkillCatalog(): Promise<string[]> {
  const url = `${AF_ENRICHMENTS_BASE}/synonymdictionary?type=COMPETENCE&spelling=CORRECTLY_SPELLED`

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`AF enrichments API error: ${response.status}`)
  }

  const json: unknown = await response.json()
  const parsed = SynonymDictionarySchema.parse(json)

  const uniqueLabels = new Map<string, string>()
  for (const item of parsed.items) {
    const label = item.concept_label.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (!uniqueLabels.has(key)) {
      uniqueLabels.set(key, label)
    }
  }

  return Array.from(uniqueLabels.values()).sort((a, b) =>
    a.localeCompare(b, 'sv')
  )
}
