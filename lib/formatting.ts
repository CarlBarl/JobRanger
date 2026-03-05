export function resolveIntlLocale(locale?: string | null) {
  if (!locale) return 'en'
  return locale
}

export function formatShortDate(value: string | Date | null | undefined, locale?: string | null) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined, locale?: string | null) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
