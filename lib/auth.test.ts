import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateUser } from './auth'

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from './prisma'

describe('getOrCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates user if not exists (upsert)', async () => {
    const mockUser = {
      id: 'auth-id-123',
      email: 'test@example.com',
      name: null,
      onboardingCompleted: false,
      createdAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

    const result = await getOrCreateUser('auth-id-123', 'test@example.com')

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'auth-id-123' },
      update: { email: 'test@example.com', tier: 'FREE' },
      create: {
        id: 'auth-id-123',
        email: 'test@example.com',
        tier: 'FREE',
      },
    })
    expect(result).toEqual(mockUser)
  })
})
