import { normalizeSkillKey } from '@/lib/skills/normalize'
import type { JobsSearchTab, JobsSortOrder, ScoredJob } from './types'

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function asTab(value: unknown): JobsSearchTab {
  return value === 'saved' ? 'saved' : 'search'
}

export function asSortOrder(value: unknown): JobsSortOrder {
  return value === 'newest' ? 'newest' : 'bestMatch'
}

export function asSearchSkillMatches(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number'
  )
  return Object.fromEntries(entries)
}

export function asJobs(value: unknown): ScoredJob[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (candidate): candidate is ScoredJob =>
      !!candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as { id?: unknown }).id === 'string'
  )
}

export function getUniqueSkills(values: string[]): string[] {
  const unique = new Map<string, string>()

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeSkillKey(trimmed)
    if (!key) continue
    if (!unique.has(key)) {
      unique.set(key, trimmed)
    }
  }

  return Array.from(unique.values())
}

export function buildSkillsKey(skills: string[]): string {
  return skills
    .map((skill) => normalizeSkillKey(skill))
    .filter(Boolean)
    .sort()
    .join('\n')
}

export function reconcileSelectedSkills(selected: string[], available: string[]): string[] {
  if (selected.length === 0 || available.length === 0) return []
  const availableByKey = new Map(
    available.map((skill) => [normalizeSkillKey(skill), skill] as const)
  )
  const reconciled = selected
    .map((skill) => availableByKey.get(normalizeSkillKey(skill)) ?? null)
    .filter((skill): skill is string => typeof skill === 'string')
  return getUniqueSkills(reconciled)
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}
