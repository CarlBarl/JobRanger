# Sprint Implementation Plan: Bug Fixes, Features & Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix production bugs, add save/relevance/filtering features to job search, and clean up the codebase foundation.

**Architecture:** All changes are incremental on the existing Next.js 14 App Router codebase. Bug fixes touch existing components. New features extend `JobSearch`/`JobCard` client components and add one utility function. One Prisma schema migration adds a field.

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS, Prisma, Vitest, next-intl

---

## Task 1: Fix Generate Letter UX — Redirect to /letters

**Files:**
- Modify: `components/jobs/JobActions.tsx:61-107`

**Step 1: Add router import and redirect**

In `JobActions.tsx`, add `useRouter` import and redirect after successful generation instead of showing raw ID.

Replace lines 1-3:
```tsx
'use client'

import { useCallback, useState } from 'react'
```
With:
```tsx
'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
```

Inside the component function (after line 33), add:
```tsx
const router = useRouter()
```

Replace lines 100-101 (the `setLetterId` line):
```tsx
      const id = (genJson.data as { id?: unknown }).id
      setLetterId(typeof id === 'string' ? id : t('actions.unknownId'))
```
With:
```tsx
      router.push('/letters')
```

Remove the `letterId` state entirely (line 32):
```tsx
const [letterId, setLetterId] = useState<string | null>(null)
```

Remove the letterId display in the JSX (lines 117-121):
```tsx
      {letterId ? (
        <span className="text-sm text-muted-foreground">
          {t('actions.generated', { id: letterId })}
        </span>
      ) : null}
```

**Step 2: Run existing tests**

Run: `npm test -- JobActions`
Expected: All existing JobActions tests pass (the letterId display was not tested).

**Step 3: Commit**

```bash
git add components/jobs/JobActions.tsx
git commit -m "fix: redirect to /letters after generating cover letter instead of showing raw ID"
```

---

## Task 2: Add jobTitle Field to GeneratedLetter + Display on Letters Page

**Files:**
- Modify: `prisma/schema.prisma:56-68`
- Modify: `app/api/generate/route.ts:86-93`
- Modify: `app/letters/page.tsx:34-38`
- Modify: `messages/en.json` (letters section)
- Modify: `messages/sv.json` (letters section)

**Step 1: Add jobTitle to Prisma schema**

In `prisma/schema.prisma`, add `jobTitle` field to `GeneratedLetter` model after `afJobId`:

```prisma
model GeneratedLetter {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  savedJobId String?
  savedJob   SavedJob? @relation(fields: [savedJobId], references: [id], onDelete: SetNull)
  afJobId    String
  jobTitle   String?
  content    String    @db.Text
  createdAt  DateTime  @default(now())

  @@index([userId])
  @@index([afJobId])
}
```

**Step 2: Push schema change**

Run: `npx prisma db push`
Then: `npx prisma generate`

**Step 3: Store jobTitle at generation time**

In `app/api/generate/route.ts`, modify the `prisma.generatedLetter.create` call (line 86-93) to include `jobTitle`:

```tsx
    const letter = await prisma.generatedLetter.create({
      data: {
        userId: user.id,
        savedJobId: savedJob?.id,
        afJobId,
        jobTitle: job.headline ?? null,
        content,
      },
    })
```

**Step 4: Update i18n — add jobTitleLabel key**

In `messages/en.json`, in the `letters` section, add after `"jobIdLabel"`:
```json
"jobTitleLabel": "Job"
```

In `messages/sv.json`, in the `letters` section, add after `"jobIdLabel"`:
```json
"jobTitleLabel": "Jobb"
```

**Step 5: Display jobTitle on letters page**

In `app/letters/page.tsx`, replace the CardHeader section (lines 35-38):

```tsx
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('jobIdLabel')}: {letter.afJobId}
                  </CardTitle>
                </CardHeader>
```

With:

```tsx
                <CardHeader>
                  <CardTitle className="text-base">
                    {letter.jobTitle ?? `${t('jobIdLabel')}: ${letter.afJobId}`}
                  </CardTitle>
                </CardHeader>
```

**Step 6: Run tests**

Run: `npm test -- letters`
Expected: Pass (if tests exist) or no tests to run.

**Step 7: Commit**

```bash
git add prisma/schema.prisma app/api/generate/route.ts app/letters/page.tsx messages/en.json messages/sv.json
git commit -m "feat: store and display job title on generated letters page"
```

---

## Task 3: Fix 14 Failing Tests

**Files:**
- Modify: `app/api/skills/batch/route.test.ts:14-21`
- Modify: `components/dashboard/BatchResultsModal.tsx:95`

### Step 1: Fix Prisma mock in batch route test

The test mocks `@/lib/prisma` as `default` export but the route uses named export `{ prisma }`. Fix the mock in `app/api/skills/batch/route.test.ts` (lines 14-21):

Replace:
```tsx
vi.mock('@/lib/prisma', () => ({
  default: {
    document: {
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))
```

With:
```tsx
vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))
```

Also fix the import on line 28:
Replace:
```tsx
import prisma from '@/lib/prisma'
```
With:
```tsx
import { prisma } from '@/lib/prisma'
```

### Step 2: Fix BatchResultsModal null check

In `components/dashboard/BatchResultsModal.tsx` line 95, `item.previousSkills` can be undefined when the API returns results without that field (the test data from the batch route includes `previousSkills` but the original batch route test data structure didn't).

Replace line 95:
```tsx
                          {item.previousSkills.length} → {item.newSkills.length} {t('dashboard.batchResults.skills')}
```
With:
```tsx
                          {(item.previousSkills ?? []).length} → {(item.newSkills ?? []).length} {t('dashboard.batchResults.skills')}
```

### Step 3: Run all tests

Run: `npm test`
Expected: All 139 tests pass, 0 failures.

### Step 4: Commit

```bash
git add app/api/skills/batch/route.test.ts components/dashboard/BatchResultsModal.tsx
git commit -m "fix: fix 14 failing tests - Prisma mock export and null check in BatchResultsModal"
```

---

## Task 4: Add Save/Unsave Button on Job Search Cards

**Files:**
- Modify: `components/jobs/JobCard.tsx`
- Modify: `components/jobs/JobSearch.tsx`
- Modify: `messages/en.json` (jobs section)
- Modify: `messages/sv.json` (jobs section)

### Step 1: Add i18n keys

In `messages/en.json`, add to the `jobs.card` section:
```json
"save": "Save",
"saved": "Saved",
"unsave": "Remove"
```

In `messages/sv.json`, add to the `jobs.card` section:
```json
"save": "Spara",
"saved": "Sparad",
"unsave": "Ta bort"
```

### Step 2: Add savedJobIds prop and save button to JobCard

Modify `components/jobs/JobCard.tsx`:

Update the props type to accept save state and callbacks:
```tsx
type JobCardProps = {
  job: Pick<
    AFJobHit,
    | 'id'
    | 'headline'
    | 'employer'
    | 'workplace_address'
    | 'logo_url'
    | 'webpage_url'
    | 'publication_date'
    | 'application_deadline'
    | 'employment_type'
    | 'working_hours_type'
    | 'occupation'
  >
  isSaved?: boolean
  onToggleSave?: (afJobId: string) => void
}
```

Update the component signature:
```tsx
export function JobCard({ job, isSaved = false, onToggleSave }: JobCardProps) {
```

Add a save button in the CardHeader, after the title/employer div:

```tsx
        <CardTitle className="text-base flex items-start gap-3">
          {job.logo_url ? (
            <img
              src={job.logo_url}
              alt={`${employerName} logo`}
              className="h-10 w-10 rounded object-contain border"
              loading="lazy"
            />
          ) : null}
          <div className="space-y-1 flex-1">
            <Link href={`/jobs/${job.id}`} className="hover:underline">
              {job.headline ?? t('card.untitledRole')}
            </Link>
            <p className="text-sm text-muted-foreground">{employerName}</p>
          </div>
          {onToggleSave ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleSave(job.id)
              }}
              className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
              aria-label={isSaved ? t('card.unsave') : t('card.save')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z"
                />
              </svg>
            </button>
          ) : null}
        </CardTitle>
```

### Step 3: Fetch saved jobs and wire up toggle in JobSearch

In `components/jobs/JobSearch.tsx`, add state for saved jobs:

```tsx
const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
```

Add a `useEffect` to fetch saved jobs on mount:
```tsx
  useEffect(() => {
    const loadSavedJobs = async () => {
      try {
        const res = await fetch('/api/jobs/save')
        const json: unknown = await res.json()
        if (isApiEnvelope(json) && json.success && Array.isArray(json.data)) {
          const ids = new Set(
            (json.data as Array<{ afJobId: string }>).map((j) => j.afJobId)
          )
          setSavedJobIds(ids)
        }
      } catch {
        // Silent fail — save buttons just won't show pre-saved state
      }
    }
    void loadSavedJobs()
  }, [])
```

Add a toggle handler:
```tsx
  const handleToggleSave = useCallback(async (afJobId: string) => {
    const wasSaved = savedJobIds.has(afJobId)

    // Optimistic update
    setSavedJobIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) {
        next.delete(afJobId)
      } else {
        next.add(afJobId)
      }
      return next
    })

    try {
      if (wasSaved) {
        // Find the savedJob ID to delete — need to fetch it
        const res = await fetch('/api/jobs/save')
        const json: unknown = await res.json()
        if (isApiEnvelope(json) && json.success && Array.isArray(json.data)) {
          const savedJob = (json.data as Array<{ id: string; afJobId: string }>).find(
            (j) => j.afJobId === afJobId
          )
          if (savedJob) {
            await fetch(`/api/jobs/save/${savedJob.id}`, { method: 'DELETE' })
          }
        }
      } else {
        await fetch('/api/jobs/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ afJobId }),
        })
      }
    } catch {
      // Revert optimistic update on failure
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) {
          next.add(afJobId)
        } else {
          next.delete(afJobId)
        }
        return next
      })
    }
  }, [savedJobIds])
```

Update the JobCard rendering to pass the new props:
```tsx
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedJobIds.has(job.id)}
              onToggleSave={handleToggleSave}
            />
          ))}
```

### Step 4: Run tests

Run: `npm test -- JobCard`
Run: `npm test -- JobSearch`
Expected: Existing tests pass (new props are optional with defaults).

### Step 5: Commit

```bash
git add components/jobs/JobCard.tsx components/jobs/JobSearch.tsx messages/en.json messages/sv.json
git commit -m "feat: add save/unsave bookmark button on job search result cards"
```

---

## Task 5: Experimental Skill Relevance Scoring

**Files:**
- Create: `lib/scoring.ts`
- Create: `lib/scoring.test.ts`
- Modify: `components/jobs/JobSearch.tsx`
- Modify: `messages/en.json`
- Modify: `messages/sv.json`

### Step 1: Write the failing test for scoring utility

Create `lib/scoring.test.ts`:

```tsx
import { describe, it, expect } from 'vitest'
import { scoreJobRelevance } from './scoring'

describe('scoreJobRelevance', () => {
  it('returns 0 when no skills match', () => {
    const result = scoreJobRelevance(
      { headline: 'Truck Driver', description: 'Drive trucks across Sweden', occupation: 'Driver' },
      ['JavaScript', 'React']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(2)
    expect(result.score).toBe(0)
  })

  it('counts matching skills case-insensitively', () => {
    const result = scoreJobRelevance(
      { headline: 'Web Developer', description: 'We need javascript and react skills', occupation: 'Developer' },
      ['JavaScript', 'React', 'Python']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(3)
    expect(result.score).toBeCloseTo(2 / 3)
  })

  it('matches skills in headline and occupation', () => {
    const result = scoreJobRelevance(
      { headline: 'React Developer', description: 'Build apps', occupation: 'JavaScript Developer' },
      ['React', 'JavaScript']
    )
    expect(result.matched).toBe(2)
    expect(result.total).toBe(2)
    expect(result.score).toBe(1)
  })

  it('returns 0 for empty skills array', () => {
    const result = scoreJobRelevance(
      { headline: 'Developer', description: 'Build stuff', occupation: 'Dev' },
      []
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(0)
    expect(result.score).toBe(0)
  })

  it('handles null/undefined fields gracefully', () => {
    const result = scoreJobRelevance(
      { headline: undefined, description: null, occupation: null },
      ['JavaScript']
    )
    expect(result.matched).toBe(0)
    expect(result.total).toBe(1)
    expect(result.score).toBe(0)
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- scoring`
Expected: FAIL — module not found.

### Step 3: Implement scoring utility

Create `lib/scoring.ts`:

```tsx
interface JobTextFields {
  headline?: string | null
  description?: string | null
  occupation?: string | null
}

interface RelevanceScore {
  matched: number
  total: number
  score: number
}

export function scoreJobRelevance(
  job: JobTextFields,
  skills: string[]
): RelevanceScore {
  if (skills.length === 0) {
    return { matched: 0, total: 0, score: 0 }
  }

  const text = [job.headline, job.description, job.occupation]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const matched = skills.filter((skill) =>
    text.includes(skill.toLowerCase())
  ).length

  return {
    matched,
    total: skills.length,
    score: matched / skills.length,
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- scoring`
Expected: All 5 tests PASS.

### Step 5: Add i18n keys

In `messages/en.json`, add to the `jobs` section:
```json
"relevanceToggle": "Skill matching (experimental)",
"relevanceBadge": "{matched}/{total} skills match",
"sortByRelevance": "Relevance",
"sortByDate": "Date"
```

In `messages/sv.json`, add to the `jobs` section:
```json
"relevanceToggle": "Kompetensmatchning (experimentell)",
"relevanceBadge": "{matched}/{total} kompetenser matchar",
"sortByRelevance": "Relevans",
"sortByDate": "Datum"
```

### Step 6: Add experimental toggle and scoring to JobSearch

In `components/jobs/JobSearch.tsx`:

Add import:
```tsx
import { scoreJobRelevance } from '@/lib/scoring'
```

Add state:
```tsx
const [relevanceEnabled, setRelevanceEnabled] = useState(false)
```

Add a `useMemo` to compute scored and sorted jobs:
```tsx
  const scoredJobs = useMemo(() => {
    if (!relevanceEnabled || skills.length === 0) return jobs

    return [...jobs]
      .map((job) => ({
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          skills
        ),
      }))
      .sort((a, b) => b.relevance.score - a.relevance.score)
  }, [jobs, skills, relevanceEnabled])
```

Add the experimental toggle UI after the search input section (after the `</div>` closing the search bar flex container, before `{error ? ...}`):

```tsx
      {skills.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={relevanceEnabled}
              onChange={(e) => setRelevanceEnabled(e.target.checked)}
              className="rounded"
            />
            <span>{t('relevanceToggle')}</span>
          </label>
        </div>
      )}
```

Update the job card rendering to use `scoredJobs` and show match badge:
```tsx
      {scoredJobs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {scoredJobs.map((job) => (
            <div key={job.id} className="relative">
              {'relevance' in job && job.relevance.matched > 0 && (
                <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {t('relevanceBadge', {
                    matched: job.relevance.matched,
                    total: job.relevance.total,
                  })}
                </span>
              )}
              <JobCard
                key={job.id}
                job={job}
                isSaved={savedJobIds.has(job.id)}
                onToggleSave={handleToggleSave}
              />
            </div>
          ))}
        </div>
      ) : null}
```

### Step 7: Run all tests

Run: `npm test`
Expected: All tests pass.

### Step 8: Commit

```bash
git add lib/scoring.ts lib/scoring.test.ts components/jobs/JobSearch.tsx messages/en.json messages/sv.json
git commit -m "feat: add experimental opt-in skill relevance scoring on job search"
```

---

## Task 6: Location/Region Filtering

**Files:**
- Modify: `components/jobs/JobSearch.tsx`
- Modify: `messages/en.json`
- Modify: `messages/sv.json`

### Step 1: Add i18n keys

In `messages/en.json`, add to the `jobs` section:
```json
"regionFilter": "Filter by region",
"allRegions": "All regions"
```

In `messages/sv.json`, add to the `jobs` section:
```json
"regionFilter": "Filtrera efter region",
"allRegions": "Alla regioner"
```

### Step 2: Add region filtering to JobSearch

In `components/jobs/JobSearch.tsx`:

Add state:
```tsx
const [selectedRegion, setSelectedRegion] = useState<string>('')
```

Add `useMemo` for available regions (computed from current jobs):
```tsx
  const availableRegions = useMemo(() => {
    const regions = jobs
      .map((job) => job.workplace_address?.region)
      .filter((r): r is string => !!r && r.trim().length > 0)
    return Array.from(new Set(regions)).sort()
  }, [jobs])
```

Reset region filter when new search is performed — add inside `runSearch` callback right after `setLoading(true)`:
```tsx
setSelectedRegion('')
```

Apply region filter before relevance scoring. Update the `scoredJobs` memo to filter first:
```tsx
  const scoredJobs = useMemo(() => {
    let filtered = jobs

    // Apply region filter
    if (selectedRegion) {
      filtered = filtered.filter(
        (job) => job.workplace_address?.region === selectedRegion
      )
    }

    // Apply relevance scoring
    if (!relevanceEnabled || skills.length === 0) return filtered

    return [...filtered]
      .map((job) => ({
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          skills
        ),
      }))
      .sort((a, b) => b.relevance.score - a.relevance.score)
  }, [jobs, skills, relevanceEnabled, selectedRegion])
```

Add region filter dropdown UI after the experimental toggle (or after the search bar if toggle is hidden):
```tsx
      {availableRegions.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="region-filter" className="text-sm font-medium">
            {t('regionFilter')}:
          </label>
          <select
            id="region-filter"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm bg-background"
          >
            <option value="">{t('allRegions')}</option>
            {availableRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
      )}
```

### Step 3: Run tests

Run: `npm test -- JobSearch`
Expected: Existing tests pass.

### Step 4: Commit

```bash
git add components/jobs/JobSearch.tsx messages/en.json messages/sv.json
git commit -m "feat: add region filter dropdown on job search results"
```

---

## Task 7: Wire Up Document Editor Page

**Files:**
- Create: `app/documents/[id]/page.tsx`

### Step 1: Create the document page

Create `app/documents/[id]/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getTranslations } from 'next-intl/server'

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/signin')

  const t = await getTranslations('dashboard')

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">Document not found</h1>
        </main>
      </div>
    )
  }

  const title = document.type === 'cv' ? t('yourCV') : t('yourPersonalLetter')

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="text-sm text-muted-foreground">
          {t('uploaded')}: {document.createdAt.toLocaleDateString()}
        </div>
        {document.parsedContent ? (
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{document.parsedContent}</pre>
          </div>
        ) : (
          <p className="text-muted-foreground">{t('noContent')}</p>
        )}
        {document.type === 'cv' && document.skills && Array.isArray(document.skills) && (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('extractedSkills')}</h2>
            <div className="flex flex-wrap gap-2">
              {(document.skills as string[]).map((skill, i) => (
                <span key={i} className="bg-muted px-2 py-1 rounded text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

### Step 2: Verify it works

Run: `npm run build` (or check dev server — navigate to `/documents/<a-document-id>`)

### Step 3: Commit

```bash
git add app/documents/[id]/page.tsx
git commit -m "feat: wire up document viewer page at /documents/[id]"
```

---

## Task 8: Create Feature Ideas Doc

**Status: DONE** — Already created at `docs/FEATURE-IDEAS.md` during brainstorming.

### Step 1: Commit the docs

```bash
git add docs/FEATURE-IDEAS.md docs/plans/
git commit -m "docs: add feature ideas backlog and sprint planning documents"
```

---

## Execution Checklist

| # | Task | Est. |
|---|------|------|
| 1 | Fix generate letter UX → redirect | 5 min |
| 2 | Add jobTitle to GeneratedLetter + display | 10 min |
| 3 | Fix 14 failing tests | 10 min |
| 4 | Save/unsave button on job cards | 15 min |
| 5 | Experimental skill relevance scoring | 15 min |
| 6 | Location/region filtering | 10 min |
| 7 | Wire up document editor page | 5 min |
| 8 | Commit docs | 2 min |

**Run `npm test` after each task to ensure no regressions.**
