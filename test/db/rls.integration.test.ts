import crypto from 'node:crypto'
import { Client } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for integration tests`)
  return value
}

describe('db integration (RLS policies)', () => {
  const rlsUrl = requireEnv('RLS_TEST_DATABASE_URL')
  const client = new Client({ connectionString: rlsUrl })

  beforeAll(async () => {
    await client.connect()
  })

  afterAll(async () => {
    await client.end()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.generatedLetter.deleteMany({})
    await prisma.savedJob.deleteMany({})
    await prisma.document.deleteMany({})
    await prisma.usageEvent.deleteMany({})
    await prisma.subscription.deleteMany({})
    await prisma.user.deleteMany({})
    await client.query('RESET ROLE')
    await client.query("SELECT set_config('request.jwt.claim.sub', '', false)")
  })

  it('limits document reads to auth.uid()', async () => {
    const user1 = crypto.randomUUID()
    const user2 = crypto.randomUUID()

    await prisma.user.createMany({
      data: [
        { id: user1, email: `${user1}@example.test` },
        { id: user2, email: `${user2}@example.test` },
      ],
    })

    await prisma.document.createMany({
      data: [
        { userId: user1, type: 'cv' },
        { userId: user1, type: 'personal_letter' },
        { userId: user2, type: 'cv' },
      ],
    })

    await client.query('SET ROLE authenticated')
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user1])

    const docs = await client.query<{ userId: string }>(
      'SELECT "userId" FROM "Document" ORDER BY "userId"'
    )

    expect(docs.rows.length).toBe(2)
    expect(new Set(docs.rows.map((row) => row.userId))).toEqual(new Set([user1]))
  })

  it('prevents updates to server-managed User fields but allows safe columns', async () => {
    const user1 = crypto.randomUUID()
    const user2 = crypto.randomUUID()

    await prisma.user.createMany({
      data: [
        { id: user1, email: `${user1}@example.test` },
        { id: user2, email: `${user2}@example.test` },
      ],
    })

    await client.query('SET ROLE authenticated')
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user1])

    await expect(
      client.query('UPDATE "User" SET tier = $1::"UserTier" WHERE id = $2', ['PRO', user1])
    ).rejects.toThrow()

    const updateOwnName = await client.query(
      'UPDATE "User" SET name = $1 WHERE id = $2',
      ['Alice', user1]
    )
    expect(updateOwnName.rowCount).toBe(1)

    const updateOther = await client.query(
      'UPDATE "User" SET name = $1 WHERE id = $2',
      ['Mallory', user2]
    )
    expect(updateOther.rowCount).toBe(0)

    const refreshed = await prisma.user.findUnique({ where: { id: user1 } })
    expect(refreshed?.name).toBe('Alice')
  })

  it('prevents inserting documents for another user', async () => {
    const user1 = crypto.randomUUID()
    const user2 = crypto.randomUUID()

    await prisma.user.createMany({
      data: [
        { id: user1, email: `${user1}@example.test` },
        { id: user2, email: `${user2}@example.test` },
      ],
    })

    await client.query('SET ROLE authenticated')
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user1])

    await expect(
      client.query(
        'INSERT INTO "Document" ("userId", "type") VALUES ($1, $2::"DocumentType")',
        [user2, 'cv']
      )
    ).rejects.toThrow()
  })
})
