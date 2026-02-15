# Performance & Streaming UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate perceived slowness on dashboard and job search by streaming content progressively using Suspense boundaries and incremental client-side rendering.

**Architecture:** Dashboard splits into 4 independent async server components wrapped in `<Suspense>` + error boundaries. Job search renders results incrementally as each skill query resolves, with a live status bar. No new dependencies.

**Tech Stack:** Next.js 14 App Router (Suspense streaming), React `cache()`, AbortController, requestAnimationFrame

---

### Task 1: Add i18n keys for search status bar

**Files:**
- Modify: `messages/en.json` (jobs section, around line 164)
- Modify: `messages/sv.json` (jobs section, matching keys)

**Step 1: Add English i18n keys**

Add these keys inside the `"jobs"` object in `messages/en.json`, after the `"found"` key (line 164):

```json
"searchStatus": {
  "searching": "Searching for jobs...",
  "searchingFound": "Found {count} jobs so far...",
  "complete": "Found {count} jobs matching your search",
  "completeWithFailures": "Found {count} jobs ({failed} search failed)",
  "noResults": "No jobs found matching your search"
}
```

**Step 2: Add Swedish i18n keys**

Add matching keys in `messages/sv.json`:

```json
"searchStatus": {
  "searching": "Söker efter jobb...",
  "searchingFound": "Hittade {count} jobb hittills...",
  "complete": "Hittade {count} jobb som matchar din sökning",
  "completeWithFailures": "Hittade {count} jobb ({failed} sökning misslyckades)",
  "noResults": "Inga jobb hittades som matchar din sökning"
}
```

**Step 3: Verify no syntax errors**

Run: `npx next lint`
Expected: No errors related to messages files

**Step 4: Commit**

```bash
git add messages/en.json messages/sv.json
git commit -m "feat: add i18n keys for search status bar"
```

---

### Task 2: Create SearchStatusBar component

**Files:**
- Create: `components/jobs/SearchStatusBar.tsx`
- Create: `components/jobs/SearchStatusBar.test.tsx`

**Step 1: Write the failing test**

Create `components/jobs/SearchStatusBar.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { SearchStatusBar } from './SearchStatusBar'

const messages = {
  jobs: {
    searchStatus: {
      searching: 'Searching for jobs...',
      searchingFound: 'Found {count} jobs so far...',
      complete: 'Found {count} jobs matching your search',
      completeWithFailures: 'Found {count} jobs ({failed} search failed)',
      noResults: 'No jobs found matching your search',
    },
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('SearchStatusBar', () => {
  it('renders nothing when phase is idle', () => {
    const { container } = renderWithIntl(
      <SearchStatusBar phase="idle" totalFound={0} failedQueries={0} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows searching message when phase is searching with no results yet', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={0} failedQueries={0} />
    )
    expect(screen.getByText('Searching for jobs...')).toBeInTheDocument()
  })

  it('shows live count when searching with results', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={87} failedQueries={0} />
    )
    expect(screen.getByText('Found 87 jobs so far...')).toBeInTheDocument()
  })

  it('shows final count when complete', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={423} failedQueries={0} />
    )
    expect(screen.getByText('Found 423 jobs matching your search')).toBeInTheDocument()
  })

  it('shows failure count when complete with failures', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={342} failedQueries={1} />
    )
    expect(screen.getByText('Found 342 jobs (1 search failed)')).toBeInTheDocument()
  })

  it('shows no results message when complete with zero', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={0} failedQueries={0} />
    )
    expect(screen.getByText('No jobs found matching your search')).toBeInTheDocument()
  })

  it('shows spinner icon when searching', () => {
    renderWithIntl(
      <SearchStatusBar phase="searching" totalFound={0} failedQueries={0} />
    )
    expect(screen.getByTestId('search-status-spinner')).toBeInTheDocument()
  })

  it('does not show spinner when complete', () => {
    renderWithIntl(
      <SearchStatusBar phase="complete" totalFound={100} failedQueries={0} />
    )
    expect(screen.queryByTestId('search-status-spinner')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- SearchStatusBar.test`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `components/jobs/SearchStatusBar.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'

type SearchPhase = 'idle' | 'searching' | 'complete'

interface SearchStatusBarProps {
  phase: SearchPhase
  totalFound: number
  failedQueries: number
}

export function SearchStatusBar({ phase, totalFound, failedQueries }: SearchStatusBarProps) {
  const t = useTranslations('jobs.searchStatus')

  if (phase === 'idle') return null

  const isSearching = phase === 'searching'

  let message: string
  if (isSearching) {
    message = totalFound > 0
      ? t('searchingFound', { count: totalFound })
      : t('searching')
  } else if (totalFound === 0) {
    message = t('noResults')
  } else if (failedQueries > 0) {
    message = t('completeWithFailures', { count: totalFound, failed: failedQueries })
  } else {
    message = t('complete', { count: totalFound })
  }

  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground animate-in fade-in duration-300">
      {isSearching && (
        <Loader2
          className="h-3.5 w-3.5 animate-spin text-primary"
          data-testid="search-status-spinner"
        />
      )}
      <span className="tabular-nums">{message}</span>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- SearchStatusBar.test`
Expected: PASS — all 8 tests

**Step 5: Commit**

```bash
git add components/jobs/SearchStatusBar.tsx components/jobs/SearchStatusBar.test.tsx
git commit -m "feat: add SearchStatusBar component with tests"
```

---

### Task 3: Refactor JobSearch to streaming results model

This is the largest task. It refactors `runSkillsSearch` in `components/jobs/JobSearch.tsx` to render results incrementally.

**Files:**
- Modify: `components/jobs/JobSearch.tsx`

**Step 1: Add new state variables**

Replace the existing state block (lines 122-141) to add streaming-related state. Keep all existing state, add these new ones:

```tsx
// New streaming state (add after line 141)
const [searchPhase, setSearchPhase] = useState<'idle' | 'searching' | 'complete'>('idle')
const [pendingQueries, setPendingQueries] = useState(0)
const [failedQueries, setFailedQueries] = useState(0)
const [totalFound, setTotalFound] = useState(0)
const searchRunIdRef = useRef(0)
const abortControllerRef = useRef<AbortController | null>(null)
const jobsMapRef = useRef(new Map<string, ScoredJob>())
const flushTimerRef = useRef<number | null>(null)
```

Also add `useRef` to the React import on line 1 if not already there.

**Step 2: Add flush function for batched updates**

Add this helper function inside the `JobSearch` component, after the state declarations:

```tsx
const flushJobsToState = useCallback(() => {
  const allJobs = Array.from(jobsMapRef.current.values())
  // Stable sort: score desc → publication_date desc → id asc
  allJobs.sort((a, b) => {
    const scoreA = a.relevance?.matched ?? 0
    const scoreB = b.relevance?.matched ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    const dateA = Date.parse(a.publication_date ?? '') || 0
    const dateB = Date.parse(b.publication_date ?? '') || 0
    if (dateB !== dateA) return dateB - dateA
    return a.id.localeCompare(b.id)
  })
  setJobs(allJobs)
  setTotalFound(allJobs.length)
}, [])

const scheduleFlush = useCallback(() => {
  if (flushTimerRef.current !== null) return
  flushTimerRef.current = requestAnimationFrame(() => {
    flushTimerRef.current = null
    flushJobsToState()
  })
}, [flushJobsToState])
```

**Step 3: Refactor `runSkillsSearch` to stream results**

Replace the existing `runSkillsSearch` function (lines 412-519) with this incremental version:

```tsx
const runSkillsSearch = useCallback(
  async (skillsToSearch: string[], textQuery = '', region = '') => {
    const normalizedSkills = getUniqueSkills(skillsToSearch)
    if (normalizedSkills.length === 0) {
      setError(t('errorSelectSkill'))
      return
    }

    // Cancel previous search
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const runId = ++searchRunIdRef.current

    // Reset state
    jobsMapRef.current = new Map()
    setJobs([])
    setSearchPhase('searching')
    setLoading(true)
    setHasSearched(true)
    setError(null)
    setCurrentPage(1)
    setPendingQueries(normalizedSkills.length)
    setFailedQueries(0)
    setTotalFound(0)
    setSearchSkillMatches({})

    let localFailed = 0

    await Promise.allSettled(
      normalizedSkills.map(async (skill) => {
        try {
          const hits = await fetchJobsByQuery(
            textQuery ? `${skill} ${textQuery}` : skill,
            { region }
          )

          // Guard: ignore if this is a stale search
          if (searchRunIdRef.current !== runId) return

          // Score and merge into map
          for (const hit of hits) {
            if (!jobsMapRef.current.has(hit.id)) {
              const relevance = scoreJobRelevance(
                {
                  headline: hit.headline,
                  description: hit.description?.text,
                  occupation: hit.occupation?.label,
                },
                normalizedSkills
              )
              const scoredJob: ScoredJob = { ...hit, relevance }
              jobsMapRef.current.set(hit.id, scoredJob)
            }
          }

          // Schedule batched UI update
          scheduleFlush()
        } catch {
          if (searchRunIdRef.current !== runId) return
          localFailed++
        } finally {
          if (searchRunIdRef.current === runId) {
            setPendingQueries((prev) => Math.max(0, prev - 1))
          }
        }
      })
    )

    // Final flush after all queries complete
    if (searchRunIdRef.current !== runId) return

    // Cancel any pending RAF
    if (flushTimerRef.current !== null) {
      cancelAnimationFrame(flushTimerRef.current)
      flushTimerRef.current = null
    }
    flushJobsToState()

    setFailedQueries(localFailed)
    setSearchPhase('complete')
    setLoading(false)

    if (localFailed > 0 && jobsMapRef.current.size > 0) {
      setError(t('skillSearchPartialFailure', { count: localFailed }))
    } else if (jobsMapRef.current.size === 0) {
      setError(t('errorSearchFailed'))
    }
  },
  [fetchJobsByQuery, flushJobsToState, scheduleFlush, t]
)
```

**Step 4: Update `handleUnifiedSearch` to reset searchPhase**

In the existing `handleUnifiedSearch` (line 522), add `setSearchPhase('searching')` at the start when doing a text search, and `setSearchPhase('complete')` in both `.then()` and `.catch()`:

```tsx
const handleUnifiedSearch = useCallback(() => {
  const trimmedQuery = query.trim()
  const trimmedRegion = selectedRegion.trim()
  const hasQuery = trimmedQuery.length > 0
  const hasRegion = trimmedRegion.length > 0
  const hasSelectedSkills = selectedSkillSet.length > 0

  if (!hasQuery && !hasSelectedSkills && !hasRegion) {
    setError(t('errorNoSearchTerm'))
    return
  }

  if (hasSelectedSkills && !hasQuery) {
    void runSkillsSearch(selectedSkillSet, '', trimmedRegion)
    return
  }

  const queryForFetch = hasQuery ? trimmedQuery : trimmedRegion

  setLoading(true)
  setHasSearched(true)
  setError(null)
  setSearchSkillMatches({})
  setRelevanceEnabled(hasQuery && hasSelectedSkills)
  setCurrentPage(1)
  setSearchPhase('searching')
  setTotalFound(0)
  setFailedQueries(0)

  void fetchJobsByQuery(queryForFetch, { region: trimmedRegion })
    .then((results) => {
      setJobs(results)
      setTotalFound(results.length)
      setSearchPhase('complete')
    })
    .catch((searchError) => {
      const message =
        searchError instanceof Error ? searchError.message : t('errorSearchFailed')
      setJobs([])
      setTotalFound(0)
      setSearchPhase('complete')
      setError(message)
    })
    .finally(() => setLoading(false))
}, [fetchJobsByQuery, query, runSkillsSearch, selectedRegion, selectedSkillSet, t])
```

**Step 5: Remove double-scoring in `scoredJobs` memo**

The `scoredJobs` memo (lines 581-638) currently re-scores all jobs. Since streaming now scores once on insertion, simplify:

For the skills search path, jobs already have `.relevance` set. The memo should only apply relevance scoring for the text-search-with-skills path (when `relevanceEnabled` is true but `searchSkillMatches` is empty). Keep the sorting logic but skip re-scoring when `.relevance` already exists.

Replace the `withRelevance` mapping (lines 585-597):

```tsx
const withRelevance: ScoredJob[] = shouldApplyRelevance
  ? jobs.map((job) => {
      // Skip re-scoring if already scored by streaming
      if (job.relevance) return job
      return {
        ...job,
        relevance: scoreJobRelevance(
          {
            headline: job.headline,
            description: job.description?.text,
            occupation: job.occupation?.label,
          },
          relevanceSkills
        ),
      }
    })
  : jobs
```

**Step 6: Disable pagination while streaming**

In the pagination prop passed to `SearchResults` (line 766), add a disabled check:

```tsx
pagination={{
  currentPage,
  totalPages,
  totalItems: scoredJobs.length,
  itemsPerPage,
  onPageChange: searchPhase === 'complete' ? setCurrentPage : () => {},
  onItemsPerPageChange: searchPhase === 'complete' ? setItemsPerPage : () => {},
}}
```

**Step 7: Add SearchStatusBar to JSX**

Import SearchStatusBar at the top of the file and add it in the JSX between `SkillSelector` and `SearchResults` (around line 754):

```tsx
import { SearchStatusBar } from '@/components/jobs/SearchStatusBar'
```

Add between SkillSelector and SearchResults:

```tsx
<SearchStatusBar
  phase={searchPhase}
  totalFound={totalFound}
  failedQueries={failedQueries}
/>
```

**Step 8: Cleanup effect for RAF timer**

Add a cleanup effect after the other useEffects:

```tsx
useEffect(() => {
  return () => {
    if (flushTimerRef.current !== null) {
      cancelAnimationFrame(flushTimerRef.current)
    }
    abortControllerRef.current?.abort()
  }
}, [])
```

**Step 9: Run linter and type check**

Run: `npx next lint && npx tsc --noEmit`
Expected: No errors

**Step 10: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass

**Step 11: Commit**

```bash
git add components/jobs/JobSearch.tsx
git commit -m "feat: refactor job search to stream results incrementally"
```

---

### Task 4: Add i18n keys for dashboard section errors

**Files:**
- Modify: `messages/en.json` (dashboard section)
- Modify: `messages/sv.json` (dashboard section)

**Step 1: Add English keys**

Add inside the `"dashboard"` object in `messages/en.json`:

```json
"sectionError": {
  "stats": "Could not load statistics",
  "documents": "Could not load documents",
  "skills": "Could not load skills",
  "recentJobs": "Could not load recent jobs",
  "retry": "Try again"
}
```

**Step 2: Add Swedish keys**

Add matching keys in `messages/sv.json`:

```json
"sectionError": {
  "stats": "Kunde inte ladda statistik",
  "documents": "Kunde inte ladda dokument",
  "skills": "Kunde inte ladda kompetenser",
  "recentJobs": "Kunde inte ladda senaste jobb",
  "retry": "Försök igen"
}
```

**Step 3: Commit**

```bash
git add messages/en.json messages/sv.json
git commit -m "feat: add i18n keys for dashboard section error boundaries"
```

---

### Task 5: Create cached data loaders for dashboard

**Files:**
- Create: `lib/data/dashboard-loaders.ts`

**Step 1: Write the data loader module**

Create `lib/data/dashboard-loaders.ts`:

```tsx
import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { createClient } from '@/lib/supabase/server'
import { resolveDocumentAccessUrl } from '@/lib/storage'

// Cached: shared across sections in same request
export const getSavedJobsCount = cache(async (userId: string) => {
  return prisma.savedJob.count({ where: { userId } })
})

export const getLettersCount = cache(async (userId: string) => {
  return prisma.generatedLetter.count({ where: { userId } })
})

export const getCvDocument = cache(async (userId: string) => {
  return prisma.document.findFirst({
    where: { userId, type: 'cv' },
    orderBy: { createdAt: 'desc' },
  })
})

export const getPersonalLetter = cache(async (userId: string) => {
  return prisma.document.findFirst({
    where: { userId, type: 'personal_letter' },
    orderBy: { createdAt: 'desc' },
  })
})

export const getRecentSavedJobs = cache(async (userId: string) => {
  return prisma.savedJob.findMany({
    where: { userId },
    orderBy: { savedAt: 'desc' },
    take: 3,
  })
})

export async function getRecentSavedJobsWithDetails(userId: string) {
  const recentSavedJobs = await getRecentSavedJobs(userId)

  return Promise.all(
    recentSavedJobs.map(async (saved) => {
      try {
        const job = await getJobById(saved.afJobId)
        return {
          afJobId: saved.afJobId,
          headline: job.headline || saved.headline || 'Untitled',
          employer: job.employer?.name || saved.employer || '',
          location: job.workplace_address?.municipality || job.workplace_address?.region || saved.location || '',
          occupation: job.occupation?.label || saved.occupation || '',
          deadline: job.application_deadline || saved.deadline || null,
          webpageUrl: job.webpage_url || saved.webpageUrl || null,
          isStale: false,
        }
      } catch {
        return {
          afJobId: saved.afJobId,
          headline: saved.headline || `Jobb ${saved.afJobId.slice(0, 8)}`,
          employer: saved.employer || '',
          location: saved.location || '',
          occupation: saved.occupation || '',
          deadline: saved.deadline || null,
          webpageUrl: saved.webpageUrl || null,
          isStale: true,
        }
      }
    })
  )
}

export async function getDocumentWithAccessUrl(userId: string, type: 'cv' | 'personal_letter') {
  const doc = type === 'cv'
    ? await getCvDocument(userId)
    : await getPersonalLetter(userId)

  if (!doc) return null

  const supabase = await createClient()
  const accessUrl = await resolveDocumentAccessUrl(supabase, doc.fileUrl)

  return {
    id: doc.id,
    createdAt: doc.createdAt.toISOString(),
    parsedContent: doc.parsedContent,
    fileUrl: accessUrl,
    skills: doc.skills as string[] | null,
  }
}
```

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add lib/data/dashboard-loaders.ts
git commit -m "feat: add cached data loaders for dashboard sections"
```

---

### Task 6: Create dashboard skeleton components

**Files:**
- Create: `components/dashboard/skeletons.tsx`

**Step 1: Extract skeleton components from loading.tsx**

Create `components/dashboard/skeletons.tsx` by extracting the relevant parts from `app/dashboard/loading.tsx` (lines 17-57):

```tsx
export function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className="skeleton h-7 w-48" />
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="flex gap-6">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-6 w-20" />
      </div>
    </div>
  )
}

export function DocumentsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-4 w-28" />
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-4 w-28" />
      </div>
    </div>
  )
}

export function SkillsSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="skeleton h-4 w-24" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-7 w-20" />
        ))}
      </div>
    </div>
  )
}

export function RecentJobsSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="skeleton h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton h-4 w-3/4" />
            <div className="flex gap-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/skeletons.tsx
git commit -m "feat: extract reusable dashboard skeleton components"
```

---

### Task 7: Create dashboard error boundary components

**Files:**
- Create: `components/dashboard/error-boundaries.tsx`

**Step 1: Create error boundary components**

Create `components/dashboard/error-boundaries.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'

interface SectionErrorProps {
  sectionKey: 'stats' | 'documents' | 'skills' | 'recentJobs'
  reset?: () => void
}

export function SectionError({ sectionKey, reset }: SectionErrorProps) {
  const t = useTranslations('dashboard.sectionError')

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
      <p className="text-[13px] text-destructive/70">{t(sectionKey)}</p>
      {reset && (
        <button
          onClick={reset}
          className="mt-2 text-[12px] font-medium text-destructive/60 hover:text-destructive transition-colors"
        >
          {t('retry')}
        </button>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/dashboard/error-boundaries.tsx
git commit -m "feat: add dashboard section error boundary component"
```

---

### Task 8: Create async dashboard section components

**Files:**
- Create: `components/dashboard/DashboardStatsSection.tsx`
- Create: `components/dashboard/DashboardDocumentsSection.tsx`
- Create: `components/dashboard/DashboardSkillsSection.tsx`
- Create: `components/dashboard/DashboardRecentJobsSection.tsx`

**Step 1: Create DashboardStatsSection**

Create `components/dashboard/DashboardStatsSection.tsx`:

```tsx
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getSavedJobsCount, getLettersCount } from '@/lib/data/dashboard-loaders'

interface DashboardStatsSectionProps {
  userId: string
  userName: string | null
  userEmail: string
}

export async function DashboardStatsSection({ userId, userName, userEmail }: DashboardStatsSectionProps) {
  const t = await getTranslations('dashboard')
  const [savedJobsCount, lettersCount] = await Promise.all([
    getSavedJobsCount(userId),
    getLettersCount(userId),
  ])

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-medium tracking-[-0.01em] text-foreground">
          {userName || userEmail}
        </h1>
        {userName && (
          <p className="mt-0.5 text-[13px] text-muted-foreground/60">{userEmail}</p>
        )}
      </div>
      <div className="flex gap-6">
        <Link
          href="/jobs"
          className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
        >
          <span className="text-lg font-medium tabular-nums text-foreground">{savedJobsCount}</span>
          <span className="text-[11px] font-normal text-muted-foreground/60 transition-colors duration-200 group-hover:text-foreground">
            {t('jobsSaved')}
          </span>
        </Link>
        <Link
          href="/letters"
          className="group flex items-baseline gap-1.5 transition-colors duration-200 hover:opacity-80"
        >
          <span className="text-lg font-medium tabular-nums text-foreground">{lettersCount}</span>
          <span className="text-[11px] font-normal text-muted-foreground/60 transition-colors duration-200 group-hover:text-foreground">
            {t('lettersGenerated')}
          </span>
        </Link>
      </div>
    </div>
  )
}
```

**Step 2: Create DashboardDocumentsSection**

Create `components/dashboard/DashboardDocumentsSection.tsx`:

```tsx
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { getDocumentWithAccessUrl } from '@/lib/data/dashboard-loaders'

interface DashboardDocumentsSectionProps {
  userId: string
}

export async function DashboardDocumentsSection({ userId }: DashboardDocumentsSectionProps) {
  const [cvDocument, personalLetter] = await Promise.all([
    getDocumentWithAccessUrl(userId, 'cv'),
    getDocumentWithAccessUrl(userId, 'personal_letter'),
  ])

  return (
    <DashboardClient
      cvDocument={cvDocument}
      personalLetter={personalLetter}
      cvUploadComponent={<FileUpload />}
      personalLetterUploadComponent={<PersonalLetterUpload />}
    />
  )
}
```

**Step 3: Create DashboardSkillsSection**

Create `components/dashboard/DashboardSkillsSection.tsx`:

```tsx
import { SkillsEditor } from '@/components/dashboard/SkillsEditor'
import { getCvDocument } from '@/lib/data/dashboard-loaders'

interface DashboardSkillsSectionProps {
  userId: string
}

export async function DashboardSkillsSection({ userId }: DashboardSkillsSectionProps) {
  const cvDocument = await getCvDocument(userId)

  if (!cvDocument) return null

  const skills = (cvDocument.skills as string[] | null) ?? []

  return (
    <SkillsEditor
      skills={skills}
      documentId={cvDocument.id}
    />
  )
}
```

**Step 4: Create DashboardRecentJobsSection**

Create `components/dashboard/DashboardRecentJobsSection.tsx`:

```tsx
import { SavedJobsList } from '@/components/dashboard/SavedJobsList'
import { getSavedJobsCount, getRecentSavedJobsWithDetails } from '@/lib/data/dashboard-loaders'

interface DashboardRecentJobsSectionProps {
  userId: string
}

export async function DashboardRecentJobsSection({ userId }: DashboardRecentJobsSectionProps) {
  const [savedJobsData, totalCount] = await Promise.all([
    getRecentSavedJobsWithDetails(userId),
    getSavedJobsCount(userId),
  ])

  return (
    <SavedJobsList
      jobs={savedJobsData}
      totalCount={totalCount}
    />
  )
}
```

**Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
git add components/dashboard/DashboardStatsSection.tsx components/dashboard/DashboardDocumentsSection.tsx components/dashboard/DashboardSkillsSection.tsx components/dashboard/DashboardRecentJobsSection.tsx
git commit -m "feat: add async dashboard section components"
```

---

### Task 9: Restructure dashboard page with Suspense boundaries

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Rewrite dashboard page**

Replace the entire `app/dashboard/page.tsx` with the new streaming version:

```tsx
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardStatsSection } from '@/components/dashboard/DashboardStatsSection'
import { DashboardDocumentsSection } from '@/components/dashboard/DashboardDocumentsSection'
import { DashboardSkillsSection } from '@/components/dashboard/DashboardSkillsSection'
import { DashboardRecentJobsSection } from '@/components/dashboard/DashboardRecentJobsSection'
import { StatsSkeleton, DocumentsSkeleton, SkillsSkeleton, RecentJobsSkeleton } from '@/components/dashboard/skeletons'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'
import { DebugChat } from '@/components/dashboard/DebugChat'
import { GEMINI_MODEL } from '@/lib/services/gemini'

const DEBUG_EMAIL = process.env.DEBUG_EMAIL

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email)

  // Redirect to onboarding if not completed
  if (!user.onboardingCompleted) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container mx-auto space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<StatsSkeleton />}>
          <DashboardStatsSection
            userId={user.id}
            userName={user.name}
            userEmail={user.email}
          />
        </Suspense>

        <Suspense fallback={<DocumentsSkeleton />}>
          <DashboardDocumentsSection userId={user.id} />
        </Suspense>

        <Suspense fallback={<SkillsSkeleton />}>
          <DashboardSkillsSection userId={user.id} />
        </Suspense>

        <Suspense fallback={<RecentJobsSkeleton />}>
          <DashboardRecentJobsSection userId={user.id} />
        </Suspense>
      </main>

      {authUser.email === DEBUG_EMAIL && <DebugChat modelName={GEMINI_MODEL} />}
    </div>
  )
}
```

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 4: Manual verification**

Run: `npm run dev`

Verify in browser:
1. Navigate to `/dashboard`
2. Page shell (header, background) appears instantly
3. Each section (stats, documents, skills, recent jobs) loads independently with skeletons
4. If one section is slow, others still appear on time

**Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: restructure dashboard with Suspense streaming sections"
```

---

### Task 10: Manual testing of job search streaming

**Files:** None (testing only)

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test streaming search**

1. Navigate to `/jobs`
2. Select multiple skills (3+)
3. Click Search
4. Verify:
   - Status bar appears immediately: "Searching for jobs..."
   - First results appear within ~1 second
   - Counter updates: "Found X jobs so far..."
   - More results stream in
   - Final message: "Found X jobs matching your search"
   - Pagination controls are disabled during search, enabled after
5. Start a new search while previous is still running
6. Verify old results are replaced, no stale data

**Step 3: Test text search**

1. Type a query and search
2. Verify status bar shows phases correctly
3. Verify pagination works normally after completion

**Step 4: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found in manual testing"
```

---

## Task Dependency Order

```
Task 1 (i18n keys for status bar)
  └─ Task 2 (SearchStatusBar component) — needs i18n keys
       └─ Task 3 (Refactor JobSearch) — needs SearchStatusBar

Task 4 (i18n keys for dashboard errors)
Task 5 (cached data loaders) — independent
Task 6 (skeleton components) — independent
Task 7 (error boundaries) — needs Task 4 i18n keys
  └─ Task 8 (async section components) — needs Tasks 5, 6, 7
       └─ Task 9 (restructure dashboard page) — needs Task 8

Task 10 (manual testing) — needs Tasks 3 and 9
```

**Parallelizable:** Tasks 1-3 (job search) and Tasks 4-9 (dashboard) are independent tracks that can be developed in parallel.
