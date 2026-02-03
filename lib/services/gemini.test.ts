import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  getGenerativeModel: vi.fn(),
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor(apiKey: string) {
      void apiKey
    }
    getGenerativeModel = mocks.getGenerativeModel
  },
}))

import { extractSkillsFromCV, generateCoverLetter } from './gemini'

const text = vi.fn()
const generateContent = vi.fn()

describe('gemini client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'gem-key'

    text.mockReset()
    generateContent.mockReset()

    mocks.getGenerativeModel.mockReset()
    mocks.getGenerativeModel.mockReturnValue({ generateContent })
  })

  it('extractSkillsFromCV parses JSON array', async () => {
    text.mockReturnValue('["TypeScript","React"]')
    generateContent.mockResolvedValue({ response: { text } })

    await expect(extractSkillsFromCV('cv')).resolves.toEqual([
      'TypeScript',
      'React',
    ])
  })

  it('extractSkillsFromCV returns [] on invalid JSON', async () => {
    text.mockReturnValue('not-json')
    generateContent.mockResolvedValue({ response: { text } })

    await expect(extractSkillsFromCV('cv')).resolves.toEqual([])
  })

  it('generateCoverLetter returns model output', async () => {
    text.mockReturnValue('Hello')
    generateContent.mockResolvedValue({ response: { text } })

    await expect(
      generateCoverLetter({
        cvContent: 'cv',
        jobDescription: 'jd',
        jobTitle: 'jt',
      })
    ).resolves.toBe('Hello')
  })
})
