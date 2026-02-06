# Sprint Design: Bug Fixes, Features & Foundation

**Date:** 2026-02-06
**Status:** Approved

## Priority Order

1. **Production-ready** - Fix bugs found during Playwright testing
2. **Killer features** - Differentiate the app
3. **Clean foundation** - Tests, loose ends
4. Visual overhaul - Deferred to future sprint

---

## P1: Bug Fixes

### 1A. Fix Generate Letter UX
**Problem:** Clicking "Generera brev" on job detail page shows raw letter ID ("Genererat: cmlakpfx...") instead of useful feedback.
**Solution:** After successful generation, redirect user to `/letters` page where they can see the generated letter.
**Files:** `app/jobs/[id]/page.tsx`

### 1B. Show Job Titles on Letters Page
**Problem:** Letters page shows "Jobb-ID: 30572222" instead of the job headline.
**Solution:** Add `jobTitle` field to `GeneratedLetter` Prisma model. Populate it at generation time from the AF job data. Display on letters page.
**Files:** `prisma/schema.prisma`, `app/api/generate/route.ts`, `app/letters/page.tsx`

### 1C. Fix 14 Failing Tests
**Problem:** Batch skills tests have broken Prisma mocks. BatchResultsModal crashes on undefined `previousSkills`.
**Solution:**
- Fix `vi.mock` setup in `app/api/skills/batch/route.test.ts` (6 failures)
- Add null check for `previousSkills` in `BatchResultsModal` (1 failure)
- Fix related `DashboardClient.test.tsx` failure
**Files:** `app/api/skills/batch/route.test.ts`, `components/dashboard/BatchResultsModal.tsx`, `components/dashboard/BatchResultsModal.test.tsx`, `components/dashboard/DashboardClient.test.tsx`

---

## P2: Killer Features

### 2A. Save/Unsave Jobs from Search Results
**Problem:** Users must click into job detail to save. Adds friction to the core workflow.
**Solution:** Add bookmark icon button to each `JobCard` in search results. Reuse existing save API. Fetch saved job IDs on page load to show correct toggle state.
**Files:** `components/jobs/JobCard.tsx`, `app/jobs/page.tsx` or `components/jobs/JobSearch.tsx`

### 2B. Experimental Skill Relevance Scoring
**Problem:** Search results are unranked - users can't tell which jobs match their skills best.
**Solution:** Client-side keyword matching. After results load, score each job against user's skills by checking `description.text` + `headline` + `occupation.label`. Show match count badge (e.g., "8/13 skills"). Sort by relevance when enabled.
**UX:** Opt-in toggle switch labeled "Experimental" - off by default. Users enable it to see relevance scoring and sorting.
**Files:** `components/jobs/JobSearch.tsx`, new scoring utility in `lib/`

### 2C. Location/Region Filtering
**Problem:** No way to narrow results by geography. Important for Swedish job market.
**Solution:** Extract unique regions from search results. Show filter dropdown above results. Filter client-side. Optionally use AF API's `region` parameter for server-side filtering.
**Files:** `components/jobs/JobSearch.tsx`, possibly `lib/services/arbetsformedlingen.ts`

---

## P3: Clean Foundation

### 3A. Wire Up Document Editor Page
**Problem:** `/documents/[id]` route exists as empty directory. `DocumentEditor` component and API endpoint already built.
**Solution:** Create `app/documents/[id]/page.tsx`. Add navigation link from dashboard document cards.
**Files:** `app/documents/[id]/page.tsx`, `components/dashboard/DashboardClient.tsx`

### 3B. Feature Ideas Doc
**Solution:** Created at `docs/FEATURE-IDEAS.md` with all parked ideas.
**Status:** Done.

---

## Deferred

- Visual overhaul / design polish (future sprint, use `/frontend-design`)
- Letter editing after generation (see `docs/FEATURE-IDEAS.md`)
- AI-powered semantic matching (see `docs/FEATURE-IDEAS.md`)
