import { prisma } from '@/lib/prisma'
import { extractSkillsFromCV } from '@/lib/services/gemini'
import { fetchSkillCatalog } from '@/lib/services/jobtech-enrichments'
import { buildCatalogIndex, mapSkillsToCatalogWithIndex } from '@/lib/skills/catalog-map'
import { DEFAULT_JOB_SKILL_CATALOG } from '@/lib/scoring'

type SkillsLookupResult = {
  documentId: string
  skills: string[]
}

function normalizeSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export type ExtractSkillsResult =
  | { kind: 'success'; skills: string[] }
  | { kind: 'not_found' }
  | { kind: 'missing_parsed_content' }

export async function extractAndStoreSkills({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<ExtractSkillsResult> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId, type: 'cv' },
  })

  if (!document) {
    return { kind: 'not_found' }
  }

  if (!document.parsedContent) {
    return { kind: 'missing_parsed_content' }
  }

  const extractedSkills = await extractSkillsFromCV(document.parsedContent)

  let catalog: string[] = []
  try {
    catalog = await fetchSkillCatalog()
  } catch {
    catalog = []
  }

  if (catalog.length === 0) {
    catalog = Array.from(DEFAULT_JOB_SKILL_CATALOG)
  }

  const catalogIndex = buildCatalogIndex(catalog)
  const { skillsToStore } = mapSkillsToCatalogWithIndex(extractedSkills, catalogIndex)

  await prisma.document.update({
    where: { id: documentId },
    data: { skills: skillsToStore },
  })

  return { kind: 'success', skills: skillsToStore }
}

export async function updateDocumentSkills({
  documentId,
  userId,
  skills,
}: {
  documentId: string
  userId: string
  skills: string[]
}) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId, type: 'cv' },
  })

  if (!document) {
    return false
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { skills },
  })

  return true
}

export async function findLatestCvSkillsForUser(userId: string): Promise<SkillsLookupResult | null> {
  const cvDocument = await prisma.document.findFirst({
    where: { userId, type: 'cv' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, skills: true },
  })

  if (!cvDocument) {
    return null
  }

  return {
    documentId: cvDocument.id,
    skills: normalizeSkills(cvDocument.skills),
  }
}

export async function findDocumentSkillsForUser({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}): Promise<SkillsLookupResult | null> {
  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, skills: true },
  })

  if (!document) {
    return null
  }

  return {
    documentId: document.id,
    skills: normalizeSkills(document.skills),
  }
}
