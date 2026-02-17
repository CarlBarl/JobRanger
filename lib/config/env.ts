const NODE_ENV = process.env.NODE_ENV

function normalizeEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function readEnv(name: string): string | undefined {
  return normalizeEnv(process.env[name])
}

export function requireEnv(name: string): string {
  const value = readEnv(name)
  if (value) return value
  throw new Error(`${name} is not set`)
}

export function requireEnvInProduction(name: string, fallback?: string): string {
  const value = readEnv(name)
  if (value) return value

  if (NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`)
  }

  if (fallback) return fallback

  throw new Error(`${name} is not set`)
}

export function readCsvEnv(name: string): string[] {
  const value = readEnv(name)
  if (!value) return []

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}
