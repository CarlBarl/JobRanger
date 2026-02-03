# Codex Plan: JobMatch MVP (TDD-First)

**Date:** 2026-02-03  
**Status:** In progress  
**Sources:** `docs/plans/2026-02-03-jobmatch-implementation-plan.md`, `docs/plans/2026-02-03-simplified-architecture-design.md`

## Goal
Ship an MVP that lets a Swedish job seeker:
1. Sign in with Supabase magic link
2. Upload a CV
3. Extract skills (Gemini)
4. Search jobs (Arbetsformedlingen)
5. Save jobs
6. Generate and view cover letters

## Non-Negotiables
- TDD for every feature: failing test first, then implementation.
- No `any` types.
- Mock all external services in unit tests (Supabase, Prisma, Gemini, Arbetsformedlingen).
- Prefer small, testable modules in `lib/` over logic in components.

## Phases

### Phase 0: Repo Baseline
1. Verify Node + npm versions.
2. Keep existing docs/README intact; avoid scaffolding commands that overwrite docs.

### Phase 1: Next.js + Tooling Foundation
1. Scaffold Next.js 14 App Router into repo (without clobbering existing markdown/docs).
2. Add Tailwind + base layout/page.
3. Add Vitest + RTL + jest-dom.
4. Add one smoke test (component render) to prove the harness works.

**Exit criteria**
- `npm run dev` starts.
- `npm run test` passes (at least 1 real test).

### Phase 2: Prisma Schema + DB Boundary
1. Add `prisma/schema.prisma` based on simplified design (User, Document, SavedJob, GeneratedLetter).
2. Add `lib/prisma.ts` singleton.
3. Add unit tests for Prisma consumers by mocking `lib/prisma` (no real DB in unit tests).

**Exit criteria**
- `npx prisma generate` works locally (DB connection not required).
- Unit tests mock Prisma cleanly.

### Phase 3: Supabase Clients + Auth Guard
1. Add Supabase client helpers:
   - `lib/supabase/client.ts` (browser)
   - `lib/supabase/server.ts` (server)
   - `lib/supabase/middleware.ts` (`updateSession`)
2. Add `middleware.ts` to protect routes: `/dashboard`, `/jobs`, `/letters`, `/profile`.
3. Unit test the auth guard logic with mocked Supabase auth result.

**Exit criteria**
- Protected routes redirect when logged out (validated by unit tests and manual run).

### Phase 4: Auth UI (Magic Link)
1. Write tests for `components/auth/SignInForm.tsx`:
   - Renders email + submit
   - Rejects invalid email
   - Shows success state after mocked Supabase call
2. Implement `SignInForm` (client component).
3. Create `app/auth/signin/page.tsx`.
4. Create `app/auth/callback/route.ts`.

**Exit criteria**
- Sign-in form behavior covered by tests.

### Phase 5: User Sync (Supabase Auth -> Prisma User)
1. Write unit test for `lib/auth.ts:getOrCreateUser`.
2. Implement via Prisma `upsert` (mocked in tests).
3. Use it in server pages that need DB user id (dashboard/letters/save job).

**Exit criteria**
- `getOrCreateUser` fully unit-tested.

### Phase 6: Dashboard Skeleton (Protected)
1. Minimal `app/dashboard/page.tsx` server component that:
   - Reads auth user (Supabase server client)
   - Syncs Prisma user
   - Shows placeholders for CV, saved jobs, letters
2. Keep UI components small and test client components in isolation.

**Exit criteria**
- Dashboard route works while logged in; redirects while logged out.

### Phase 7: External Clients (Pure Functions, Unit-Tested)
1. Arbetsformedlingen client in `lib/services/arbetsformedlingen.ts`:
   - `searchJobs(query)`
   - `getJob(id)`
   - Unit tests mock `fetch`
2. Gemini client in `lib/services/gemini.ts`:
   - `extractSkills(text)`
   - `generateCoverLetter(input)`
   - Unit tests mock SDK boundary (or wrap SDK and mock the wrapper).

**Exit criteria**
- External client functions covered by unit tests, no network calls in tests.

### Phase 8: API Routes (Validated + Tested)
1. Add Zod validators in `lib/validators`.
2. Add API routes (unit-tested):
   - `GET /api/jobs`
   - `GET /api/jobs/[id]`
   - `POST /api/skills`
   - `POST /api/generate`
3. Standardize response envelope: `{ success: true, data }` or `{ success: false, error: { code, message } }`.

**Exit criteria**
- Each route has tests for success + key error cases (unauthorized, bad input, upstream failure).

### Phase 9: Save Jobs + Letters CRUD
1. API routes:
   - `POST /api/jobs/save`
   - `DELETE /api/jobs/save/[id]`
   - `GET /api/letters`
   - `DELETE /api/letters/[id]`
2. Pages:
   - `app/jobs/page.tsx`, `app/jobs/[id]/page.tsx`
   - `app/letters/page.tsx`
3. Unit tests for client components and route handlers.

**Exit criteria**
- Save/unsave and letters list/delete fully covered by unit tests.

### Phase 10: Document Upload (MVP)
1. `POST /api/upload` with validation (type/size) and mocked Supabase Storage in tests.
2. `GET /api/documents` and `DELETE /api/documents/[id]`.
3. `components/upload/FileUpload.tsx` with tests mocking `fetch`.

**Exit criteria**
- Validation + error states covered (file missing, wrong type, too big, unauthorized).

### Phase 11: Manual Browser Verification
1. Run dev server.
2. Verify flows:
   - Landing -> Sign in -> Dashboard redirect behavior
   - Job search results render
   - Generate letter stores and appears on Letters page
3. Record any console errors and fix.

## Implementation Rules Of Engagement
1. For each phase item, create/locate a `*.test.ts(x)` first.
2. Run `npm run test` frequently; do not stack multiple untested features.
3. Prefer adding small helpers in `lib/` and testing them directly.
4. No unmocked external calls in unit tests (network, DB, Supabase).

