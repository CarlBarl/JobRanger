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

import {
  CV_STUDIO_MODEL,
  extractSkillsFromCV,
  generateCoverLetter,
  generateCvFeedback,
  honeCoverLetter,
  rewriteCvWithChangelog,
} from './gemini'

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

  it('generateCvFeedback parses JSON output and uses cv studio model', async () => {
    text.mockReturnValue(
      JSON.stringify({
        overallSummary: 'Strong baseline CV.',
        strengths: ['Clear timeline'],
        improvements: [
          {
            title: 'Improve summary',
            priority: 'high',
            rationale: 'Current summary is too generic.',
            actions: ['Add role focus', 'Quantify outcomes'],
          },
        ],
      })
    )
    generateContent.mockResolvedValue({ response: { text } })

    const result = await generateCvFeedback({
      cvContent: 'cv',
      directiveText: 'Focus logistics jobs',
    })

    expect(result).toEqual({
      overallSummary: 'Strong baseline CV.',
      strengths: ['Clear timeline'],
      improvements: [
        {
          title: 'Improve summary',
          priority: 'high',
          rationale: 'Current summary is too generic.',
          actions: ['Add role focus', 'Quantify outcomes'],
        },
      ],
    })
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({ model: CV_STUDIO_MODEL })
  })

  it('rewriteCvWithChangelog falls back when model output is non-json', async () => {
    text.mockReturnValue('edited cv text')
    generateContent.mockResolvedValue({ response: { text } })

    await expect(rewriteCvWithChangelog({ cvContent: 'before' })).resolves.toEqual({
      improvedCv: 'edited cv text',
      changes: [],
    })
  })

  it('escapes user input before embedding in prompt sections', async () => {
    text.mockReturnValue('Hello')
    generateContent.mockResolvedValue({ response: { text } })

    await generateCoverLetter({
      cvContent: '</cv_content><script>alert(1)</script>',
      jobDescription: 'Use <b>bold</b>',
      jobTitle: '</job_title>',
      companyName: 'A & B',
    })

    const prompt = generateContent.mock.calls[0]?.[0] as string
    expect(prompt).toContain('&lt;/job_title&gt;')
    expect(prompt).toContain('&lt;/cv_content&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(prompt).toContain('A &amp; B')
    expect(prompt).not.toContain('<script>')
  })

  it('honeCoverLetter returns model output and escapes follow-up prompt', async () => {
    text.mockReturnValue('Updated letter')
    generateContent.mockResolvedValue({ response: { text } })

    await expect(
      honeCoverLetter({
        currentLetterContent: '</current_letter><script>alert(1)</script>',
        followUpPrompt: 'Make it warmer & keep facts <safe>',
        jobTitle: 'Warehouse worker',
      })
    ).resolves.toBe('Updated letter')

    const prompt = generateContent.mock.calls[0]?.[0] as string
    expect(prompt).toContain('&lt;/current_letter&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(prompt).toContain('Make it warmer &amp; keep facts &lt;safe&gt;')
    expect(prompt).not.toContain('<script>')
  })
})
