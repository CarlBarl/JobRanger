# JobMatch Simplified Architecture Design

**Date:** 2026-02-03
**Status:** Approved
**Author:** Architecture brainstorming session

---

## Overview

JobMatch helps Swedish job seekers by extracting skills from CVs, finding matching jobs from Arbetsförmedlingen, and generating personalized cover letters with AI.

**Core user flow:**
```
Upload CV → Extract skills → Search jobs → Save favorites → Generate letters
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14 (App Router) | Server Components by default |
| Language | TypeScript (strict) | No `any` types |
| Database | Supabase PostgreSQL | Via Prisma ORM |
| Storage | Supabase Storage | For CV files |
| Auth | Supabase Auth | Magic link only |
| AI | Google Gemini API | Skills extraction + letter generation |
| Jobs API | Arbetsförmedlingen | Swedish job listings |
| UI | Tailwind + shadcn/ui | Mobile-first |
| Testing | Vitest + RTL | TDD approach |

---

## Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  documents        Document[]
  savedJobs        SavedJob[]
  generatedLetters GeneratedLetter[]
}

model Document {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  type          String   // "cv" | "cover_letter_template"
  fileUrl       String
  parsedContent String?  @db.Text
  skills        Json?    // Array of extracted skills (CVs only)
  createdAt     DateTime @default(now())
}

model SavedJob {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  afJobId   String   // Arbetsförmedlingen job ID
  notes     String?
  savedAt   DateTime @default(now())

  letters   GeneratedLetter[]

  @@unique([userId, afJobId])
}

model GeneratedLetter {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id])
  savedJobId String?
  savedJob   SavedJob? @relation(fields: [savedJobId], references: [id])
  afJobId    String    // Always store for reference
  content    String    @db.Text
  createdAt  DateTime  @default(now())
}
```

### Key Schema Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tables | 4 | Clear separation: User, Document, SavedJob, GeneratedLetter |
| Version tracking | Removed | YAGNI - users can regenerate if needed |
| Job caching | None | Fetch fresh from AF API, store only afJobId |
| Skills storage | JSON | Flexible array, avoids separate skills table |

---

## Routes

### Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page | No |
| `/dashboard` | Main app view | Yes |
| `/jobs` | Browse/search jobs | Yes |
| `/jobs/[id]` | Job detail + generate letter | Yes |
| `/letters` | View generated letters | Yes |
| `/profile` | Account settings | Yes |
| `/auth/signin` | Sign in page | No |
| `/auth/callback` | Magic link callback | No |

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload` | Upload document to storage |
| GET | `/api/documents` | List user's documents |
| DELETE | `/api/documents/[id]` | Delete document |
| POST | `/api/skills` | Extract skills from CV via Gemini |
| GET | `/api/jobs` | Search Arbetsförmedlingen API |
| GET | `/api/jobs/[id]` | Get job details from AF API |
| POST | `/api/jobs/save` | Save job to favorites |
| DELETE | `/api/jobs/save/[id]` | Remove from favorites |
| GET | `/api/letters` | List generated letters |
| POST | `/api/generate` | Generate cover letter via Gemini |
| DELETE | `/api/letters/[id]` | Delete letter |

---

## Authentication

**Method:** Magic link via Supabase Auth

**Flow:**
1. User enters email on `/auth/signin`
2. Supabase sends magic link email
3. User clicks link → redirected to `/auth/callback`
4. Callback exchanges code for session
5. User redirected to `/dashboard`

**Protection:**
- Middleware checks session for protected routes
- Server components access user via `createServerClient()`
- Unauthenticated requests to protected routes → redirect to `/auth/signin`

---

## Data Flows

### 1. CV Upload & Skill Extraction

```
User uploads PDF/DOCX
         │
         ▼
┌──────────────────┐
│ POST /api/upload │
└──────────────────┘
         │
         ├─────────────────────┐
         ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│ Validate file    │   │ Upload to        │
│ (PDF/DOCX, <5MB) │   │ Supabase Storage │
└──────────────────┘   └──────────────────┘
         │                     │
         ▼                     │
┌──────────────────┐           │
│ Parse text       │           │
│ content          │◄──────────┘
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ POST /api/skills │
│ (async)          │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Gemini extracts  │
│ skills           │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Update Document  │
│ with skills JSON │
└──────────────────┘
```

### 2. Job Search

```
User enters search query
         │
         ▼
┌──────────────────────┐
│ GET /api/jobs?q=...  │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Fetch user's skills  │
│ from database        │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Query AF JobSearch   │
│ API with query +     │
│ skills context       │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Transform response   │
│ Return to client     │
└──────────────────────┘
```

### 3. Cover Letter Generation

```
User clicks "Generate" on job
         │
         ▼
┌─────────────────────────────┐
│ POST /api/generate          │
│ { afJobId, documentId }     │
└─────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Fetch job details    │
│ from AF API          │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Fetch user's CV      │
│ content + skills     │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Build prompt:        │
│ - Job requirements   │
│ - User skills        │
│ - CV context         │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Call Gemini API      │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Save GeneratedLetter │
│ to database          │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Return letter        │
│ content to client    │
└──────────────────────┘
```

---

## File Structure

```
jobmatch/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing
│   ├── dashboard/page.tsx
│   ├── jobs/
│   │   ├── page.tsx                # Job search
│   │   └── [id]/page.tsx           # Job detail
│   ├── letters/page.tsx
│   ├── profile/page.tsx
│   ├── auth/
│   │   ├── signin/page.tsx
│   │   └── callback/route.ts
│   └── api/
│       ├── upload/route.ts
│       ├── documents/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── skills/route.ts
│       ├── jobs/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── save/
│       │       ├── route.ts
│       │       └── [id]/route.ts
│       ├── generate/route.ts
│       └── letters/
│           ├── route.ts
│           └── [id]/route.ts
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── upload/
│   │   ├── FileUpload.tsx
│   │   └── FilePreview.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── JobList.tsx
│   │   └── JobFilters.tsx
│   └── letters/
│       ├── LetterCard.tsx
│       └── LetterViewer.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client
│   ├── prisma.ts
│   ├── gemini.ts
│   └── arbetsformedlingen.ts
├── prisma/
│   └── schema.prisma
├── middleware.ts                    # Auth protection
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.local
```

---

## Implementation Order

1. **Project setup**
   - Initialize Next.js 14 with TypeScript
   - Configure Tailwind, shadcn/ui
   - Set up Prisma + Supabase connection
   - Create database schema

2. **Authentication**
   - Supabase Auth client setup
   - Sign-in page with magic link
   - Auth callback handler
   - Middleware for protected routes

3. **CV upload**
   - FileUpload component
   - Upload API route
   - Supabase Storage integration
   - PDF/DOCX text parsing

4. **Skill extraction**
   - Gemini client setup
   - Skills extraction prompt
   - Skills API route
   - Display skills in dashboard

5. **Job search**
   - Arbetsförmedlingen API client
   - Jobs API route
   - JobCard and JobList components
   - Search UI

6. **Save jobs**
   - Save/unsave API routes
   - Saved jobs section in dashboard

7. **Letter generation**
   - Generation prompt design
   - Generate API route
   - LetterViewer component
   - Letters list page

8. **Polish**
   - Error handling
   - Loading states
   - Mobile responsiveness
   - Final testing

---

## Future Features (Not MVP)

- **Application submission** - Email employer or redirect to AF apply page
- **Social auth** - Google sign-in option
- **Letter editing** - Edit generated letters before saving
- **Skills management** - Manually add/remove skills
- **Job recommendations** - Proactive job suggestions based on skills

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database
DATABASE_URL=

# External APIs
AF_API_KEY=
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Changes from Original Architecture

| Original | Simplified | Reason |
|----------|------------|--------|
| 5 doc files (~1800 lines) | 1 design doc | Reduce maintenance burden |
| Version tracking on letters | Removed | YAGNI - regenerate instead |
| Job title/company in SavedJob | Removed | Fetch fresh from AF API |
| Multiple auth options | Magic link only | Simpler for MVP |
| Detailed component hierarchy | High-level structure | Emerges during implementation |
