const DIACRITIC_REGEX = /[\u0300-\u036f]/g
const SEPARATOR_REGEX = /[./_-]+/g
const SPACE_REGEX = /\s+/g

export function normalizeSkillKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(DIACRITIC_REGEX, '')
    .toLowerCase()
    .replace(SEPARATOR_REGEX, ' ')
    .replace(SPACE_REGEX, ' ')
    .trim()
}

export function tokenizeSkillKey(key: string): string[] {
  return key.split(' ').filter(Boolean)
}

