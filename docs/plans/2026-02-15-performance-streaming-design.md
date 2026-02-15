# Performance & Streaming UX Design

**Date:** 2026-02-15
**Status:** Approved
**Goal:** Eliminate perceived slowness on dashboard and job search by streaming content progressively

## Problem

1. **Dashboard:** Blocks rendering until 8+ DB queries and 3 AF API calls complete (~1-2s blank page)
2. **Job Search:** Fires 1-5 parallel skill queries (up to 100 jobs each), waits for ALL to complete before rendering. With 400+ jobs, UI appears frozen with no feedback.

## Approach: Suspense + Streaming (No New Dependencies)

Use Next.js built-in streaming via `<Suspense>` for the dashboard, and incremental client-side rendering for job search results. No new libraries needed.

---

## Part 1: Dashboard Streaming with Suspense

### Parent Component (instant render)

Keeps only:
- Auth check
- `getOrCreateUser`
- Onboarding redirect check
- Page shell + Suspense/ErrorBoundary wrappers

### Four Async Server Sections

Each wrapped in `<Suspense fallback={<Skeleton/>}>` + `<ErrorBoundary>`:

| Section | Data Fetched | Fallback |
|---------|-------------|----------|
| `DashboardStatsSection` | savedJobsCount, lettersCount | StatsSkeleton |
| `DashboardDocumentsSection` | CV + personal letter URLs | DocumentsSkeleton |
| `DashboardSkillsSection` | Extracted skills from CV | SkillsSkeleton |
| `DashboardRecentJobsSection` | 3 recent saved jobs + AF API details | RecentJobsSkeleton |

### Caching & Error Handling

- **`cache()` data loaders** for shared queries (e.g., saved jobs count used by multiple sections) to prevent duplicate DB hits
- **Per-section error boundaries** so one section failure (e.g., AF API down) doesn't kill the whole page
- **`loading.tsx` stays** as route-level fallback; skeleton parts extracted into reusable components

---

## Part 2: Job Search Streaming Results

### Core Change

Instead of waiting for all skill queries to complete, render results incrementally as each query resolves.

### User Experience

1. Search initiated -> status bar: "Searching for jobs..."
2. First query returns (~0.5-1s) -> jobs scored, sorted, rendered. Status: "Found 87 jobs, searching for more..."
3. More queries return -> new jobs merge in, counter updates live
4. All complete -> "Found 423 jobs matching your skills"

### Implementation Guardrails

1. **Stale-search protection:** `searchRunId` + `AbortController` per search run. New search cancels/ignores old responses.

2. **Batched incremental updates:** Results accumulate in a `Map<string, ScoredJob>` ref (keyed by job ID, deduplicates). UI commits on ~150ms throttle via `requestAnimationFrame`. Prevents re-render storm.

3. **Score once, reuse:** Each job scored exactly once when first entering the map. Score stored on `ScoredJob` object. Eliminates current double-scoring (lines ~465 and ~581).

4. **Stable sort with tie-breaker:** Sort by score (desc) -> publication date (desc) -> job ID (asc). Prevents list shuffling between updates.

5. **Failure accounting:** Track `failedQueries` count. Status bar shows "Found 342 jobs (1 search failed)" when applicable.

6. **Pagination lock during streaming:** Page resets to 1 on search start. Page controls disabled while `searchPhase !== 'complete'`. User can only paginate after final sort.

### State Model

```typescript
searchRunId: number              // increments per search
abortController: AbortController // cancels previous run
jobsMapRef: Map<string, ScoredJob> // accumulator ref, keyed by job ID
jobs: ScoredJob[]                // committed on throttled schedule
pendingQueries: number
failedQueries: number
totalFound: number
searchPhase: 'idle' | 'searching' | 'complete'
paginationLocked: boolean       // true while searching
```

---

## Part 3: Search Status Bar Component

Slim bar between SearchBar and SearchResults.

| Phase | Display |
|-------|---------|
| `idle` | Hidden |
| `searching` | `[spinner] Searching for jobs... Found 87 so far` (live counter) |
| `complete` | `Found 423 jobs matching your skills` (static) |
| `complete` + failures | `Found 342 jobs (1 search failed)` (warning style) |
| `complete` + zero | `No jobs found matching your search` |

Uses existing `Loader2` spinner from shadcn. Subtle fade-in animation. Counter uses CSS transition for smooth feel.

---

## Files to Create/Modify

### New Files
- `components/dashboard/DashboardStatsSection.tsx`
- `components/dashboard/DashboardDocumentsSection.tsx`
- `components/dashboard/DashboardSkillsSection.tsx`
- `components/dashboard/DashboardRecentJobsSection.tsx`
- `components/dashboard/skeletons.tsx`
- `components/dashboard/error-boundaries.tsx`
- `lib/data/dashboard-loaders.ts`
- `components/jobs/SearchStatusBar.tsx`

### Modified Files
- `app/dashboard/page.tsx` (restructure into shell + imports)
- `components/jobs/JobSearch.tsx` (streaming search model)

## Out of Scope (YAGNI)

- No new dependencies (no SWR, React Query, Redis)
- No API-level refactoring (AF API stays as-is)
- No prefetching/preloading on navigation links
- No server-side scoring or caching layer
