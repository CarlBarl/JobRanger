import { beforeEach, describe, expect, it, vi } from 'vitest'

function resetBillingEnv(nodeEnv: string) {
  process.env.NODE_ENV = nodeEnv
  delete process.env.NEXT_PUBLIC_APP_URL
  delete process.env.VERCEL_URL
}

async function loadResolveAppOrigin() {
  vi.resetModules()
  const mod = await import('./stripe')
  return mod.resolveAppOrigin
}

describe('resolveAppOrigin', () => {
  beforeEach(() => {
    resetBillingEnv('test')
  })

  it('uses NEXT_PUBLIC_APP_URL when set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/path?q=1'
    const resolveAppOrigin = await loadResolveAppOrigin()

    expect(resolveAppOrigin('http://localhost:3000')).toBe('https://app.example.com')
  })

  it('falls back to VERCEL_URL when NEXT_PUBLIC_APP_URL is missing', async () => {
    process.env.NODE_ENV = 'production'
    process.env.VERCEL_URL = 'jobranger-git-feature-123.vercel.app'
    const resolveAppOrigin = await loadResolveAppOrigin()

    expect(resolveAppOrigin('http://localhost:3000')).toBe('https://jobranger-git-feature-123.vercel.app')
  })

  it('returns fallback origin in production when both NEXT_PUBLIC_APP_URL and VERCEL_URL are missing', async () => {
    process.env.NODE_ENV = 'production'
    const resolveAppOrigin = await loadResolveAppOrigin()

    expect(resolveAppOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('returns fallback origin in non-production when NEXT_PUBLIC_APP_URL is invalid', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-valid-url'
    const resolveAppOrigin = await loadResolveAppOrigin()

    expect(resolveAppOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })
})
