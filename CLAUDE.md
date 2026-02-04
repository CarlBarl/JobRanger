# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobMatch is an AI-powered job matching platform for Swedish job seekers. Users upload CVs, get matched with jobs from Arbetsförmedlingen (Swedish Employment Agency), and generate personalized cover letters using Gemini AI.

**Tech Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, Prisma ORM, Supabase (PostgreSQL + Storage), Google Gemini API, Vitest

## Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Build for production
npm run lint                   # ESLint
npm run format                 # Prettier

# Testing
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test -- JobCard.test   # Run specific test file

# Database
npx prisma generate            # Generate Prisma client
npx prisma db push             # Push schema to database
npx prisma studio              # Database GUI
```

## Architecture

### Data Flows

1. **Upload Flow:** User uploads CV → Supabase Storage → Parse content → Gemini extracts skills → Save to database
2. **Job Search:** Fetch user skills → Query Arbetsförmedlingen API → Return matched jobs
3. **Cover Letter:** Selected job + user CV → Gemini generates personalized letter

### Key Directories

```
app/                    # Next.js pages and API routes
  api/upload/           # File upload endpoint
  api/jobs/             # Job search (proxies AF API)
  api/generate/         # Cover letter generation
components/
  ui/                   # shadcn/ui base components
  [feature]/            # Feature-specific components (upload/, jobs/, letters/)
lib/
  gemini.ts             # Gemini AI client
  arbetsformedlingen.ts # AF JobSearch API client
  supabase/             # Supabase client (storage)
  prisma.ts             # Database client
prisma/schema.prisma    # Database schema
```

### Database Entities

- **User** - id, email, name
- **Document** - user's CVs/cover letters with parsed content and extracted skills (JSON)
- **SavedJob** - references AF job IDs (not full job data)
- **GeneratedLetter** - AI-generated letters with version tracking

## Development Principles

### TDD is Mandatory

Write failing test first → Implement minimal code → Refactor. Never write implementation without a corresponding test.

### TypeScript

- Strict mode, no `any` types
- Use Zod for runtime validation
- Interface over type for object shapes

### React/Next.js

- Server Components by default
- `'use client'` only when needed (interactivity, hooks)
- Prefer Server Actions for mutations

### Testing

- Use Vitest + React Testing Library
- Mock external services (Supabase, Gemini, AF API)
- Co-locate tests: `ComponentName.test.tsx` alongside source
- Browser testing: Use Claude Code's Chrome integration (`/chrome`)

## External Services

| Service | Base URL / Package | Auth |
|---------|-------------------|------|
| Arbetsförmedlingen | `https://jobsearch.api.jobtechdev.se` | Optional header: `api-key: {key}` |
| Gemini AI | `@google/generative-ai` | `GEMINI_API_KEY` env var |
| Supabase | Project URL in env | `SUPABASE_SERVICE_ROLE_KEY` |

**Get AF API key (optional):** https://apirequest.jobtechdev.se
**Get Gemini key:** https://makersuite.google.com/app/apikey

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
# Optional (job search works without a key)
AF_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL
```
