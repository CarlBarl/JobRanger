# Lessons Learned

Continuously updated log of technical decisions, gotchas, and patterns discovered during development.

## Vercel Deployment

### PDF Parsing Requires Polyfills
Vercel's serverless runtime lacks browser APIs that PDF parsing libraries need. Required polyfills:
- `DOMMatrix` - matrix transforms
- `ImageData` - pixel data
- `Path2D` - canvas paths

Applied in `next.config.mjs` via webpack configuration.

### Prisma Client Must Be Generated Before Deploy
The `@prisma/client did not initialize yet` error occurs when the Prisma client hasn't been generated. Fix: ensure `npx prisma generate` runs as part of the build step or `postinstall` script.

## Arbetsformedlingen API

### Jobs Can Disappear
Saved jobs only store the `afJobId` reference, not full job data. When hydrating saved jobs from the AF API, individual jobs may return 404 if the listing has been removed. Always handle this gracefully with try/catch and filter out failed fetches.

### Partial Saved Job Failures Should Not Block UI
If one saved job is unavailable (expired/removed) but others are still resolvable, render available saved jobs and show a non-blocking warning. Do not replace the entire saved jobs panel with an error state when partial data is available.

### API Key is Optional
The AF JobSearch API works without an API key for basic usage. The key is only needed for higher rate limits.

### Region Filtering Needs Query Augmentation + Client Ranking Hint
AF `/search` integration in this project uses `q`, `limit`, and `offset`; there is no dedicated region parameter in the provider wrapper. Use region as a query augmentation signal and ranking hint. Do not hard-filter client-side by exact `workplace_address.region`, because AF location metadata can be missing or formatted differently (`Stockholm` vs `Stockholms län`).

### Region Input Must Be Available Pre-Search
If region can only be selected from post-search result metadata, users cannot include region in their first query. Keep a separate top-level region input in the search bar and avoid auto-clearing `selectedRegion` when no regions are loaded yet.

### Region Matching Should Be Normalized and Tolerant
Strict equality between typed region input and `workplace_address.region` can hide valid results (`stockholm` vs `Stockholms län`, diacritics/case differences). Normalize both sides (case + diacritics) and allow partial matches when applying client-side region filtering.

### Job Skill Extraction Should Not Depend Only on Selected Skills
Per-job "skills found" UI should be derived from listing text using a shared extractor (`lib/scoring.ts`) and a stable job-skill catalog, independent of the user's selected CV skills. Keep matched-vs-unmatched distinction in UI, but always show all extracted job skills when expanded.

### CV Skills Should Be Canonicalized to the Job Skills Catalog
Gemini-extracted CV skills are free-form strings, while job-skill extraction uses a catalog (AF synonym dictionary via `/api/skills/catalog`). If CV skills are stored unnormalized/unmapped (e.g. `React.js`, `Type Script`, `NodeJS`), overlap/highlighting and skills-based search can look "weak" even for relevant jobs.

On skill extraction (`POST /api/skills` and `POST /api/skills/batch`), map extracted CV skills onto the catalog using shared normalization + alias handling, cap to a small top-N (25), and store canonical labels. Client-side matching/highlighting should also use the same normalization (not just `toLowerCase()`).

## Next.js / React

### Hydration Mismatch from Chrome Extensions
Browser extensions (e.g., Claude in Chrome) can modify the DOM, causing Next.js hydration warnings ("1 Issue" in dev overlay). This is not a code bug and can be safely ignored.

### Route Handlers Cannot Export Test Helpers
Next.js App Router route files (for example `app/api/**/route.ts`) may only export supported route-handler symbols (`GET`, `POST`, etc.). Exporting test helpers from a route file can fail build-time type generation under `.next/types/...` with `Type ... does not satisfy the constraint '{ [x: string]: never; }'`.

For route handlers that use module-scoped caches, reset state in tests with `vi.resetModules()` + dynamic `import('./route')` in `beforeEach`, instead of exporting test-only reset helpers from the route file.

### Server Components by Default
Use Server Components for data fetching (dashboard page, header). Only add `'use client'` when the component needs interactivity (state, event handlers, effects).

### Date Serialization Across Server/Client Boundary
Prisma returns `Date` objects. When passing to client components, serialize with `.toISOString()`. Previously used `.slice(0, 10)` which dropped time information. Use the full ISO string to preserve date + time.

## UI/UX Design

### Card Elevation Over Flat Borders
Subtle box-shadows (`0 1px 2px` range) make cards feel more intentional than border-only cards. Combined with a hover shadow increase, this creates a tactile feel without being decorative.

### Typography Precision
Using specific pixel sizes (`text-[11px]`, `text-[13px]`) instead of Tailwind's scale (`text-xs`, `text-sm`) gives more control over visual hierarchy. Pair with `tracking-[0.08em]` for uppercase labels and `tracking-[-0.02em]` for headings.

### Swedish Date/Time Format
Use `sv-SE` locale with `hour12: false` for 24-hour time display. Swedish users expect "18:56" not "6:56 PM".

### Clickable Cards Need stopPropagation
When making an entire card clickable but keeping nested buttons functional, use `e.stopPropagation()` on nested button click handlers to prevent the card click from firing.

## Database

### SavedJob Stores Only References
The `SavedJob` model intentionally stores only `afJobId` (not full job data) to keep the database lightweight and always show fresh data from the AF API. Trade-off: jobs that are delisted become unavailable.

### Supabase RLS Policies
Row Level Security policies must be applied manually via SQL after `prisma db push`. Files: `prisma/rls-policies.sql` and `prisma/storage-rls-policies.sql`.
When adding new app tables (for example quota tracking like `UsageEvent`), update `prisma/rls-policies.sql` immediately; otherwise Supabase client-side access can be unintentionally unrestricted.

## i18n

### Translation Keys Namespaced by Feature
Dashboard keys use `dashboard.*` namespace. Nested keys like `dashboard.skills.title` keep translations organized. Both `sv.json` and `en.json` must stay in sync.

### PowerShell UTF-8 Mojibake
On Windows PowerShell, `Get-Content` can display UTF-8 characters incorrectly (e.g. `—` showing as `â€”`, `ä` as `Ã¤`). When inspecting/editing `messages/*.json`, use `Get-Content -Encoding UTF8` to avoid garbled strings.

### Server vs Client Translations
- Server Components: `getTranslations()` from `next-intl/server`
- Client Components: `useTranslations()` hook from `next-intl`

## Security

### Prompt Section Escaping for LLM Calls
When embedding user-provided text inside tagged prompt sections (`<cv_content>...</cv_content>`), sanitization alone is not enough. Always escape XML-like characters (`<`, `>`, `&`, quotes) to prevent tag breakout payloads (for example `</cv_content>`).

### Account Deletion Should Fail Closed on Auth Delete Errors
In multi-system account deletion (Auth + DB + Storage), do not return success if auth user deletion fails. Failing closed prevents a state where the user can still authenticate after a "successful" delete response.

### Admin Routes Gated by DEBUG_EMAIL
The `/admin` page and `/api/admin/*` routes are restricted to the email in `DEBUG_EMAIL` env var. Same pattern as the debug chat on the dashboard. Non-admin users get redirected to `/dashboard` (page) or receive a 403 (API). The admin delete endpoint reuses the same 3-step deletion logic as `/api/account/delete` (Auth → Storage → Prisma cascade).

## Tooling

### ESLint v9 Script Mismatch
Current `npm run lint` uses CLI flags (`--no-config-lookup`, `--parser-options`) that fail with the installed ESLint v9 CLI mode. In this repository, treat `npm run test` and `npx next build --webpack` as the reliable validation path until the lint script is modernized.

### Prisma Generate Can Fail While `next dev` Runs (Windows)
If `npx prisma generate` fails with `EPERM ... query_engine-windows.dll.node`, a local Node process (commonly `npm run dev`) is locking the Prisma engine binary. Stop the dev server (and its child `next` processes), then rerun `npx prisma generate`.

## Refactoring Patterns

### Keep Route Handlers Thin with Local `_lib` Modules
For complex route handlers (for example `app/api/upload/route.ts`), split responsibilities into route-local modules under `app/api/<route>/_lib/` (validation, parser integration, logging, response builders). Keep the route file focused on request orchestration so behavior can be tested without maintaining a single oversized file.

### Keep Interactive UI Files Focused on Composition
When client components grow large, extract stateful hooks + presentational blocks into feature folders (`components/jobs/search`, `components/jobs/results`, `components/dashboard/guide`, `components/auth/signin`, `components/letters`). This keeps the top-level component as composition logic and preserves behavior while improving readability and testability.

## Quotas & Entitlements

### Layer Monthly Plan Quotas Over Hourly Rate Limits
For AI endpoints, keep existing hourly in-memory anti-abuse limits (`consumeRateLimit`) and add DB-backed monthly quotas by tier (`UsageEvent` counts). The layered approach protects infrastructure from bursts while enforcing product entitlements across server restarts/instances.

### Surface Quota Snapshots for Proactive UI Feedback
When an action is plan-gated (for example cover-letter generation), expose a quota snapshot (`limit`, `used`, `remaining`, `resetAt`, `isExhausted`) from a lightweight profile read endpoint so mobile/web clients can disable CTA buttons before the user taps. Keep server-side quota enforcement on the mutation endpoint as the final authority and fallback.

### Normalize Blank Guidance Inputs Before Prompting
For letter generation guidance fields, normalize missing/empty/whitespace inputs to `undefined` before building prompts. This avoids treating blank strings as explicit instructions and keeps "generate with no guidance" behavior reliable.
