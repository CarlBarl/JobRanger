import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('@/lib/auth', () => ({
  getOrCreateUser: vi.fn(),
}))

vi.mock('@/lib/services/gemini', () => ({
  extractSkillsFromCV: vi.fn()
}))

vi.mock('@/lib/services/jobtech-enrichments', () => ({
  fetchSkillCatalog: vi.fn(),
}))

vi.mock('@/lib/security/monthly-quota', () => ({
  enforceMonthlyQuota: vi.fn(),
  recordUsageEvent: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { extractSkillsFromCV } from '@/lib/services/gemini'
import { fetchSkillCatalog } from '@/lib/services/jobtech-enrichments'
import { enforceMonthlyQuota, recordUsageEvent } from '@/lib/security/monthly-quota'

describe('POST /api/skills/batch', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      }
    }
    ;(createClient as any).mockReturnValue(mockSupabase)

    mockRequest = new NextRequest('http://localhost:3000/api/skills/batch', {
      method: 'POST'
    })

    ;(fetchSkillCatalog as any).mockResolvedValue(['JavaScript', 'React', 'Python', 'Django'])
    ;(getOrCreateUser as any).mockResolvedValue({ id: 'user-123', tier: 'FREE' })
    ;(enforceMonthlyQuota as any).mockResolvedValue(null)
    ;(recordUsageEvent as any).mockResolvedValue(undefined)
  })

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 401 when user object is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('No CVs', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'u@example.com' } },
        error: null
      })
    })

    it('returns empty results when user has no CVs', async () => {
      ;(prisma.document.findMany as any).mockResolvedValue([])

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        total: 0,
        updated: [],
        failed: [],
        skipped: []
      })
      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          type: 'cv'
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      expect(recordUsageEvent).not.toHaveBeenCalled()
    })
  })

  describe('Success', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'u@example.com' } },
        error: null
      })
    })

    it('updates all CVs and returns results', async () => {
      const mockCVs = [
        {
          id: 'cv-1',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 1',
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'cv-2',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 2',
          createdAt: new Date('2024-01-02')
        }
      ]

      ;(prisma.document.findMany as any).mockResolvedValue(mockCVs)
      ;(extractSkillsFromCV as any)
        .mockResolvedValueOnce(['React.js', 'Java Script'])
        .mockResolvedValueOnce(['Python', 'Django'])
      ;(prisma.document.update as any)
        .mockResolvedValueOnce({ ...mockCVs[0], skills: ['React', 'JavaScript'] })
        .mockResolvedValueOnce({ ...mockCVs[1], skills: ['Python', 'Django'] })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.total).toBe(2)
      expect(data.data.updated).toHaveLength(2)
      expect(data.data.updated[0]).toEqual({
        documentId: 'cv-1',
        previousSkills: [],
        newSkills: ['React', 'JavaScript'],
        added: ['React', 'JavaScript'],
        removed: [],
        createdAt: '2024-01-01T00:00:00.000Z'
      })
      expect(data.data.updated[1]).toEqual({
        documentId: 'cv-2',
        previousSkills: [],
        newSkills: ['Python', 'Django'],
        added: ['Python', 'Django'],
        removed: [],
        createdAt: '2024-01-02T00:00:00.000Z'
      })
      expect(data.data.failed).toHaveLength(0)
      expect(data.data.skipped).toHaveLength(0)

      expect(extractSkillsFromCV).toHaveBeenCalledTimes(2)
      expect(extractSkillsFromCV).toHaveBeenCalledWith('CV content 1')
      expect(extractSkillsFromCV).toHaveBeenCalledWith('CV content 2')

      expect(prisma.document.update).toHaveBeenCalledTimes(2)
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'cv-1' },
        data: { skills: ['React', 'JavaScript'] }
      })
      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'cv-2' },
        data: { skills: ['Python', 'Django'] }
      })
      expect(recordUsageEvent).toHaveBeenCalledWith('user-123', 'SKILLS_BATCH')
    })
  })

  describe('Partial Failures', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'u@example.com' } },
        error: null
      })
    })

    it('continues processing after individual failures', async () => {
      const mockCVs = [
        {
          id: 'cv-1',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 1',
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'cv-2',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 2',
          createdAt: new Date('2024-01-02')
        },
        {
          id: 'cv-3',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 3',
          createdAt: new Date('2024-01-03')
        }
      ]

      ;(prisma.document.findMany as any).mockResolvedValue(mockCVs)
      ;(extractSkillsFromCV as any)
        .mockResolvedValueOnce(['JavaScript', 'React'])
        .mockRejectedValueOnce(new Error('Gemini API timeout'))
        .mockResolvedValueOnce(['Python', 'Django'])
      ;(prisma.document.update as any)
        .mockResolvedValueOnce({ ...mockCVs[0], skills: ['JavaScript', 'React'] })
        .mockResolvedValueOnce({ ...mockCVs[2], skills: ['Python', 'Django'] })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.total).toBe(3)
      expect(data.data.updated).toHaveLength(2)
      expect(data.data.failed).toHaveLength(1)
      expect(data.data.failed[0]).toEqual({
        documentId: 'cv-2',
        error: 'Gemini API timeout',
        createdAt: '2024-01-02T00:00:00.000Z'
      })
      expect(data.data.skipped).toHaveLength(0)
      expect(recordUsageEvent).toHaveBeenCalledWith('user-123', 'SKILLS_BATCH')
    })

    it('handles database update failures', async () => {
      const mockCVs = [
        {
          id: 'cv-1',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 1',
          createdAt: new Date('2024-01-01')
        }
      ]

      ;(prisma.document.findMany as any).mockResolvedValue(mockCVs)
      ;(extractSkillsFromCV as any).mockResolvedValueOnce(['JavaScript', 'React'])
      ;(prisma.document.update as any).mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.total).toBe(1)
      expect(data.data.updated).toHaveLength(0)
      expect(data.data.failed).toHaveLength(1)
      expect(data.data.failed[0].error).toBe('Database connection failed')
      expect(recordUsageEvent).toHaveBeenCalledWith('user-123', 'SKILLS_BATCH')
    })
  })

  describe('Skipped Documents', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'u@example.com' } },
        error: null
      })
    })

    it('skips CVs without parsedContent', async () => {
      const mockCVs = [
        {
          id: 'cv-1',
          userId: 'user-123',
          type: 'cv',
          parsedContent: 'CV content 1',
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'cv-2',
          userId: 'user-123',
          type: 'cv',
          parsedContent: null,
          createdAt: new Date('2024-01-02')
        },
        {
          id: 'cv-3',
          userId: 'user-123',
          type: 'cv',
          parsedContent: '',
          createdAt: new Date('2024-01-03')
        }
      ]

      ;(prisma.document.findMany as any).mockResolvedValue(mockCVs)
      ;(extractSkillsFromCV as any).mockResolvedValueOnce(['JavaScript', 'React'])
      ;(prisma.document.update as any).mockResolvedValueOnce({ ...mockCVs[0], skills: ['JavaScript', 'React'] })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.total).toBe(3)
      expect(data.data.updated).toHaveLength(1)
      expect(data.data.failed).toHaveLength(0)
      expect(data.data.skipped).toHaveLength(2)
      expect(data.data.skipped[0]).toEqual({
        documentId: 'cv-2',
        reason: 'No parsed content available',
        createdAt: '2024-01-02T00:00:00.000Z'
      })
      expect(data.data.skipped[1]).toEqual({
        documentId: 'cv-3',
        reason: 'No parsed content available',
        createdAt: '2024-01-03T00:00:00.000Z'
      })

      expect(extractSkillsFromCV).toHaveBeenCalledTimes(1)
      expect(recordUsageEvent).toHaveBeenCalledWith('user-123', 'SKILLS_BATCH')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'u@example.com' } },
        error: null
      })
    })

    it('handles database query errors', async () => {
      ;(prisma.document.findMany as any).mockRejectedValue(new Error('Database connection failed'))

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to process batch skills extraction')
    })

    it('handles unexpected errors gracefully', async () => {
      ;(prisma.document.findMany as any).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  it('returns 429 when monthly quota is exceeded', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'u@example.com' } },
      error: null
    })
    ;(enforceMonthlyQuota as any).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'QUOTA_EXCEEDED', message: 'Monthly batch skills quota reached for your plan.' },
        }),
        { status: 429, headers: { 'content-type': 'application/json' } }
      )
    )

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('QUOTA_EXCEEDED')
  })
})
