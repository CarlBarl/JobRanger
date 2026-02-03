# JobMatch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a job matching platform that extracts skills from CVs, searches Swedish jobs, and generates cover letters with AI.

**Architecture:** Next.js 14 App Router with Supabase (Postgres + Storage + Auth). Gemini AI for skill extraction and letter generation. Arbetsförmedlingen API for job listings. TDD with Vitest.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Supabase, Tailwind, shadcn/ui, Vitest, Google Gemini, Arbetsförmedlingen API

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `.env.local`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Expected: Project scaffolded with Next.js 14, TypeScript, Tailwind

**Step 2: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000

**Step 3: Create environment file**

Create `.env.local`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase connection string)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# External APIs
AF_API_KEY=your-af-api-key
GEMINI_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 4: Commit**

```bash
git init
git add .
git commit -m "chore: initialize Next.js 14 project with TypeScript and Tailwind"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Prisma and Supabase**

Run:
```bash
npm install @prisma/client @supabase/supabase-js @supabase/ssr
npm install -D prisma
```

**Step 2: Install UI dependencies**

Run:
```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
npx shadcn@latest init -d
```

When prompted, accept defaults (New York style, Zinc color).

**Step 3: Install testing dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event
```

**Step 4: Install additional utilities**

Run:
```bash
npm install zod @google/generative-ai
npm install -D @types/node
```

**Step 5: Commit**

```bash
git add .
git commit -m "chore: install project dependencies"
```

---

## Task 3: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `lib/test-utils.tsx`

**Step 1: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**Step 2: Add test scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Step 3: Create test utilities**

Create `lib/test-utils.tsx`:
```typescript
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

**Step 4: Run test command to verify setup**

Run: `npm run test`
Expected: "No test files found" (this is correct - no tests yet)

**Step 5: Commit**

```bash
git add .
git commit -m "chore: configure Vitest for testing"
```

---

## Task 4: Setup Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

**Step 1: Initialize Prisma**

Run: `npx prisma init`
Expected: Creates `prisma/schema.prisma` and updates `.env`

**Step 2: Write database schema**

Replace `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type          String   // "cv" | "cover_letter_template"
  fileUrl       String
  parsedContent String?  @db.Text
  skills        Json?
  createdAt     DateTime @default(now())

  @@index([userId])
}

model SavedJob {
  id      String   @id @default(cuid())
  userId  String
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  afJobId String
  notes   String?
  savedAt DateTime @default(now())

  letters GeneratedLetter[]

  @@unique([userId, afJobId])
  @@index([userId])
}

model GeneratedLetter {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  savedJobId String?
  savedJob   SavedJob? @relation(fields: [savedJobId], references: [id], onDelete: SetNull)
  afJobId    String
  content    String    @db.Text
  createdAt  DateTime  @default(now())

  @@index([userId])
}
```

**Step 3: Create Prisma client singleton**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Step 4: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma Client generated successfully

**Step 5: Push schema to database**

Run: `npx prisma db push`
Expected: Database schema created in Supabase

**Step 6: Verify with Prisma Studio**

Run: `npx prisma studio`
Expected: Opens browser with empty tables visible

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add Prisma schema with User, Document, SavedJob, GeneratedLetter models"
```

---

## Task 5: Setup Supabase Clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

**Step 1: Create browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  )
}
```

**Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const protectedPaths = ['/dashboard', '/jobs', '/letters', '/profile']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: setup Supabase client helpers for browser, server, and middleware"
```

---

## Task 6: Authentication - Middleware

**Files:**
- Create: `middleware.ts`

**Step 1: Create auth middleware**

Create `middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add authentication middleware for protected routes"
```

---

## Task 7: Authentication - Sign In Page

**Files:**
- Create: `app/auth/signin/page.tsx`
- Create: `components/auth/SignInForm.tsx`
- Create: `components/auth/SignInForm.test.tsx`

**Step 1: Write failing test for SignInForm**

Create `components/auth/SignInForm.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import userEvent from '@testing-library/user-event'
import { SignInForm } from './SignInForm'

describe('SignInForm', () => {
  it('should render email input and submit button', () => {
    render(<SignInForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show error for invalid email', async () => {
    const user = userEvent.setup()
    render(<SignInForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- SignInForm`
Expected: FAIL - SignInForm not found

**Step 3: Install shadcn components needed**

Run:
```bash
npx shadcn@latest add button input label card
```

**Step 4: Create SignInForm component**

Create `components/auth/SignInForm.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to {email}. Click the link to sign in.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to JobMatch</CardTitle>
        <CardDescription>
          Enter your email to receive a magic link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Sign in with magic link'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 5: Add test setup for jsdom globals**

Create `vitest.setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

Update `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

Install: `npm install -D @testing-library/jest-dom`

**Step 6: Run test to verify it passes**

Run: `npm run test -- SignInForm`
Expected: PASS

**Step 7: Create sign in page**

Create `app/auth/signin/page.tsx`:
```typescript
import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <SignInForm />
    </main>
  )
}
```

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add magic link sign in form and page"
```

---

## Task 8: Authentication - Callback Handler

**Files:**
- Create: `app/auth/callback/route.ts`

**Step 1: Create callback route**

Create `app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to sign in with error
  return NextResponse.redirect(`${origin}/auth/signin?error=Could not authenticate`)
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add auth callback handler for magic link"
```

---

## Task 9: Authentication - User Sync with Prisma

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/auth.test.ts`

**Step 1: Write failing test for user sync**

Create `lib/auth.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrCreateUser } from './auth'

// Mock Prisma
vi.mock('./prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from './prisma'

describe('getOrCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create user if not exists', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: null,
      createdAt: new Date(),
    }

    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser)

    const result = await getOrCreateUser('auth-id-123', 'test@example.com')

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: 'auth-id-123',
        email: 'test@example.com',
      },
    })
    expect(result).toEqual(mockUser)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- auth.test`
Expected: FAIL - getOrCreateUser not found

**Step 3: Create auth helper**

Create `lib/auth.ts`:
```typescript
import { prisma } from './prisma'

export async function getOrCreateUser(authId: string, email: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: authId,
      email,
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- auth.test`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add user sync helper for auth"
```

---

## Task 10: Dashboard Page (Protected)

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `components/dashboard/DashboardHeader.tsx`

**Step 1: Create dashboard header component**

Create `components/dashboard/DashboardHeader.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export async function DashboardHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          JobMatch
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/jobs">
            <Button variant="ghost">Jobs</Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost">Letters</Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            {user?.email}
          </span>
        </nav>
      </div>
    </header>
  )
}
```

**Step 2: Create dashboard page**

Create `app/dashboard/page.tsx`:
```typescript
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateUser } from '@/lib/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return null // Middleware will redirect
  }

  // Sync user to Prisma database
  const user = await getOrCreateUser(authUser.id, authUser.email!)

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome, {user.name || user.email}</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your CV</h2>
            <p className="text-muted-foreground">Upload your CV to get started</p>
            {/* FileUpload component will go here */}
          </section>

          <section className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Saved Jobs</h2>
            <p className="text-muted-foreground">No saved jobs yet</p>
            {/* SavedJobs component will go here */}
          </section>
        </div>
      </main>
    </div>
  )
}
```

**Step 3: Verify by navigating to /dashboard**

Run: `npm run dev`
Navigate to: http://localhost:3000/dashboard
Expected: Redirects to /auth/signin (not logged in)

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add protected dashboard page with header"
```

---

## Task 11: Landing Page

**Files:**
- Modify: `app/page.tsx`

**Step 1: Create landing page**

Replace `app/page.tsx`:
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">JobMatch</span>
          <Link href="/auth/signin">
            <Button>Sign In</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Find Your Perfect Job in Sweden
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Upload your CV, discover matching jobs from Arbetsförmedlingen,
          and generate personalized cover letters with AI.
        </p>
        <Link href="/auth/signin">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">Upload CV</h3>
            <p className="text-muted-foreground">
              We extract your skills automatically using AI
            </p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">Search Jobs</h3>
            <p className="text-muted-foreground">
              Find relevant jobs from Arbetsförmedlingen
            </p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">Generate Letters</h3>
            <p className="text-muted-foreground">
              AI creates personalized cover letters for each job
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
```

**Step 2: Verify landing page**

Run: `npm run dev`
Navigate to: http://localhost:3000
Expected: Landing page with sign in button

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add landing page with hero and features"
```

---

## Task 12: Arbetsförmedlingen API Client

**Files:**
- Create: `lib/arbetsformedlingen.ts`
- Create: `lib/arbetsformedlingen.test.ts`

**Step 1: Write failing test**

Create `lib/arbetsformedlingen.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchJobs, getJob, type Job } from './arbetsformedlingen'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('arbetsformedlingen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AF_API_KEY = 'test-api-key'
  })

  describe('searchJobs', () => {
    it('should search jobs with query', async () => {
      const mockResponse = {
        hits: [
          {
            id: 'job-123',
            headline: 'Software Developer',
            employer: { name: 'Tech Company' },
            workplace_address: { municipality: 'Stockholm' },
            description: { text: 'Job description' },
            publication_date: '2024-01-15',
          },
        ],
        total: { value: 1 },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchJobs('developer')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=developer'),
        expect.objectContaining({
          headers: { 'api-key': 'test-api-key' },
        })
      )
      expect(result.jobs).toHaveLength(1)
      expect(result.jobs[0].title).toBe('Software Developer')
    })
  })

  describe('getJob', () => {
    it('should fetch single job by id', async () => {
      const mockJob = {
        id: 'job-123',
        headline: 'Software Developer',
        employer: { name: 'Tech Company' },
        workplace_address: { municipality: 'Stockholm' },
        description: { text: 'Full description' },
        publication_date: '2024-01-15',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJob),
      })

      const result = await getJob('job-123')

      expect(result?.title).toBe('Software Developer')
      expect(result?.company).toBe('Tech Company')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- arbetsformedlingen`
Expected: FAIL - searchJobs not found

**Step 3: Create AF client**

Create `lib/arbetsformedlingen.ts`:
```typescript
const AF_BASE_URL = 'https://jobsearch.api.jobtechdev.se'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  publishedAt: string
}

interface AFJobResponse {
  id: string
  headline: string
  employer: { name: string }
  workplace_address?: { municipality?: string }
  description?: { text?: string }
  publication_date: string
}

interface AFSearchResponse {
  hits: AFJobResponse[]
  total: { value: number }
}

function transformJob(job: AFJobResponse): Job {
  return {
    id: job.id,
    title: job.headline,
    company: job.employer?.name || 'Unknown',
    location: job.workplace_address?.municipality || 'Sweden',
    description: job.description?.text || '',
    publishedAt: job.publication_date,
  }
}

export async function searchJobs(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{ jobs: Job[]; total: number }> {
  const limit = options?.limit || 20
  const offset = options?.offset || 0

  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    offset: offset.toString(),
  })

  const response = await fetch(`${AF_BASE_URL}/search?${params}`, {
    headers: {
      'api-key': process.env.AF_API_KEY!,
    },
  })

  if (!response.ok) {
    throw new Error(`AF API error: ${response.status}`)
  }

  const data: AFSearchResponse = await response.json()

  return {
    jobs: data.hits.map(transformJob),
    total: data.total.value,
  }
}

export async function getJob(id: string): Promise<Job | null> {
  const response = await fetch(`${AF_BASE_URL}/ad/${id}`, {
    headers: {
      'api-key': process.env.AF_API_KEY!,
    },
  })

  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`AF API error: ${response.status}`)
  }

  const data: AFJobResponse = await response.json()
  return transformJob(data)
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- arbetsformedlingen`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Arbetsförmedlingen API client"
```

---

## Task 13: Jobs API Route

**Files:**
- Create: `app/api/jobs/route.ts`

**Step 1: Create jobs search endpoint**

Create `app/api/jobs/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchJobs } from '@/lib/arbetsformedlingen'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Check auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!query) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter q is required' } },
      { status: 400 }
    )
  }

  try {
    const result = await searchJobs(query, { limit, offset })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Job search error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to search jobs' } },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add jobs search API route"
```

---

## Task 14: Job Detail API Route

**Files:**
- Create: `app/api/jobs/[id]/route.ts`

**Step 1: Create job detail endpoint**

Create `app/api/jobs/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/arbetsformedlingen'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const job = await getJob(id)

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    console.error('Job fetch error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch job' } },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add job detail API route"
```

---

## Task 15: JobCard Component

**Files:**
- Create: `components/jobs/JobCard.tsx`
- Create: `components/jobs/JobCard.test.tsx`

**Step 1: Write failing test**

Create `components/jobs/JobCard.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/lib/test-utils'
import { JobCard } from './JobCard'

describe('JobCard', () => {
  const mockJob = {
    id: 'job-123',
    title: 'Software Developer',
    company: 'Tech Company',
    location: 'Stockholm',
    description: 'An exciting opportunity...',
    publishedAt: '2024-01-15',
  }

  it('should render job title and company', () => {
    render(<JobCard job={mockJob} />)

    expect(screen.getByText('Software Developer')).toBeInTheDocument()
    expect(screen.getByText('Tech Company')).toBeInTheDocument()
  })

  it('should render location', () => {
    render(<JobCard job={mockJob} />)

    expect(screen.getByText(/Stockholm/)).toBeInTheDocument()
  })

  it('should have link to job detail', () => {
    render(<JobCard job={mockJob} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/jobs/job-123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- JobCard`
Expected: FAIL - JobCard not found

**Step 3: Create JobCard component**

Create `components/jobs/JobCard.tsx`:
```typescript
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Building2, Calendar } from 'lucide-react'
import type { Job } from '@/lib/arbetsformedlingen'

interface JobCardProps {
  job: Job
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{job.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{job.company}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(job.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
          {job.description && (
            <p className="mt-3 text-sm line-clamp-2">
              {job.description.substring(0, 150)}...
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- JobCard`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add JobCard component"
```

---

## Task 16: Jobs Page

**Files:**
- Create: `app/jobs/page.tsx`
- Create: `components/jobs/JobSearch.tsx`
- Create: `components/jobs/JobList.tsx`

**Step 1: Create JobSearch component**

Create `components/jobs/JobSearch.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function JobSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/jobs?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Search jobs (e.g., developer, nurse, teacher)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  )
}
```

**Step 2: Create JobList component**

Create `components/jobs/JobList.tsx`:
```typescript
import { JobCard } from './JobCard'
import type { Job } from '@/lib/arbetsformedlingen'

interface JobListProps {
  jobs: Job[]
}

export function JobList({ jobs }: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No jobs found. Try a different search term.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
```

**Step 3: Create jobs page**

Create `app/jobs/page.tsx`:
```typescript
import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { JobSearch } from '@/components/jobs/JobSearch'
import { JobList } from '@/components/jobs/JobList'
import { searchJobs } from '@/lib/arbetsformedlingen'

interface JobsPageProps {
  searchParams: Promise<{ q?: string }>
}

async function JobResults({ query }: { query: string }) {
  const { jobs, total } = await searchJobs(query)

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Found {total} jobs
      </p>
      <JobList jobs={jobs} />
    </div>
  )
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const { q } = await searchParams

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Search Jobs</h1>

        <div className="mb-8">
          <Suspense fallback={null}>
            <JobSearch />
          </Suspense>
        </div>

        {q ? (
          <Suspense fallback={<div>Loading jobs...</div>}>
            <JobResults query={q} />
          </Suspense>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Enter a search term to find jobs from Arbetsförmedlingen
          </div>
        )}
      </main>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add jobs search page with JobSearch and JobList components"
```

---

## Task 17: Job Detail Page

**Files:**
- Create: `app/jobs/[id]/page.tsx`

**Step 1: Create job detail page**

Create `app/jobs/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getJob } from '@/lib/arbetsformedlingen'
import { ArrowLeft, MapPin, Building2, Calendar } from 'lucide-react'

interface JobDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params
  const job = await getJob(id)

  if (!job) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <Link href="/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to search
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{job.title}</CardTitle>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {job.company}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(job.publishedAt).toLocaleDateString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>

            <div className="flex gap-4 mt-8">
              <Button>Save Job</Button>
              <Button variant="outline">Generate Cover Letter</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add job detail page"
```

---

## Task 18: Gemini Client

**Files:**
- Create: `lib/gemini.ts`
- Create: `lib/gemini.test.ts`

**Step 1: Write failing test**

Create `lib/gemini.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractSkills, generateCoverLetter } from './gemini'

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => '["JavaScript", "React", "Node.js"]',
        },
      }),
    }),
  })),
}))

describe('gemini', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  describe('extractSkills', () => {
    it('should extract skills from CV text', async () => {
      const cvText = 'I have 5 years of experience with JavaScript and React...'
      const skills = await extractSkills(cvText)

      expect(Array.isArray(skills)).toBe(true)
    })
  })

  describe('generateCoverLetter', () => {
    it('should generate cover letter', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => 'Dear Hiring Manager, I am writing to apply...',
            },
          }),
        }),
      }) as any)

      const result = await generateCoverLetter({
        jobTitle: 'Software Developer',
        company: 'Tech Corp',
        jobDescription: 'Looking for a developer...',
        cvContent: 'Experienced developer...',
        skills: ['JavaScript', 'React'],
      })

      expect(typeof result).toBe('string')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- gemini`
Expected: FAIL - extractSkills not found

**Step 3: Create Gemini client**

Create `lib/gemini.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

function getClient() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
}

export async function extractSkills(cvText: string): Promise<string[]> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Analyze the following CV/resume text and extract a list of professional skills.
Return ONLY a JSON array of skill strings, nothing else.
Focus on technical skills, tools, languages, and competencies.
Example output: ["JavaScript", "Project Management", "SQL", "Agile"]

CV Text:
${cvText}

Return only the JSON array:`

  const result = await model.generateContent(prompt)
  const responseText = result.response.text()

  try {
    // Parse the JSON array from the response
    const cleaned = responseText.trim().replace(/```json\n?|\n?```/g, '')
    return JSON.parse(cleaned)
  } catch {
    // If parsing fails, try to extract skills manually
    console.error('Failed to parse skills JSON:', responseText)
    return []
  }
}

interface CoverLetterInput {
  jobTitle: string
  company: string
  jobDescription: string
  cvContent: string
  skills: string[]
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<string> {
  const genAI = getClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const prompt = `Write a professional cover letter in Swedish for a job application.

Job Title: ${input.jobTitle}
Company: ${input.company}
Job Description: ${input.jobDescription}

Applicant's Background (from CV):
${input.cvContent}

Applicant's Key Skills: ${input.skills.join(', ')}

Instructions:
- Write in Swedish
- Be professional but personable
- Highlight relevant skills and experience
- Show enthusiasm for the role
- Keep it concise (around 300 words)
- Do not include placeholder text like [Your Name]

Cover Letter:`

  const result = await model.generateContent(prompt)
  return result.response.text()
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- gemini`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Gemini client for skill extraction and cover letter generation"
```

---

## Task 19: Skills Extraction API

**Files:**
- Create: `app/api/skills/route.ts`

**Step 1: Create skills extraction endpoint**

Create `app/api/skills/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { extractSkills } from '@/lib/gemini'
import { z } from 'zod'

const requestSchema = z.object({
  documentId: z.string(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { documentId } = requestSchema.parse(body)

    // Get document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
        type: 'cv',
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    if (!document.parsedContent) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Document has no parsed content' } },
        { status: 400 }
      )
    }

    // Extract skills
    const skills = await extractSkills(document.parsedContent)

    // Update document with skills
    await prisma.document.update({
      where: { id: documentId },
      data: { skills },
    })

    return NextResponse.json({ success: true, data: { skills } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Skills extraction error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to extract skills' } },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add skills extraction API route"
```

---

## Task 20: Cover Letter Generation API

**Files:**
- Create: `app/api/generate/route.ts`

**Step 1: Create generation endpoint**

Create `app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getJob } from '@/lib/arbetsformedlingen'
import { generateCoverLetter } from '@/lib/gemini'
import { z } from 'zod'

const requestSchema = z.object({
  afJobId: z.string(),
  documentId: z.string(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { afJobId, documentId } = requestSchema.parse(body)

    // Get job from AF API
    const job = await getJob(afJobId)
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      )
    }

    // Get user's CV document
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
        type: 'cv',
      },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'CV not found' } },
        { status: 404 }
      )
    }

    // Generate cover letter
    const content = await generateCoverLetter({
      jobTitle: job.title,
      company: job.company,
      jobDescription: job.description,
      cvContent: document.parsedContent || '',
      skills: (document.skills as string[]) || [],
    })

    // Check if job is saved
    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
    })

    // Save generated letter
    const letter = await prisma.generatedLetter.create({
      data: {
        userId: user.id,
        savedJobId: savedJob?.id,
        afJobId,
        content,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: letter.id,
        content: letter.content,
        createdAt: letter.createdAt,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Letter generation error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate letter' } },
      { status: 500 }
    )
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add cover letter generation API route"
```

---

## Task 21: Save Jobs API

**Files:**
- Create: `app/api/jobs/save/route.ts`
- Create: `app/api/jobs/save/[id]/route.ts`

**Step 1: Create save job endpoint**

Create `app/api/jobs/save/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const requestSchema = z.object({
  afJobId: z.string(),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { afJobId, notes } = requestSchema.parse(body)

    const savedJob = await prisma.savedJob.upsert({
      where: {
        userId_afJobId: {
          userId: user.id,
          afJobId,
        },
      },
      update: { notes },
      create: {
        userId: user.id,
        afJobId,
        notes,
      },
    })

    return NextResponse.json({ success: true, data: savedJob })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: error.errors[0].message } },
        { status: 400 }
      )
    }
    console.error('Save job error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save job' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: savedJobs })
}
```

**Step 2: Create delete saved job endpoint**

Create `app/api/jobs/save/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    await prisma.savedJob.delete({
      where: {
        id,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Saved job not found' } },
      { status: 404 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add save/unsave jobs API routes"
```

---

## Task 22: Letters API

**Files:**
- Create: `app/api/letters/route.ts`
- Create: `app/api/letters/[id]/route.ts`

**Step 1: Create letters list endpoint**

Create `app/api/letters/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const letters = await prisma.generatedLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      savedJob: true,
    },
  })

  return NextResponse.json({ success: true, data: letters })
}
```

**Step 2: Create delete letter endpoint**

Create `app/api/letters/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  const letter = await prisma.generatedLetter.findFirst({
    where: {
      id,
      userId: user.id,
    },
  })

  if (!letter) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: letter })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    await prisma.generatedLetter.delete({
      where: {
        id,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Letter not found' } },
      { status: 404 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add letters list and delete API routes"
```

---

## Task 23: Letters Page

**Files:**
- Create: `app/letters/page.tsx`
- Create: `components/letters/LetterCard.tsx`

**Step 1: Create LetterCard component**

Create `components/letters/LetterCard.tsx`:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Briefcase, Copy, Trash2 } from 'lucide-react'

interface LetterCardProps {
  letter: {
    id: string
    afJobId: string
    content: string
    createdAt: Date
  }
  jobTitle?: string
  onDelete?: (id: string) => void
}

export function LetterCard({ letter, jobTitle, onDelete }: LetterCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(letter.content)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {jobTitle || `Job ${letter.afJobId}`}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(letter.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date(letter.createdAt).toLocaleDateString()}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap line-clamp-6">
          {letter.content}
        </p>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Create letters page**

Create `app/letters/page.tsx`:
```typescript
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { LetterCard } from '@/components/letters/LetterCard'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function LettersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const letters = await prisma.generatedLetter.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Generated Letters</h1>

        {letters.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No letters generated yet. Search for jobs and generate cover letters.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {letters.map((letter) => (
              <LetterCard key={letter.id} letter={letter} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add letters page with LetterCard component"
```

---

## Task 24: File Upload (Placeholder)

**Files:**
- Create: `app/api/upload/route.ts`
- Create: `components/upload/FileUpload.tsx`

**Step 1: Create upload API route (basic version)**

Create `app/api/upload/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } },
        { status: 400 }
      )
    }

    if (!type || !['cv', 'cover_letter_template'].includes(type)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid document type' } },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File must be PDF, DOCX, or TXT' } },
        { status: 400 }
      )
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'File must be less than 5MB' } },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' } },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName)

    // For now, we'll skip text parsing - this would need pdf-parse or similar
    // In production, you'd parse the file content here
    const parsedContent = '[File parsing not implemented yet]'

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: user.id,
        type,
        fileUrl: publicUrl,
        parsedContent,
      },
    })

    return NextResponse.json({ success: true, data: document })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process upload' } },
      { status: 500 }
    )
  }
}
```

**Step 2: Create FileUpload component**

Create `components/upload/FileUpload.tsx`:
```typescript
'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, Loader2 } from 'lucide-react'

interface FileUploadProps {
  onUploadComplete?: (document: { id: string; fileUrl: string }) => void
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'cv')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error.message)
        return
      }

      setFile(null)
      onUploadComplete?.(result.data)
    } catch {
      setError('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        {!file ? (
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">
              Click to upload CV (PDF, DOCX, or TXT)
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <File className="h-5 w-5" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload CV'
              )}
            </Button>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add file upload API route and component"
```

---

## Task 25: Documents API

**Files:**
- Create: `app/api/documents/route.ts`
- Create: `app/api/documents/[id]/route.ts`

**Step 1: Create documents list endpoint**

Create `app/api/documents/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: documents })
}
```

**Step 2: Create delete document endpoint**

Create `app/api/documents/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    // Get document to find file URL
    const document = await prisma.document.findFirst({
      where: { id, userId: user.id },
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
        { status: 404 }
      )
    }

    // Delete from storage
    const fileName = document.fileUrl.split('/').pop()
    if (fileName) {
      await supabase.storage.from('documents').remove([`${user.id}/${fileName}`])
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add documents list and delete API routes"
```

---

## Task 26: Update Dashboard with Components

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Update dashboard with file upload and documents**

Update `app/dashboard/page.tsx`:
```typescript
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { FileUpload } from '@/components/upload/FileUpload'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { File, Briefcase } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email!)

  // Get user's documents
  const documents = await prisma.document.findMany({
    where: { userId: user.id, type: 'cv' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })

  // Get user's saved jobs count
  const savedJobsCount = await prisma.savedJob.count({
    where: { userId: user.id },
  })

  // Get user's letters count
  const lettersCount = await prisma.generatedLetter.count({
    where: { userId: user.id },
  })

  const latestCV = documents[0]

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Welcome, {user.name || user.email}</h1>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* CV Section */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="h-5 w-5" />
                  Your CV
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestCV ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Uploaded: {new Date(latestCV.createdAt).toLocaleDateString()}
                    </p>
                    {latestCV.skills && (
                      <div>
                        <p className="text-sm font-medium mb-2">Extracted Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {(latestCV.skills as string[]).slice(0, 5).map((skill, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                          {(latestCV.skills as string[]).length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{(latestCV.skills as string[]).length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <FileUpload />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick Stats */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Saved Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{savedJobsCount}</p>
                <p className="text-sm text-muted-foreground mt-1">jobs saved</p>
                <Link href="/jobs">
                  <Button variant="outline" className="mt-4 w-full">
                    Search Jobs
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Generated Letters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{lettersCount}</p>
                <p className="text-sm text-muted-foreground mt-1">cover letters</p>
                <Link href="/letters">
                  <Button variant="outline" className="mt-4 w-full">
                    View Letters
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: update dashboard with CV upload and stats"
```

---

## Testing Strategy

### Unit Tests (Vitest)
- Run with `npm run test` for all tests
- Run specific tests with `npm run test -- <pattern>`
- Tests mock external services (Supabase, Gemini, AF API)
- Follow TDD: write failing test → implement → verify pass

### Browser Testing (Claude Code + Chrome Extension)
**REQUIRED:** All manual UI testing MUST be performed using Claude Code's Chrome extension integration.

**Prerequisites:**
1. Claude in Chrome extension must be installed
2. Run `/chrome` in Claude Code to verify connection
3. Chrome window must be visible and in focus

**Capabilities:**
- Navigate to URLs and take screenshots
- Click buttons, fill forms, interact with elements
- Read page content and verify UI state
- Check browser console for JavaScript errors
- Validate that components render correctly

**When to use browser testing:**
- After completing a UI component or page
- To verify end-to-end user flows
- To check for console errors or visual regressions
- Final verification before committing UI changes

---

## Task 27: Run All Tests

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 2: Fix any failing tests**

If tests fail, review and fix the issues.

**Step 3: Commit if fixes were needed**

```bash
git add .
git commit -m "fix: resolve test failures"
```

---

## Task 28: Browser Testing with Chrome Extension

> **REQUIRED:** Use Claude Code's Chrome extension (`/chrome`) for all manual UI verification.

**Step 1: Verify Chrome extension connection**

Run in Claude Code: `/chrome`
Expected: Connection confirmed, tab context available

**Step 2: Test landing page**

```
Action: Navigate to http://localhost:3000
Expected: Landing page loads with "JobMatch" header and "Sign In" button
Verify: Take screenshot, confirm hero text "Find Your Perfect Job in Sweden" is visible
Check: No console errors (read_console_messages)
```

**Step 3: Test authentication flow**

```
Action: Click "Sign In" button
Expected: Redirects to /auth/signin
Verify: Email input field and "Sign in with magic link" button visible

Action: Enter test email in input field
Action: Click submit button
Expected: Success message "Check your email" appears
```

**Step 4: Test protected route redirect**

```
Action: Navigate to http://localhost:3000/dashboard (while logged out)
Expected: Redirects to /auth/signin
Verify: Sign in form is displayed
```

**Step 5: Test job search page (requires auth)**

```
Action: Navigate to http://localhost:3000/jobs (after auth)
Expected: Jobs page loads with search input
Verify: "Search Jobs" heading visible

Action: Type "developer" in search input
Action: Click "Search" button
Expected: Job results appear from Arbetsförmedlingen
Verify: JobCard components render with title, company, location
Check: No console errors
```

**Step 6: Test job detail page**

```
Action: Click on any job card from search results
Expected: Job detail page loads
Verify: Job title, company, location, description visible
Verify: "Save Job" and "Generate Cover Letter" buttons present
```

**Step 7: Test dashboard**

```
Action: Navigate to http://localhost:3000/dashboard
Expected: Dashboard loads with user greeting
Verify: CV upload section visible
Verify: Saved jobs count card visible
Verify: Generated letters count card visible
Check: No console errors
```

**Step 8: Test letters page**

```
Action: Navigate to http://localhost:3000/letters
Expected: Letters page loads
Verify: "Generated Letters" heading visible
Verify: Empty state message if no letters, or LetterCard components if letters exist
```

**Step 9: Check for console errors across all pages**

```
Action: Use read_console_messages tool on each page
Expected: No JavaScript errors
Note: Warnings are acceptable, errors are not
```

**Step 10: Commit final state**

```bash
git add .
git commit -m "chore: complete MVP implementation with browser testing verification"
```

---

## Summary

This plan covers:

1. **Tasks 1-4**: Project setup (Next.js, deps, Vitest, Prisma)
2. **Tasks 5-10**: Authentication (Supabase, middleware, sign-in, dashboard)
3. **Task 11**: Landing page
4. **Tasks 12-17**: Jobs (AF client, API routes, components, pages)
5. **Tasks 18-20**: AI (Gemini client, skills extraction, letter generation)
6. **Tasks 21-23**: Save jobs and letters (API routes, pages)
7. **Tasks 24-26**: File upload and documents
8. **Tasks 27-28**: Testing and verification

Each task has explicit steps with TDD (test first), exact file paths, code, and commit points.
