# Job Skills Catalog Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand job skill extraction from ~30 hardcoded tech skills to cross-industry coverage using AF's synonym dictionary API with a static fallback catalog.

**Architecture:** New `/api/skills/catalog` route fetches AF synonym dictionary and caches 24h. `extractJobSkills()` accepts optional catalog param. `JobSearch.tsx` fetches catalog on mount and passes to extraction. Empty-state shown when no skills found.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Vitest, next-intl

---

### Task 1: Export and parameterize extractJobSkills catalog

**Files:**
- Modify: `lib/scoring.ts:16-47` (export catalog), `lib/scoring.ts:132-141` (add param)
- Test: `lib/scoring.test.ts`

**Step 1: Write the failing test**

Add to `lib/scoring.test.ts` inside the `extractJobSkills` describe block:

```typescript
it('uses custom catalog when provided', () => {
  const customCatalog = ['Svetsning', 'Projektledning']
  const skills = extractJobSkills(
    {
      headline: 'Svetsare',
      description: 'Vi soker en erfaren svetsare med projektledning',
      occupation: 'Svetsare',
    },
    customCatalog
  )

  expect(skills).toEqual(expect.arrayContaining(['Svetsning', 'Projektledning']))
  expect(skills).not.toContain('JavaScript')
})

it('falls back to default catalog when no catalog provided', () => {
  const skills = extractJobSkills({
    headline: 'Backend Developer',
    description: 'Build services with Node.js and Docker',
    occupation: 'Developer',
  })

  expect(skills).toEqual(expect.arrayContaining(['Node.js', 'Docker']))
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- scoring.test`
Expected: FAIL — `extractJobSkills` does not accept a second argument (TypeScript error or wrong results for custom catalog)

**Step 3: Write minimal implementation**

In `lib/scoring.ts`:

1. Export the catalog constant (change `const` to `export const`):
```typescript
export const DEFAULT_JOB_SKILL_CATALOG = [
  // ... existing entries unchanged
] as const
```

2. Add optional `catalog` parameter to `extractJobSkills`:
```typescript
export function extractJobSkills(
  job: JobTextFields,
  catalog?: readonly string[]
): string[] {
  const text = buildJobText(job)
  if (!text) return []

  const candidates = dedupeSkills(catalog ?? DEFAULT_JOB_SKILL_CATALOG)

  return candidates.filter((skill) => hasSkillMatch(text, skill))
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- scoring.test`
Expected: ALL PASS (new tests + existing ones unchanged)

**Step 5: Commit**

```bash
git add lib/scoring.ts lib/scoring.test.ts
git commit -m "feat: parameterize extractJobSkills to accept custom catalog"
```

---

### Task 2: Expand DEFAULT_JOB_SKILL_CATALOG with cross-industry skills

**Files:**
- Modify: `lib/scoring.ts:16-47` (expand array)
- Test: `lib/scoring.test.ts`

**Step 1: Write the failing test**

Add to `lib/scoring.test.ts` inside `extractJobSkills` describe:

```typescript
it('extracts Swedish soft skills from default catalog', () => {
  const skills = extractJobSkills({
    headline: 'Projektledare',
    description: 'Vi soker en projektledare med erfarenhet av ledarskap och kommunikation',
    occupation: 'Projektledare',
  })

  expect(skills).toEqual(
    expect.arrayContaining(['Projektledning', 'Ledarskap', 'Kommunikation'])
  )
})

it('extracts healthcare skills from default catalog', () => {
  const skills = extractJobSkills({
    headline: 'Sjukskoterska',
    description: 'Erfarenhet av omvardnad och journalforing kravs',
    occupation: 'Sjukskoterska',
  })

  expect(skills.length).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- scoring.test`
Expected: FAIL — default catalog doesn't have Swedish soft/healthcare skills yet

**Step 3: Write minimal implementation**

Replace `DEFAULT_JOB_SKILL_CATALOG` in `lib/scoring.ts` with an expanded cross-industry list. Keep `as const` assertion. Organize entries by category using comments:

```typescript
export const DEFAULT_JOB_SKILL_CATALOG = [
  // --- Programming Languages ---
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C',
  'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
  'R', 'MATLAB', 'Perl',

  // --- Web & Frontend ---
  'React', 'Next.js', 'Angular', 'Vue', 'Svelte',
  'HTML', 'CSS', 'Tailwind', 'SASS', 'Bootstrap',

  // --- Backend & Runtime ---
  'Node.js', '.NET', 'Spring', 'Django', 'Flask', 'Express',
  'FastAPI', 'Ruby on Rails',

  // --- Databases ---
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Elasticsearch', 'Oracle', 'SQLite', 'DynamoDB', 'Cassandra',

  // --- Cloud & DevOps ---
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Terraform', 'Ansible', 'Jenkins', 'CI/CD',
  'Linux', 'Bash', 'Git', 'GitHub', 'GitLab',

  // --- Data & AI ---
  'Machine Learning', 'AI', 'Deep Learning', 'NLP',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy',
  'Power BI', 'Tableau', 'Data Analysis',
  'ETL', 'Data Warehouse', 'Spark', 'Hadoop',
  'Business Intelligence',

  // --- APIs & Architecture ---
  'REST', 'GraphQL', 'Microservices', 'API',
  'RabbitMQ', 'Kafka', 'gRPC',

  // --- Mobile ---
  'React Native', 'Flutter', 'iOS', 'Android',

  // --- Testing ---
  'Unit Testing', 'Integration Testing', 'Selenium',
  'Cypress', 'Jest', 'Playwright',

  // --- Design & UX ---
  'Figma', 'Sketch', 'Adobe XD', 'UX', 'UI',
  'Photoshop', 'Illustrator', 'InDesign',

  // --- Project & Methodology ---
  'Agile', 'Scrum', 'Kanban', 'PRINCE2', 'PMP',
  'ITIL', 'DevOps', 'Lean', 'Six Sigma',
  'Projektledning', 'Projektstyrning',

  // --- Soft Skills (Swedish) ---
  'Ledarskap', 'Kommunikation', 'Teamwork',
  'Problemlosning', 'Samarbete', 'Initiativformaga',
  'Flexibilitet', 'Ansvarstagande', 'Organisationsformaga',
  'Analytisk formaga', 'Kreativitet', 'Forhandling',

  // --- Soft Skills (English) ---
  'Leadership', 'Communication', 'Problem Solving',
  'Teamwork', 'Collaboration', 'Critical Thinking',
  'Time Management', 'Negotiation', 'Presentation',

  // --- Business & Finance ---
  'Excel', 'SAP', 'ERP', 'CRM', 'Salesforce',
  'Bokforing', 'Redovisning', 'Ekonomi', 'Budget',
  'Fakturering', 'Lonehantering', 'Controller',
  'Revision', 'Accounting', 'Finance', 'Controlling',

  // --- Office & Admin ---
  'Microsoft Office', 'Word', 'PowerPoint', 'Outlook',
  'Google Workspace', 'SharePoint', 'Teams',
  'Administration', 'Upphandling',

  // --- Sales & Marketing ---
  'Forsaljning', 'Marknadsforing', 'SEO', 'SEM',
  'Google Ads', 'Social Media', 'Content Marketing',
  'Kundservice', 'B2B', 'B2C', 'E-handel',
  'Nykundsbearbetning',

  // --- Healthcare (Swedish) ---
  'Omvardnad', 'Sjukvard', 'Medicin', 'Journalforing',
  'Patientsakerhet', 'Rehabilitering', 'Vardplanering',
  'Ambulanssjukvard', 'Intensivvard', 'Psykiatri',
  'Farmakologi', 'Hygienrutiner',

  // --- Education (Swedish) ---
  'Pedagogik', 'Undervisning', 'Didaktik',
  'Specialpedagogik', 'Forskola', 'Grundskola',
  'Gymnasium', 'Laroplaner', 'Bedomning',

  // --- Trades & Industry (Swedish) ---
  'Svetsning', 'CNC', 'CAD', 'CAM', 'SolidWorks',
  'AutoCAD', 'Elinstallation', 'VVS',
  'Mekanik', 'Hydraulik', 'Pneumatik',
  'Ritningslasning', 'Kvalitetskontroll',
  'ISO 9001', 'Maskinoperator', 'PLC',

  // --- Logistics & Transport ---
  'Logistik', 'Lagerhantering', 'Inkok',
  'Supply Chain', 'Fordonskorkort',
  'B-korkort', 'C-korkort', 'CE-korkort',
  'Truckkort', 'ADR', 'Spedition',

  // --- Legal & Public Sector ---
  'Juridik', 'Avtalsratt', 'Arbetsratt',
  'GDPR', 'Compliance', 'Offentlig upphandling',
  'Forvaltningsratt', 'Myndighetsutovning',

  // --- Construction ---
  'Byggledning', 'Projektering', 'BIM',
  'Betong', 'Trakonstruktion', 'Installationssamordning',
  'Bygglov', 'Arbetsmiljo',

  // --- Security & Networking ---
  'Cybersecurity', 'Network', 'Firewall',
  'Penetration Testing', 'SIEM', 'SOC',
  'ISO 27001', 'CCNA', 'TCP/IP',

  // --- Languages ---
  'Svenska', 'Engelska', 'Tyska', 'Franska', 'Spanska',
  'Arabiska', 'Mandarin',
] as const
```

> Note: Keep entries alphabetized within each category for readability. The exact entries above are a starting point — adjust as tests demand. Swedish terms use ASCII-safe spellings since `normalizeForSkillMatching` strips diacritics.

**Step 4: Run test to verify it passes**

Run: `npm run test -- scoring.test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/scoring.ts lib/scoring.test.ts
git commit -m "feat: expand skill catalog to cover cross-industry Swedish job market"
```

---

### Task 3: Create AF synonym dictionary service

**Files:**
- Create: `lib/services/jobtech-enrichments.ts`
- Test: `lib/services/jobtech-enrichments.test.ts`

**Step 1: Write the failing test**

Create `lib/services/jobtech-enrichments.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSkillCatalog } from './jobtech-enrichments'

describe('fetchSkillCatalog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns unique skill labels from AF synonym dictionary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          total: 3,
          items: [
            { concept_label: 'JavaScript', term: 'javascript', type: 'COMPETENCE' },
            { concept_label: 'Python', term: 'python', type: 'COMPETENCE' },
            { concept_label: 'JavaScript', term: 'js', type: 'COMPETENCE' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const skills = await fetchSkillCatalog()

    expect(skills).toContain('JavaScript')
    expect(skills).toContain('Python')
    expect(skills.filter((s) => s === 'JavaScript')).toHaveLength(1)
  })

  it('throws on non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Server Error', { status: 500 })
    )

    await expect(fetchSkillCatalog()).rejects.toThrow()
  })

  it('throws on invalid response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(fetchSkillCatalog()).rejects.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- jobtech-enrichments.test`
Expected: FAIL — module does not exist

**Step 3: Write minimal implementation**

Create `lib/services/jobtech-enrichments.ts`:

```typescript
import { z } from 'zod'

const AF_ENRICHMENTS_BASE = 'https://jobad-enrichments-api.jobtechdev.se'

const SynonymItemSchema = z.object({
  concept_label: z.string().min(1),
})

const SynonymDictionarySchema = z.object({
  items: z.array(SynonymItemSchema),
})

export async function fetchSkillCatalog(): Promise<string[]> {
  const url = `${AF_ENRICHMENTS_BASE}/synonymdictionary?type=COMPETENCE&spelling=CORRECTLY_SPELLED`

  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    throw new Error(`AF enrichments API error: ${response.status}`)
  }

  const json: unknown = await response.json()
  const parsed = SynonymDictionarySchema.parse(json)

  const uniqueLabels = new Map<string, string>()
  for (const item of parsed.items) {
    const label = item.concept_label.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (!uniqueLabels.has(key)) {
      uniqueLabels.set(key, label)
    }
  }

  return Array.from(uniqueLabels.values()).sort((a, b) =>
    a.localeCompare(b, 'sv')
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- jobtech-enrichments.test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/services/jobtech-enrichments.ts lib/services/jobtech-enrichments.test.ts
git commit -m "feat: add AF synonym dictionary service for skill catalog"
```

---

### Task 4: Create /api/skills/catalog route with caching

**Files:**
- Create: `app/api/skills/catalog/route.ts`
- Test: `app/api/skills/catalog/route.test.ts`

**Step 1: Write the failing test**

Create `app/api/skills/catalog/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchSkillCatalog: vi.fn(),
}))

vi.mock('@/lib/services/jobtech-enrichments', () => ({
  fetchSkillCatalog: mocks.fetchSkillCatalog,
}))

import { GET } from './route'

describe('GET /api/skills/catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns skills from AF when available', async () => {
    mocks.fetchSkillCatalog.mockResolvedValue(['JavaScript', 'Python', 'React'])

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(expect.arrayContaining(['JavaScript', 'Python', 'React']))
  })

  it('returns fallback catalog when AF fails', async () => {
    mocks.fetchSkillCatalog.mockRejectedValue(new Error('AF down'))

    const res = await GET()
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
    expect(json.data).toEqual(expect.arrayContaining(['JavaScript']))
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- catalog/route.test`
Expected: FAIL — module does not exist

**Step 3: Write minimal implementation**

Create `app/api/skills/catalog/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { fetchSkillCatalog } from '@/lib/services/jobtech-enrichments'
import { DEFAULT_JOB_SKILL_CATALOG } from '@/lib/scoring'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let cachedCatalog: { data: string[]; timestamp: number } | null = null

export async function GET() {
  const now = Date.now()

  if (cachedCatalog && now - cachedCatalog.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cachedCatalog.data })
  }

  try {
    const skills = await fetchSkillCatalog()

    if (skills.length > 0) {
      cachedCatalog = { data: skills, timestamp: now }
      return NextResponse.json({ success: true, data: skills })
    }
  } catch {
    // Fall through to static fallback
  }

  const fallback = Array.from(DEFAULT_JOB_SKILL_CATALOG)
  return NextResponse.json({ success: true, data: fallback })
}
```

> Note: This route has no auth requirement — the catalog is public data. No rate limiting needed since it's cached.

**Step 4: Run test to verify it passes**

Run: `npm run test -- catalog/route.test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add app/api/skills/catalog/route.ts app/api/skills/catalog/route.test.ts
git commit -m "feat: add /api/skills/catalog route with AF + static fallback"
```

---

### Task 5: Wire catalog fetch into JobSearch.tsx

**Files:**
- Modify: `components/jobs/JobSearch.tsx:11` (import), `components/jobs/JobSearch.tsx:121-142` (state), `components/jobs/JobSearch.tsx:608-619` (useMemo)
- Test: `components/jobs/JobSearch.test.tsx`

**Step 1: Update existing test mocks to handle catalog fetch**

All existing `mockFetchWith*` functions in `JobSearch.test.tsx` use `vi.spyOn(globalThis, 'fetch')`. They need to also handle the new `/api/skills/catalog` URL. Add a handler for it in each mock function, right after the `/api/documents` handler:

```typescript
if (url.startsWith('/api/skills/catalog')) {
  return Promise.resolve(
    new Response(
      JSON.stringify({ success: true, data: [] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  )
}
```

> Add this block inside **every** `mockFetchWith*` function, before the `/api/jobs/save` handler. Returning an empty array means the default catalog is used (same behavior as before).

**Step 2: Run existing tests to verify they still pass**

Run: `npm run test -- JobSearch.test`
Expected: ALL PASS (existing behavior unchanged; empty catalog response = uses default)

**Step 3: Add test for custom catalog integration**

Add to `JobSearch.test.tsx`:

```typescript
function mockFetchWithCatalogAndJob() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: ['Svetsning'] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: ['Svetsning', 'Projektledning', 'CNC'],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/save') {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    if (url.startsWith('/api/jobs')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              hits: [
                {
                  id: '20',
                  headline: 'CNC-operatör',
                  occupation: { label: 'Maskinoperatör' },
                  description: { text: 'Vi söker CNC-operatör med erfarenhet av svetsning och projektledning' },
                  workplace_address: { region: 'Göteborg' },
                  publication_date: '2026-01-01T10:00:00.000Z',
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}
```

Then add the test:

```typescript
it('uses fetched catalog for job skill extraction', async () => {
  const user = userEvent.setup()
  mockFetchWithCatalogAndJob()

  render(<JobSearch />)

  await screen.findByText(/1\/1 skills selected/i)
  await user.click(screen.getByRole('button', { name: /^search$/i }))

  expect(await screen.findByRole('link', { name: 'CNC-operatör' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /show job skills/i }))

  const skillContainer = await screen.findByTestId('job-skills-20')
  expect(within(skillContainer).getByText('Svetsning')).toBeInTheDocument()
  expect(within(skillContainer).getByText('Projektledning')).toBeInTheDocument()
  expect(within(skillContainer).getByText('CNC')).toBeInTheDocument()
})
```

**Step 4: Run test to verify it fails**

Run: `npm run test -- JobSearch.test`
Expected: FAIL — JobSearch doesn't fetch catalog yet, so custom skills won't be extracted

**Step 5: Implement catalog fetching in JobSearch.tsx**

Add new state and effect in `JobSearch.tsx`:

After line 141 (`const [itemsPerPage, setItemsPerPage] = useState(20)`), add:

```typescript
const [skillCatalog, setSkillCatalog] = useState<string[] | null>(null)
```

After the "Load skills from user's CV" effect (after line 253), add a new effect:

```typescript
// Load skill catalog for job skill extraction
useEffect(() => {
  let active = true

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/skills/catalog')
      const json: unknown = await res.json()

      if (
        active &&
        json &&
        typeof json === 'object' &&
        'success' in json &&
        (json as { success: boolean }).success &&
        'data' in json &&
        Array.isArray((json as { data: unknown }).data)
      ) {
        setSkillCatalog((json as { data: string[] }).data)
      }
    } catch {
      // Silent failure — extractJobSkills uses default catalog
    }
  }

  void loadCatalog()

  return () => {
    active = false
  }
}, [])
```

Update the `extractedSkillsByJob` memo (around line 608) to pass the catalog:

```typescript
const extractedSkillsByJob = useMemo(() => {
  return Object.fromEntries(
    jobs.map((job) => [
      job.id,
      extractJobSkills(
        {
          headline: job.headline,
          description: job.description?.text,
          occupation: job.occupation?.label,
        },
        skillCatalog ?? undefined
      ),
    ])
  )
}, [jobs, skillCatalog])
```

**Step 6: Run all tests to verify they pass**

Run: `npm run test -- JobSearch.test`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add components/jobs/JobSearch.tsx components/jobs/JobSearch.test.tsx
git commit -m "feat: fetch skill catalog on mount and use for job extraction"
```

---

### Task 6: Add empty state for job skills in SearchResults

**Files:**
- Modify: `components/jobs/SearchResults.tsx:175-206`
- Modify: `messages/en.json` (add `noJobSkills` key)
- Modify: `messages/sv.json` (add `noJobSkills` key)
- Test: `components/jobs/JobSearch.test.tsx`

**Step 1: Add i18n keys**

In `messages/en.json`, inside the `"jobs"` object, after `"hideJobSkills"` line (around line 186):
```json
"noJobSkills": "No skills found for this job",
```

In `messages/sv.json`, inside the `"jobs"` object, after `"hideJobSkills"` line:
```json
"noJobSkills": "Inga kompetenser hittades for detta jobb",
```

**Step 2: Write the failing test**

Add a mock function and test to `JobSearch.test.tsx`:

```typescript
function mockFetchWithNoSkillJob() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : input.toString()

    if (url === '/api/documents') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: [{ id: 'doc-1', type: 'cv', skills: [] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url.startsWith('/api/skills/catalog')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: [] }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    if (url === '/api/jobs/save') {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    }

    if (url.startsWith('/api/jobs')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              hits: [
                {
                  id: '30',
                  headline: 'Truck Driver',
                  description: { text: 'Drive trucks across Sweden' },
                  workplace_address: { region: 'Stockholm' },
                  publication_date: '2026-01-01T10:00:00.000Z',
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    }

    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}
```

Then the test:

```typescript
it('shows empty state message when job has no extracted skills', async () => {
  const user = userEvent.setup()
  mockFetchWithNoSkillJob()

  render(<JobSearch />)

  const searchInput = await screen.findByPlaceholderText(/search by job title/i)
  await user.type(searchInput, 'truck driver')
  await user.click(screen.getByRole('button', { name: /^search$/i }))

  expect(await screen.findByRole('link', { name: 'Truck Driver' })).toBeInTheDocument()

  // Button should be visible even with no skills
  const showButton = screen.getByRole('button', { name: /show job skills/i })
  expect(showButton).toBeInTheDocument()

  await user.click(showButton)

  expect(screen.getByText(/no skills found for this job/i)).toBeInTheDocument()
})
```

**Step 3: Run test to verify it fails**

Run: `npm run test -- JobSearch.test`
Expected: FAIL — button not found because `hasExtractedSkills` is false so the whole block is hidden

**Step 4: Implement empty state**

In `SearchResults.tsx`, replace lines 175-206 (the `{hasExtractedSkills ? (...) : null}` block) with:

```tsx
<div className="mt-2 space-y-2 px-1">
  <button
    type="button"
    onClick={() => toggleMatchedSkills(job.id)}
    className="text-[11px] font-medium text-primary hover:underline"
  >
    {isExpanded ? t('hideJobSkills') : t('showJobSkills')}
  </button>

  {isExpanded ? (
    hasExtractedSkills ? (
      <div className="flex flex-wrap gap-1.5" data-testid={`job-skills-${job.id}`}>
        {extractedSkills.map((skill) => {
          const isMatched = matchedSkillSet.has(skill.toLowerCase())

          return (
            <span
              key={`${job.id}-${skill}`}
              className={
                isMatched
                  ? 'inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'
                  : 'inline-flex items-center rounded-md border border-border/60 bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'
              }
            >
              {skill}
            </span>
          )
        })}
      </div>
    ) : (
      <p className="text-[11px] text-muted-foreground">{t('noJobSkills')}</p>
    )
  ) : null}
</div>
```

Key changes:
- Button is always rendered (no longer inside `hasExtractedSkills` conditional)
- When expanded, check `hasExtractedSkills` — if false, show the empty-state message
- Remove the `hasExtractedSkills` variable from the outer conditional is not needed since we removed it

**Step 5: Run all tests to verify they pass**

Run: `npm run test -- JobSearch.test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add components/jobs/SearchResults.tsx messages/en.json messages/sv.json components/jobs/JobSearch.test.tsx
git commit -m "feat: show job skills button always with empty state message"
```

---

### Task 7: Add matched vs unmatched highlighting test

**Files:**
- Test: `components/jobs/JobSearch.test.tsx`

**Step 1: Write the test**

The existing test `'shows all extracted job skills when expanded, including unmatched ones'` partially covers this. Add an explicit highlighting assertion. Add to `JobSearch.test.tsx`:

```typescript
it('highlights matched skills differently from unmatched skills', async () => {
  const user = userEvent.setup()
  mockFetchWithSkillMatchedJob()

  render(<JobSearch />)

  await screen.findByText(/1\/1 skills selected/i)
  await user.click(screen.getByRole('button', { name: /^search$/i }))

  expect(await screen.findByRole('link', { name: 'Backend Developer' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /show job skills/i }))

  const skillContainer = await screen.findByTestId('job-skills-10')
  const nodeChip = within(skillContainer).getByText('Node.js')
  const dockerChip = within(skillContainer).getByText('Docker')

  // Node.js is a CV skill → matched → primary styling
  expect(nodeChip.className).toContain('bg-primary/10')
  expect(nodeChip.className).toContain('text-primary')

  // Docker is NOT a CV skill → unmatched → secondary styling
  expect(dockerChip.className).toContain('bg-secondary/80')
  expect(dockerChip.className).toContain('text-muted-foreground')
})
```

**Step 2: Run test to verify it passes**

Run: `npm run test -- JobSearch.test`
Expected: PASS — the implementation already applies these classes based on match status

> This test codifies existing behavior. It should pass immediately since the highlighting logic is already implemented in `SearchResults.tsx:188-197`.

**Step 3: Commit**

```bash
git add components/jobs/JobSearch.test.tsx
git commit -m "test: add explicit assertion for matched vs unmatched skill highlighting"
```

---

### Task 8: Run full test suite and verify build

**Files:** None (verification only)

**Step 1: Run full test suite**

Run: `npm run test`
Expected: ALL PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

**Step 4: Fix any issues found**

If any test, build, or lint errors appear, fix them before proceeding.

**Step 5: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "fix: resolve build/lint issues from skill catalog expansion"
```
