import { GoogleGenerativeAI } from '@google/generative-ai'

type GenerateCoverLetterInput = {
  cvContent: string
  jobTitle: string
  jobDescription: string
  companyName?: string
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return apiKey
}

function getModel() {
  const genAI = new GoogleGenerativeAI(getApiKey())
  return genAI.getGenerativeModel({ model: 'gemini-pro' })
}

export async function generateCoverLetter(
  input: GenerateCoverLetterInput
): Promise<string> {
  const model = getModel()

  const prompt = `
You are an expert Swedish job application writer.

Write a tailored cover letter based on the CV and the job description.
- Match tone/language to the job ad.
- Keep it concise (250-400 words).
- Use concrete examples from the CV.

Job title:
${input.jobTitle}

Company (if known):
${input.companyName ?? ''}

Job description:
${input.jobDescription}

CV:
${input.cvContent}
`

  const result = await model.generateContent(prompt)
  // The SDK returns a response object with a `.text()` method.
  // `await` is safe even if the property is not a Promise (tests mock it as plain object).
  const response = await result.response
  return response.text()
}

export async function extractSkillsFromCV(cvContent: string): Promise<string[]> {
  const model = getModel()

  const prompt = `
Extract professional skills from this CV.
Return ONLY a JSON array of strings, like:
["skill 1","skill 2"]

CV:
${cvContent}
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  try {
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

