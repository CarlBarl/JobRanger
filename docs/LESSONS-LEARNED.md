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

### GitHub Actions Vercel Preview Requires Project Secrets
For PR-based preview deployments via GitHub Actions, set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets and run `vercel pull/build/deploy` in CI. Keep the workflow on `pull_request` (not `pull_request_target`) so untrusted fork code does not run with secrets.

### Split Preview vs Production Deploy Pipelines
When Vercel Git auto-deploy is disabled, use separate GitHub Actions workflows: one for PR preview (`--environment=preview`) and one for `main` production deploy (`--environment=production` + `--prod`). Keep production workflow bound to `push` on `main` and `environment: production` for optional approval gates.

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

### Keep Mobile Top Navigation Minimal
Authenticated top nav works best with only primary destinations (Dashboard + Jobs). Move secondary controls (language, feature shortcuts, guide replay) into dashboard/settings surfaces to avoid overflow and tap-density issues on small screens.

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

### User Tier Must Be Server-Managed (RLS Column Privileges)
The `User.tier` field is an entitlement and must not be client-writable. RLS policies can't restrict columns, so tighten privileges: `REVOKE UPDATE` on `"User"` for `anon`/`authenticated` and `GRANT UPDATE` only on safe profile columns (for example `name`, `letterGuidanceDefault`, `country`) in `prisma/rls-policies.sql`.

### Admin Access Should Be DB Role-Based (Not `DEBUG_EMAIL`)
Use `User.role` (`USER` / `ADMIN`) as the authorization source for `/admin` and `/api/admin/*`. Environment-based single-email admin gates are brittle and make role changes operationally risky. Keep role assignment explicit via SQL (`prisma/admin-role.sql`) and enforce admin checks server-side.

### Stripe Entitlements Should Use Price Allowlist
Webhook processing should verify subscription `priceId` against an explicit allowlist (`STRIPE_ALLOWED_PRICE_IDS`, fallback to `STRIPE_PRICE_ID_PRO_MONTHLY`). If a disallowed price appears, cancel the subscription and keep the user on `FREE` to prevent accidental entitlement escalation.

## Tooling

### ESLint v9 Script Mismatch
Current `npm run lint` uses CLI flags (`--no-config-lookup`, `--parser-options`) that fail with the installed ESLint v9 CLI mode. In this repository, treat `npm run test` and `npx next build --webpack` as the reliable validation path until the lint script is modernized.

### CI DB Integration Uses Plain Postgres + Supabase RLS Shim
CI runs DB integration tests against an ephemeral Postgres service container and bootstraps a minimal Supabase-like `auth.uid()` function plus `anon`/`authenticated` roles via `prisma/ci-supabase-compat.sql` so `prisma/rls-policies.sql` can be validated. Storage RLS policies remain Supabase-only and are not validated in CI.

### Prisma Generate Can Fail While `next dev` Runs (Windows)
If `npx prisma generate` fails with `EPERM ... query_engine-windows.dll.node`, a local Node process (commonly `npm run dev`) is locking the Prisma engine binary. Stop the dev server (and its child `next` processes), then rerun `npx prisma generate`.

### Git Worktrees Need Their Own Dependencies
When creating a separate worktree for parallel agent work, that folder may not have `node_modules`. Run `npm ci` in the new worktree before running `vitest` or `npx next build --webpack`.

### Webpack Build Check May Need Prisma Generate First
In this repository we validate builds with `npx next build --webpack` (not `npm run build`). That command does not run `prisma generate`, so a fresh/stale worktree can fail with Prisma type errors (for example missing enum exports like `UserTier`). Run `npx prisma generate` before the webpack build check when this happens.

### Distributed Rate Limiting Needs External State in Production
In-memory rate limits reset on restart and can be bypassed across multiple instances. For production deployments, use an external backend (for example Upstash Redis via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) and keep in-memory fallback only for local dev/test.

## Billing / Stripe

### Stripe v20: Subscription period fields moved to items
Stripe Node SDK v20 types no longer expose `Subscription.current_period_end` / `current_period_start`. If you need a "current period end" timestamp (for example for entitlement UI), use `subscription.items.data[].current_period_end` (take the max when multiple items exist).

### Webhook Idempotency Should Allow Retries
When storing webhook events for idempotency, track a `processedAt` timestamp and only short-circuit duplicates after successful processing. If processing fails, return a 5xx so Stripe retries.

### Local Billing Testing Requires Webhook Forwarding
When Stripe webhooks are configured to a production domain (for example `jobbijagaren.se`), local development won't receive events. For local tests, use the Stripe CLI to forward webhooks to your dev server:
- `stripe login`
- `stripe listen --forward-to http://localhost:3000/api/billing/webhook`

The CLI prints a local `whsec_...` signing secret. Use that in `.env.local` as `STRIPE_WEBHOOK_SECRET`. Do not reuse the production `whsec_...` locally.

Also ensure environments match:
- Local: `sk_test_...` + test `price_...` + CLI `whsec_...`
- Production: `sk_live_...` + live `price_...` + production webhook `whsec_...`

### Portal CTA Should Depend on Billing Profile, Not Tier Alone
Legacy/stale `User.tier='PRO'` can exist without a `Subscription` row. Showing "Manage subscription" based only on tier causes `/api/billing/portal` 404 ("No subscription found"). Gate portal CTAs by presence of a Stripe billing profile (`subscription.stripeCustomerId`) and allow checkout when missing.

### Checkout Should Recover From Stale Stripe Customer IDs
After Stripe mode/account migrations, a stored `Subscription.stripeCustomerId` may no longer exist in the active Stripe account (`No such customer: 'cus_...'`). In checkout flow, treat Stripe `resource_missing` on `customer` as recoverable: create a new Stripe customer, persist it, and retry checkout session creation once.

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

### Keep Dedicated AI Model Settings Per Feature
For higher-stakes CV rewrite workflows, use a dedicated model env var (`GEMINI_CV_MODEL`, default `gemini-3-flash-preview`) instead of the default lightweight model used by other features. Track usage with separate `UsageEventType` values (`CV_FEEDBACK`, `CV_EDIT`) so quotas can be tuned without affecting letter/skills flows.

### Normalize Blank Guidance Inputs Before Prompting
For letter generation guidance fields, normalize missing/empty/whitespace inputs to `undefined` before building prompts. This avoids treating blank strings as explicit instructions and keeps "generate with no guidance" behavior reliable.
