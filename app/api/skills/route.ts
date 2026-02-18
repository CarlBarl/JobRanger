import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { UsageEventType } from '@/generated/prisma/client'
import { getOrCreateUser } from '@/lib/auth'
import { jsonBadRequest, jsonInternal, jsonNotFound, jsonSuccess } from '@/lib/api/errors'
import { requireSupabaseUser, requireSupabaseUserWithEmail } from '@/lib/api/route-guards'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { enforceMonthlyQuota, recordUsageEvent } from '@/lib/security/monthly-quota'
import { RequestSchema, UpdateSkillsSchema } from './_lib/schemas'
import {
  extractAndStoreSkills,
  findDocumentSkillsForUser,
  findLatestCvSkillsForUser,
  updateDocumentSkills,
} from './_lib/service'

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const authResult = await requireSupabaseUserWithEmail()
  if (authResult instanceof Response) {
    return authResult
  }

  const { user, email } = authResult

  const extractLimit = await consumeRateLimit('skills-extract-user', user.id, 30, 60 * 60 * 1000)
  if (!extractLimit.allowed) {
    return rateLimitResponse(
      'Skills extraction limit reached. Please try again later.',
      extractLimit.retryAfterSeconds
    )
  }

  const appUser = await getOrCreateUser(user.id, email)
  const monthlyQuotaError = await enforceMonthlyQuota({
    userId: appUser.id,
    userTier: appUser.tier,
    usageType: UsageEventType.SKILLS_EXTRACT,
    message: 'Monthly skills extraction quota reached for your plan.',
  })
  if (monthlyQuotaError) {
    return monthlyQuotaError
  }

  try {
    const body = await request.json()
    const { documentId } = RequestSchema.parse(body)

    const result = await extractAndStoreSkills({ documentId, userId: appUser.id })
    if (result.kind === 'not_found') {
      return jsonNotFound('Document not found')
    }
    if (result.kind === 'missing_parsed_content') {
      return jsonBadRequest('Document has no parsed content')
    }

    try {
      await recordUsageEvent(appUser.id, UsageEventType.SKILLS_EXTRACT)
    } catch (usageEventError) {
      console.error(
        'Failed to record skills extract usage event:',
        usageEventError instanceof Error ? usageEventError.message : usageEventError
      )
    }

    return jsonSuccess({ skills: result.skills })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? 'Invalid body')
    }

    console.error('Skills extraction error:', error instanceof Error ? error.message : error)
    return jsonInternal('Failed to extract skills')
  }
}

// PATCH: Update skills manually
export async function PATCH(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const authResult = await requireSupabaseUser()
  if (authResult instanceof Response) {
    return authResult
  }
  const { user } = authResult

  const updateLimit = await consumeRateLimit('skills-update-user', user.id, 120, 60 * 60 * 1000)
  if (!updateLimit.allowed) {
    return rateLimitResponse(
      'Skills update limit reached. Please try again later.',
      updateLimit.retryAfterSeconds
    )
  }

  try {
    const body = await request.json()
    const { documentId, skills } = UpdateSkillsSchema.parse(body)

    const didUpdate = await updateDocumentSkills({
      documentId,
      userId: user.id,
      skills,
    })
    if (!didUpdate) {
      return jsonNotFound('Document not found')
    }

    return jsonSuccess({ skills })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonBadRequest(error.issues[0]?.message ?? 'Invalid body')
    }

    console.error('Skills update error:', error instanceof Error ? error.message : error)
    return jsonInternal('Failed to update skills')
  }
}

// GET: Get skills for a document
export async function GET(request: NextRequest) {
  const authResult = await requireSupabaseUser()
  if (authResult instanceof Response) {
    return authResult
  }
  const { user } = authResult

  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')

  if (!documentId) {
    // Return all CV skills for the user
    const cvDocument = await findLatestCvSkillsForUser(user.id)

    if (!cvDocument) {
      return jsonSuccess({ skills: [], documentId: null })
    }

    return jsonSuccess({
      skills: cvDocument.skills,
      documentId: cvDocument.documentId,
    })
  }

  const document = await findDocumentSkillsForUser({
    documentId,
    userId: user.id,
  })

  if (!document) {
    return jsonNotFound('Document not found')
  }

  return jsonSuccess({
    skills: document.skills,
    documentId: document.documentId,
  })
}
