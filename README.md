# JobRanger

An AI-powered job matching platform for Swedish job seekers. Upload your CV, get matched with jobs from Arbetsförmedlingen, and generate personalized cover letters with Gemini AI.

## Features

- **CV & Cover Letter Upload** - PDF, DOCX, or TXT. Parsed and stored for matching.
- **AI Skills Extraction** - Gemini analyzes your CV and extracts skills automatically.
- **Job Search** - Search Arbetsförmedlingen's job listings, filtered by your profile.
- **Save Jobs** - Bookmark jobs and see them on your dashboard.
- **AI Cover Letters** - Generate tailored cover letters for specific job postings.
- **Tiered AI Quotas** - Monthly AI quotas by user tier (`FREE` vs `PRO`) in addition to hourly anti-abuse limits.
- **Dashboard** - Overview of your documents, skills, saved jobs, and stats.
- **i18n** - Swedish and English, switchable in-app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript (strict) |
| Styling | Tailwind CSS, shadcn/ui |
| Database | Supabase (PostgreSQL + Storage) |
| ORM | Prisma |
| AI | Google Gemini API |
| Jobs API | Arbetsformedlingen JobSearch API |
| Auth | Supabase Auth |
| i18n | next-intl (sv, en) |
| Testing | Vitest, React Testing Library |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Google AI API key (Gemini)
- Arbetsformedlingen API key (optional)

### Setup

```bash
git clone <repository-url>
cd JobRanger
npm install
cp env.example .env.local   # Fill in values below
npx prisma generate
npx prisma db push
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
GEMINI_API_KEY=
AF_API_KEY=                  # Optional
NEXT_PUBLIC_APP_URL=
DEBUG_EMAIL=                 # Optional - enables debug chat
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_ALLOWED_PRICE_IDS=      # Optional CSV allowlist (defaults to STRIPE_PRICE_ID_PRO_MONTHLY)
UPSTASH_REDIS_REST_URL=        # Recommended for distributed rate limiting in production
UPSTASH_REDIS_REST_TOKEN=
```

### Database Setup

After `prisma db push`, apply RLS policies in Supabase SQL Editor:
- `prisma/rls-policies.sql` (app tables)
- `prisma/storage-rls-policies.sql` (Storage bucket)

To grant admin access with RBAC, run:
- `prisma/admin-role.sql` (replace the placeholder email first)

## Project Structure

```
app/
  dashboard/              # User dashboard (server + client components)
  jobs/                   # Job search and listings
    [id]/
      _components/        # Job detail UI sections
      _lib/               # Job detail format/render helpers
  letters/                # Generated cover letters
  api/
    upload/               # File upload endpoint
      _lib/               # Upload validation/parsing/logging helpers
    jobs/                 # Job search + save (proxies AF API)
    generate/             # Cover letter generation
    skills/               # Skills extraction + batch regeneration
components/
  auth/
    signin/               # Sign-in form panels and API helpers
  dashboard/              # Dashboard sections, hooks, guides
    guide/                # Dashboard tour segments and flow state
  guides/                 # Reusable guided tour overlay primitives
  jobs/
    results/              # Search result/pagination subcomponents
    search/               # Search state/actions/execution hooks
  letters/                # Letters list/cards + clipboard helpers
  upload/                 # FileUpload, PersonalLetterUpload
  ui/                     # shadcn/ui base components
lib/
  services/gemini.ts      # Gemini AI client
  services/arbetsformedlingen.ts  # AF JobSearch API client
  supabase/               # Supabase client (auth + storage)
  prisma.ts               # Database client
  constants.ts            # Shared constants
  storage.ts              # Document URL resolution
  auth.ts                 # User creation/lookup
prisma/schema.prisma      # Database schema
messages/                 # i18n translations (en.json, sv.json)
```

## Scripts

```bash
npm run dev               # Dev server (localhost:3000)
npm run build             # Production build
npm run lint              # ESLint
npm run test              # Vitest
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npx next build --webpack  # Build validation used in this repo's sandbox workflow
```

## Data Flow

1. **Upload**: User uploads CV -> Supabase Storage -> Parse content -> Gemini extracts skills -> Save to DB
2. **Search**: User skills -> Query AF API -> Display matched jobs
3. **Save**: User bookmarks job -> Store AF job ID in DB -> Show on dashboard
4. **Generate**: Selected job + user CV -> Gemini generates personalized cover letter

## AI Quotas

- Quotas are tier-aware and monthly (UTC calendar month), backed by DB usage events.
- Current defaults:
  - `FREE`: 1 letter/month, 3 single skill extractions/month, 1 batch extraction/month
  - `PRO`: 200 letters/month, 300 single skill extractions/month, 50 batch extractions/month (set via Stripe subscription)
- Existing hourly rate limiting remains active for anti-abuse protection.

## API Integrations

| Service | Endpoint | Auth |
|---------|----------|------|
| Arbetsformedlingen | `https://jobsearch.api.jobtechdev.se` | Optional `api-key` header |
| Gemini AI | `@google/generative-ai` | `GEMINI_API_KEY` env var |
| Supabase | Project URL in env | `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe Billing | Stripe API | `STRIPE_SECRET_KEY` + webhooks |

## License

MIT
