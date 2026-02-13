import { NextResponse } from 'next/server'
import { fetchSkillCatalog } from '@/lib/services/jobtech-enrichments'
import { DEFAULT_JOB_SKILL_CATALOG } from '@/lib/scoring'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let cachedCatalog: { data: string[]; timestamp: number } | null = null

/** @internal Reset cache — exposed only for test isolation */
export function _resetCacheForTesting() {
  cachedCatalog = null
}

export async function GET() {
  const now = Date.now()

  if (cachedCatalog && now - cachedCatalog.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cachedCatalog.data })
  }

  try {
    const skills = await fetchSkillCatalog()

    if (skills.length > 0) {
      cachedCatalog = { data: skills, timestamp: now }
      return NextResponse.json({ success: true, data: skills })
    }
  } catch {
    // Fall through to static fallback
  }

  const fallback = Array.from(DEFAULT_JOB_SKILL_CATALOG)
  return NextResponse.json({ success: true, data: fallback })
}
