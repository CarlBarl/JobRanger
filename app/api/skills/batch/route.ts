import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { extractSkillsFromCV } from '@/lib/services/gemini'
import { enforceCsrfProtection } from '@/lib/security/csrf'
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

interface BatchResult {
  total: number
  updated: Array<{
    documentId: string
    previousSkills: string[]
    newSkills: string[]
    added: string[]
    removed: string[]
    createdAt: string
  }>
  failed: Array<{
    documentId: string
    error: string
    createdAt: string
  }>
  skipped: Array<{
    documentId: string
    reason: string
    createdAt: string
  }>
}

export async function POST(request: NextRequest) {
  const csrfError = enforceCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    // Check authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        },
        { status: 401 }
      )
    }

    const batchLimit = consumeRateLimit('skills-batch-user', user.id, 5, 60 * 60 * 1000)
    if (!batchLimit.allowed) {
      return rateLimitResponse(
        'Batch extraction limit reached. Please try again later.',
        batchLimit.retryAfterSeconds
      )
    }

    // Query all user's CV documents
    const cvDocuments = await prisma.document.findMany({
      where: {
        userId: user.id,
        type: 'cv'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Initialize results
    const results: BatchResult = {
      total: cvDocuments.length,
      updated: [],
      failed: [],
      skipped: []
    }

    // Process each CV sequentially
    for (const document of cvDocuments) {
      // Skip if no parsed content
      if (!document.parsedContent || document.parsedContent.trim() === '') {
        results.skipped.push({
          documentId: document.id,
          reason: 'No parsed content available',
          createdAt: document.createdAt.toISOString()
        })
        continue
      }

      try {
        // Capture previous skills
        const previousSkills = (document.skills as string[]) || []

        // Extract skills using Gemini
        const newSkills = await extractSkillsFromCV(document.parsedContent)

        // Calculate diff
        const added = newSkills.filter(s => !previousSkills.includes(s))
        const removed = previousSkills.filter(s => !newSkills.includes(s))

        // Update document with new skills
        await prisma.document.update({
          where: { id: document.id },
          data: { skills: newSkills }
        })

        results.updated.push({
          documentId: document.id,
          previousSkills,
          newSkills,
          added,
          removed,
          createdAt: document.createdAt.toISOString()
        })
      } catch (error) {
        // Collect failure but continue processing
        results.failed.push({
          documentId: document.id,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          createdAt: document.createdAt.toISOString()
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: results
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Batch skills extraction error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process batch skills extraction'
        }
      },
      { status: 500 }
    )
  }
}
