# API Reference

This document covers the external APIs integrated into JobMatch.

---

## Arbetsförmedlingen JobSearch API

The Swedish Employment Agency's open API for job listings.

### Overview

| Property | Value |
|----------|-------|
| Base URL | `https://jobsearch.api.jobtechdev.se` |
| Auth | API key in header |
| Format | JSON |
| Rate Limit | Reasonable use (no hard limit published) |
| Documentation | https://jobsearch.api.jobtechdev.se (Swagger UI) |

### Getting an API Key

1. Visit https://apirequest.jobtechdev.se
2. Register for an account
3. Request an API key
4. Add to `.env.local` as `AF_API_KEY`

### Authentication

Include API key in request header:

```
api-key: your_api_key_here
```

### Endpoints

#### Search Jobs

```
GET /search
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Free text search query |
| `occupation` | string | Occupation ID from taxonomy |
| `occupation-field` | string | Occupation field ID |
| `occupation-group` | string | Occupation group ID |
| `municipality` | string | Municipality ID |
| `region` | string | Region ID |
| `country` | string | Country code |
| `published-after` | date | Filter by publish date |
| `offset` | number | Pagination offset |
| `limit` | number | Results per page (max 100) |

**Example Request:**

```bash
curl "https://jobsearch.api.jobtechdev.se/search?q=developer&limit=10" \
  -H "accept: application/json" \
  -H "api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "total": {
    "value": 1234
  },
  "positions": 1234,
  "query_time_in_millis": 45,
  "result_time_in_millis": 67,
  "hits": [
    {
      "id": "12345678",
      "headline": "Software Developer",
      "application_deadline": "2024-03-01",
      "employer": {
        "name": "Tech Company AB",
        "url": "https://example.com"
      },
      "workplace_address": {
        "municipality": "Stockholm",
        "region": "Stockholms län",
        "country": "Sverige"
      },
      "description": {
        "text": "We are looking for...",
        "text_formatted": "<p>We are looking for...</p>"
      },
      "employment_type": {
        "label": "Tillsvidareanställning"
      },
      "working_hours_type": {
        "label": "Heltid"
      },
      "salary_type": {
        "label": "Fast månads- vecko- eller timlön"
      },
      "publication_date": "2024-01-15T10:00:00",
      "last_publication_date": "2024-03-01T23:59:59",
      "logo_url": "https://...",
      "application_details": {
        "url": "https://apply.example.com",
        "email": "jobs@example.com"
      }
    }
  ]
}
```

#### Get Single Job Ad

```
GET /ad/{id}
```

Returns full details of a specific job ad.

#### Get Company Logo

```
GET /ad/{id}/logo
```

Returns the company logo image. Returns 1x1 white pixel if no logo exists.

### Taxonomy API

For structured searches, use taxonomy IDs:

**Get occupation names:**
```
GET /taxonomy/search?type=occupation-name&q=utvecklare
```

**Get locations:**
```
GET /taxonomy/search?type=municipality&q=stockholm
```

### Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (invalid/missing API key) |
| 429 | Rate limited |
| 500 | Server error |

### Integration Code Example

```typescript
// lib/arbetsformedlingen.ts

const AF_BASE_URL = 'https://jobsearch.api.jobtechdev.se'

interface SearchOptions {
  query?: string
  occupation?: string
  municipality?: string
  limit?: number
  offset?: number
}

interface JobHit {
  id: string
  headline: string
  employer: {
    name: string
  }
  workplace_address: {
    municipality: string
  }
  description: {
    text: string
  }
  publication_date: string
  application_deadline: string
}

interface SearchResponse {
  total: { value: number }
  hits: JobHit[]
}

export async function searchJobs(options: SearchOptions): Promise<SearchResponse> {
  const params = new URLSearchParams()
  
  if (options.query) params.set('q', options.query)
  if (options.occupation) params.set('occupation', options.occupation)
  if (options.municipality) params.set('municipality', options.municipality)
  params.set('limit', String(options.limit || 20))
  params.set('offset', String(options.offset || 0))

  const response = await fetch(`${AF_BASE_URL}/search?${params}`, {
    headers: {
      'accept': 'application/json',
      'api-key': process.env.AF_API_KEY!,
    },
  })

  if (!response.ok) {
    throw new Error(`AF API error: ${response.status}`)
  }

  return response.json()
}

export async function getJobById(id: string): Promise<JobHit> {
  const response = await fetch(`${AF_BASE_URL}/ad/${id}`, {
    headers: {
      'accept': 'application/json',
      'api-key': process.env.AF_API_KEY!,
    },
  })

  if (!response.ok) {
    throw new Error(`AF API error: ${response.status}`)
  }

  return response.json()
}
```

---

## Gemini AI API

Google's generative AI for text generation.

### Overview

| Property | Value |
|----------|-------|
| Package | `@google/generative-ai` |
| Model | `gemini-pro` |
| Free Tier | Yes (rate limited) |
| Documentation | https://ai.google.dev |

### Setup

1. Get API key from https://makersuite.google.com/app/apikey
2. Add to `.env.local` as `GEMINI_API_KEY`
3. Install package: `npm install @google/generative-ai`

### Integration Code Example

```typescript
// lib/gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface GenerateLetterOptions {
  cvContent: string
  baseLetterContent: string
  jobDescription: string
  jobTitle: string
  companyName: string
}

export async function generateCoverLetter(
  options: GenerateLetterOptions
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `
You are a professional career advisor helping someone write a cover letter.

Based on the following information, write a personalized cover letter:

## Candidate's CV:
${options.cvContent}

## Candidate's base cover letter (use as tone/style reference):
${options.baseLetterContent}

## Job Details:
- Title: ${options.jobTitle}
- Company: ${options.companyName}
- Description: ${options.jobDescription}

## Instructions:
1. Match the candidate's relevant experience to the job requirements
2. Keep the tone professional but personable
3. Highlight specific skills mentioned in both CV and job description
4. Keep it concise (250-400 words)
5. Include a strong opening and closing
6. Write in the same language as the job description

Generate the cover letter:
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function extractSkillsFromCV(cvContent: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `
Extract all professional skills from this CV. Return only a JSON array of skill strings.

CV Content:
${cvContent}

Return format: ["skill1", "skill2", "skill3", ...]
Only return the JSON array, nothing else.
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()
  
  try {
    return JSON.parse(text)
  } catch {
    // Fallback if response isn't valid JSON
    return []
  }
}
```

### Rate Limits (Free Tier)

| Limit | Value |
|-------|-------|
| Requests per minute | 60 |
| Tokens per minute | 60,000 |
| Requests per day | 1,500 |

### Best Practices

1. **Handle rate limits gracefully**
   ```typescript
   try {
     return await generateCoverLetter(options)
   } catch (error) {
     if (error.message.includes('429')) {
       // Rate limited, wait and retry
       await sleep(60000)
       return await generateCoverLetter(options)
     }
     throw error
   }
   ```

2. **Keep prompts focused**
   - Be specific about what you want
   - Provide context but don't overload
   - Use structured output formats (JSON)

3. **Validate outputs**
   - Don't trust AI output blindly
   - Check for expected format
   - Have fallback behavior

---

## Supabase

Backend-as-a-service for database and storage.

### Overview

| Service | Use Case |
|---------|----------|
| Database | User data, saved jobs, generated letters |
| Storage | CV and cover letter file uploads |
| Auth | User authentication (future) |

### Setup

1. Create project at https://supabase.com
2. Get credentials from project settings
3. Add to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
   ```

### Database Access via Prisma

We use Prisma as ORM instead of Supabase client for database queries:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

### Storage for File Uploads

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}
```

### Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `documents` | CV and cover letter files | No |
| `avatars` | User profile pictures | Yes |

### Security Rules

Configure Row Level Security (RLS) in Supabase dashboard:

```sql
-- Users can only access their own documents
CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (auth.uid() = user_id);
```

---

## Environment Variables

Complete list of required environment variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anonymous key (public)
SUPABASE_SERVICE_ROLE_KEY=     # Supabase service role key (secret)

# Database
DATABASE_URL=                   # PostgreSQL connection string

# Arbetsförmedlingen
AF_API_KEY=                     # JobSearch API key

# Gemini AI
GEMINI_API_KEY=                 # Google AI API key

# App
NEXT_PUBLIC_APP_URL=           # Your app URL (localhost:3000 for dev)
```
