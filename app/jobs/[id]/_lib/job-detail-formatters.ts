export function formatLocation(address?: {
  municipality?: string | null
  region?: string | null
  country?: string | null
} | null): string | null {
  if (!address) return null
  const parts = [address.municipality, address.region, address.country]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())

  const uniqueParts = parts.filter(
    (part, index) =>
      parts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index
  )

  return uniqueParts.length > 0 ? uniqueParts.join(', ') : null
}

export function formatAddressLine(address?: {
  street_address?: string | null
  postcode?: string | null
  city?: string | null
} | null): string | null {
  if (!address) return null
  const parts = [address.street_address, address.postcode, address.city]
    .filter((part): part is string => !!part && part.trim().length > 0)
    .map((part) => part.trim())
  return parts.length > 0 ? parts.join(', ') : null
}

export function formatDate(value?: string | null): string | null {
  if (!value || value.length < 10) return null
  return value.slice(0, 10)
}

export function isDeadlineSoon(deadline?: string | null): boolean {
  if (!deadline || deadline.length < 10) return false
  const deadlineDate = new Date(deadline.slice(0, 10))
  const now = new Date()
  const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 5
}

export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline || deadline.length < 10) return false
  const deadlineDate = new Date(deadline.slice(0, 10))
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return deadlineDate < now
}
