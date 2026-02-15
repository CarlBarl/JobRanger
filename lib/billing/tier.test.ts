import { describe, expect, it } from 'vitest'
import { resolveTierFromEmail } from './tier'

describe('resolveTierFromEmail', () => {
  it('returns PRO for the configured pro email (case-insensitive)', () => {
    expect(resolveTierFromEmail('carlelelid@outlook.com')).toBe('PRO')
    expect(resolveTierFromEmail('CarleLelid@Outlook.com')).toBe('PRO')
  })

  it('returns FREE for all other emails', () => {
    expect(resolveTierFromEmail('someone@example.com')).toBe('FREE')
  })
})
