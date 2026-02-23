import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateUser } from './auth'

vi.mock('./prisma', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string
      meta?: object
      clientVersion: string
      constructor(message: string, { code, meta, clientVersion }: { code: string; meta?: object; clientVersion: string }) {
        super(message)
        this.code = code
        this.meta = meta
        this.clientVersion = clientVersion
      }
    },
  },
  prisma: {
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { Prisma, prisma } from './prisma'

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
      update: { email: 'test@example.com' },
      create: {
        id: 'auth-id-123',
        email: 'test@example.com',
      },
    })
    expect(result).toEqual(mockUser)
  })

  it('links existing email to new auth ID on P2002 conflict', async () => {
    const mockUser = {
      id: 'new-auth-id',
      email: 'test@example.com',
      name: null,
      onboardingCompleted: false,
      createdAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        meta: { target: ['email'] },
        clientVersion: '7.4.0',
      })
    )
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser)

    const result = await getOrCreateUser('new-auth-id', 'test@example.com')

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      data: { id: 'new-auth-id' },
    })
    expect(result).toEqual(mockUser)
  })
})
