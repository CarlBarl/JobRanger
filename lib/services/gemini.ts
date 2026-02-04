import { GoogleGenerativeAI } from '@google/generative-ai'

export const GEMINI_MODEL = 'gemini-flash-lite-latest'

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }
  return apiKey
}

function getModel() {
  const genAI = new GoogleGenerativeAI(getApiKey())
  return genAI.getGenerativeModel({ model: GEMINI_MODEL })
}

export interface GenerateCoverLetterInput {
  cvContent: string
  personalLetterContent?: string
  jobTitle: string
  jobDescription: string
  companyName?: string
}

export async function generateCoverLetter(
  input: GenerateCoverLetterInput
): Promise<string> {
  const model = getModel()

  const personalLetterSection = input.personalLetterContent
    ? `
The applicant's existing personal letter (use this as a style and content reference):
---
${input.personalLetterContent}
---
`
    : ''

  const prompt = `You are a professional career advisor helping Swedish job seekers write compelling personal letters (personligt brev).

Generate a personal letter in Swedish for this job application. The letter should:
- Be 250-400 words
- Match the tone and style of the applicant's existing personal letter if provided
- Highlight relevant skills and experiences from the CV
- Show enthusiasm for this specific role and company
- Be professional yet personable
- NOT include placeholder text like [Your Name] or [Date]

Job Title: ${input.jobTitle}
Company: ${input.companyName || 'the company'}
Job Description:
${input.jobDescription}

Applicant's CV content:
${input.cvContent}
${personalLetterSection}
Write the personal letter now:`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text()
}

export async function extractSkillsFromCV(cvContent: string): Promise<string[]> {
  const model = getModel()

  const prompt = `Analyze this CV/resume and extract a list of professional skills.
Return ONLY a JSON array of skill strings, nothing else.
Focus on technical skills, tools, languages, certifications, and competencies.

CV Content:
${cvContent}

Return only the JSON array:`

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text().trim()

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const skills = JSON.parse(cleaned)
    if (!Array.isArray(skills)) {
      console.error('Skills extraction did not return an array:', skills)
      return []
    }
    return skills.filter((s): s is string => typeof s === 'string')
  } catch (error) {
    console.error('Failed to parse skills JSON:', text, error)
    return []
  }
}

export async function chat(message: string): Promise<string> {
  const model = getModel()
  const result = await model.generateContent(message)
  const response = result.response
  return response.text()
}
