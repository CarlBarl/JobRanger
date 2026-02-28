import { z } from 'zod'
import { NextResponse, type NextRequest } from 'next/server'
import { UsageEventType, UserTier } from '@/generated/prisma/client'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { GEMINI_MODEL, honeCoverLetter } from '@/lib/services/gemini'
import { MAX_PARSED_CONTENT_CHARS } from '@/lib/constants'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import {
  enforceLetterQuota,
  LETTER_HONE_COST_CREDITS,
  recordUsageEvent,
} from '@/lib/security/monthly-quota'

const RequestSchema = z.object({
  followUpPrompt: z.string().trim().min(1).max(1200),
  baseContent: z.string().trim().max(MAX_PARSED_CONTENT_CHARS).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  if (!authUser.email) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Missing email for authenticated user' },
      },
      { status: 400 }
    )
  }

  const honeLimit = await consumeRateLimit('letter-hone-user', authUser.id, 40, 60 * 60 * 1000)
  if (!honeLimit.allowed) {
    return rateLimitResponse(
      'Letter hone rate limit exceeded. Please try again later.',
      honeLimit.retryAfterSeconds
    )
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing letter id' } },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const parsed = RequestSchema.parse(body)
    const followUpPrompt = parsed.followUpPrompt.trim()

    const appUser = await getOrCreateUser(authUser.id, authUser.email)
    if (appUser.tier !== UserTier.PRO) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'AI letter honing is available for PRO users only.',
          },
        },
        { status: 403 }
      )
    }

    const quotaError = await enforceLetterQuota({
      userId: appUser.id,
      userTier: appUser.tier,
      requiredCredits: LETTER_HONE_COST_CREDITS,
      message: 'Monthly letter honing quota reached for your plan.',
    })
    if (quotaError) {
      return quotaError
    }

    const letter = await prisma.generatedLetter.findFirst({
      where: { id, userId: appUser.id },
      select: {
        id: true,
        content: true,
        jobTitle: true,
        savedJob: {
          select: {
            employer: true,
          },
        },
      },
    })

    if (!letter) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
        { status: 404 }
      )
    }

    const baseContent = parsed.baseContent?.trim() || letter.content
    if (!baseContent.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Letter content is empty' } },
        { status: 400 }
      )
    }

    const improvedRaw = await honeCoverLetter({
      currentLetterContent: baseContent,
      followUpPrompt,
      jobTitle: letter.jobTitle ?? undefined,
      companyName: letter.savedJob?.employer ?? undefined,
    })

    const improved = improvedRaw.trim().slice(0, MAX_PARSED_CONTENT_CHARS)
    if (!improved) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'AI did not return updated letter content' },
        },
        { status: 500 }
      )
    }

    const updated = await prisma.generatedLetter.update({
      where: { id: letter.id },
      data: { content: improved },
      select: { id: true, content: true },
    })

    try {
      await recordUsageEvent(appUser.id, UsageEventType.GENERATE_LETTER)
    } catch (usageEventError) {
      console.error(
        'Failed to record hone letter usage event:',
        usageEventError instanceof Error ? usageEventError.message : usageEventError
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        content: updated.content,
        model: GEMINI_MODEL,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'BAD_REQUEST', message: error.issues[0]?.message ?? 'Invalid body' },
        },
        { status: 400 }
      )
    }

    console.error('Letter hone error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to hone letter' },
      },
      { status: 500 }
    )
  }
}
