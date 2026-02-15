import { normalizeSkillKey, tokenizeSkillKey } from './normalize'

const MAX_EXTRACTED_SKILLS = 25
const JACCARD_ACCEPT_THRESHOLD = 0.67

export type SkillCatalogIndex = {
  byKey: Map<string, string>
  tokensByKey: Map<string, string[]>
  tokenIndex: Map<string, Set<string>>
}

const ALIAS_KEYS: Record<string, string> = {
  // JS ecosystem
  reactjs: 'react',
  'react js': 'react',
  'react.js': 'react',
  vuejs: 'vue',
  'vue js': 'vue',
  nextjs: 'next js',
  'next js': 'next js',
  nodejs: 'node js',
  // common split forms
  'type script': 'typescript',
  'java script': 'javascript',
  // abbreviations
  ts: 'typescript',
  js: 'javascript',
  // languages/tech aliases
  'c sharp': 'c#',
  csharp: 'c#',
  cpp: 'c++',
  // .NET
  dotnet: 'net',
}

export function buildCatalogIndex(catalog: readonly string[]): SkillCatalogIndex {
  const byKey = new Map<string, string>()
  const tokensByKey = new Map<string, string[]>()
  const tokenIndex = new Map<string, Set<string>>()

  for (const label of catalog) {
    if (typeof label !== 'string') continue
    const trimmed = label.trim()
    if (!trimmed) continue
    const key = normalizeSkillKey(trimmed)
    if (!key || byKey.has(key)) continue
    byKey.set(key, trimmed)

    const tokens = tokenizeSkillKey(key)
    tokensByKey.set(key, tokens)
    for (const token of tokens) {
      const bucket = tokenIndex.get(token)
      if (bucket) {
        bucket.add(key)
      } else {
        tokenIndex.set(token, new Set([key]))
      }
    }
  }

  return { byKey, tokensByKey, tokenIndex }
}

export function mapSkillToCatalog(raw: string, index: SkillCatalogIndex): string | null {
  const rawKey = normalizeSkillKey(raw)
  if (!rawKey) return null

  const direct = index.byKey.get(rawKey)
  if (direct) return direct

  const aliasTargetKey = ALIAS_KEYS[rawKey]
  if (aliasTargetKey) {
    const aliased = index.byKey.get(aliasTargetKey)
    if (aliased) return aliased
  }

  const rawTokens = tokenizeSkillKey(rawKey)
  if (rawTokens.length === 0) return null

  let candidates: Set<string> | null = null

  for (const token of rawTokens) {
    const keys = index.tokenIndex.get(token)
    if (!keys) continue
    if (candidates === null) {
      candidates = new Set(keys)
      continue
    }

    const intersected = new Set<string>()
    for (const candidate of candidates) {
      if (keys.has(candidate)) intersected.add(candidate)
    }
    candidates = intersected
  }

  if (!candidates || candidates.size === 0) {
    candidates = new Set()
    for (const token of rawTokens) {
      const keys = index.tokenIndex.get(token)
      if (!keys) continue
      for (const key of keys) {
        candidates.add(key)
      }
    }
  }

  if (candidates.size === 0) return null

  const rawTokenSet = new Set(rawTokens)
  const rawTokenCount = rawTokens.length

  let bestKey: string | null = null
  let bestScore = 0
  let bestTokenDelta = Number.POSITIVE_INFINITY

  for (const candidateKey of candidates) {
    const candidateTokens = index.tokensByKey.get(candidateKey) ?? tokenizeSkillKey(candidateKey)
    const tokenDelta = Math.abs(candidateTokens.length - rawTokenCount)
    if (tokenDelta > 2) continue

    const candidateTokenSet = new Set(candidateTokens)
    let intersection = 0
    for (const token of rawTokenSet) {
      if (candidateTokenSet.has(token)) intersection += 1
    }
    const union = rawTokenSet.size + candidateTokenSet.size - intersection
    if (union <= 0) continue

    const score = intersection / union
    if (score > bestScore || (score === bestScore && tokenDelta < bestTokenDelta)) {
      bestScore = score
      bestKey = candidateKey
      bestTokenDelta = tokenDelta
    }
  }

  if (!bestKey || bestScore < JACCARD_ACCEPT_THRESHOLD) return null
  return index.byKey.get(bestKey) ?? null
}

export type MappedSkillsResult = {
  mapped: string[]
  unmapped: string[]
  skillsToStore: string[]
}

function capExtractedSkills(rawSkills: string[]): string[] {
  return rawSkills
    .filter((skill): skill is string => typeof skill === 'string')
    .map((skill) => skill.trim())
    .filter(Boolean)
    .slice(0, MAX_EXTRACTED_SKILLS)
}

export function mapSkillsToCatalogWithIndex(
  rawSkills: string[],
  index: SkillCatalogIndex
): MappedSkillsResult {
  const cleaned = capExtractedSkills(rawSkills)

  const mapped: string[] = []
  const unmapped: string[] = []

  for (const skill of cleaned) {
    const mappedSkill = mapSkillToCatalog(skill, index)
    if (mappedSkill) {
      mapped.push(mappedSkill)
    } else {
      unmapped.push(skill)
    }
  }

  const byKey = new Map<string, string>()

  for (const skill of mapped) {
    const key = normalizeSkillKey(skill)
    if (!key || byKey.has(key)) continue
    byKey.set(key, skill)
  }

  for (const skill of unmapped) {
    const key = normalizeSkillKey(skill)
    if (!key || byKey.has(key)) continue
    byKey.set(key, skill)
  }

  return {
    mapped,
    unmapped,
    skillsToStore: Array.from(byKey.values()),
  }
}

export function mapSkillsToCatalog(rawSkills: string[], catalog: readonly string[]): MappedSkillsResult {
  const index = buildCatalogIndex(catalog)
  return mapSkillsToCatalogWithIndex(rawSkills, index)
}

