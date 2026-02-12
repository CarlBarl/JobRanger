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

### API Key is Optional
The AF JobSearch API works without an API key for basic usage. The key is only needed for higher rate limits.

## Next.js / React

### Hydration Mismatch from Chrome Extensions
Browser extensions (e.g., Claude in Chrome) can modify the DOM, causing Next.js hydration warnings ("1 Issue" in dev overlay). This is not a code bug and can be safely ignored.

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

## i18n

### Translation Keys Namespaced by Feature
Dashboard keys use `dashboard.*` namespace. Nested keys like `dashboard.skills.title` keep translations organized. Both `sv.json` and `en.json` must stay in sync.

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
