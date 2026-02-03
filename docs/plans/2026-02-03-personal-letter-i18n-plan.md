# Personal Letter + i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Personal Letter upload support, integrate it into AI cover letter generation, implement Swedish/English i18n, and create seed data for debug user.

**Architecture:** Extend existing Document model with `personal_letter` type (rename from `cover_letter_template`). Use next-intl for i18n with Swedish as default. Personal Letter content becomes additional context for Gemini AI generation. Prisma seed script creates debug user with mock documents.

**Tech Stack:** Next.js 14 App Router, next-intl, Prisma, Supabase, Gemini AI, Vitest

---

## Task 1: Install next-intl for Internationalization

**Files:**
- Modify: `package.json`

**Step 1: Install next-intl**

Run:
```bash
npm install next-intl
```

**Step 2: Verify installation**

Run: `npm list next-intl`
Expected: `next-intl@3.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-intl for i18n support"
```

---

## Task 2: Create Translation Files

**Files:**
- Create: `messages/sv.json`
- Create: `messages/en.json`

**Step 1: Create Swedish translations**

Create `messages/sv.json`:
```json
{
  "common": {
    "appName": "JobMatch",
    "signIn": "Logga in",
    "signOut": "Logga ut",
    "save": "Spara",
    "cancel": "Avbryt",
    "delete": "Ta bort",
    "upload": "Ladda upp",
    "loading": "Laddar...",
    "error": "Ett fel uppstod",
    "success": "Klart!"
  },
  "landing": {
    "hero": "Hitta Ditt Drömjobb i Sverige",
    "subtitle": "Ladda upp ditt CV och personliga brev, hitta matchande jobb från Arbetsförmedlingen och generera anpassade personliga brev med AI.",
    "getStarted": "Kom igång",
    "features": {
      "upload": {
        "title": "Ladda upp dokument",
        "description": "Vi extraherar dina kompetenser automatiskt med AI"
      },
      "search": {
        "title": "Sök jobb",
        "description": "Hitta relevanta jobb från Arbetsförmedlingen"
      },
      "generate": {
        "title": "Generera brev",
        "description": "AI skapar anpassade personliga brev för varje jobb"
      }
    }
  },
  "auth": {
    "signInTitle": "Logga in på JobMatch",
    "signInDescription": "Ange din e-post för att få en magisk länk",
    "email": "E-post",
    "emailPlaceholder": "du@exempel.se",
    "sendMagicLink": "Skicka magisk länk",
    "sending": "Skickar...",
    "checkEmail": "Kolla din e-post",
    "checkEmailDescription": "Vi skickade en magisk länk till {email}. Klicka på länken för att logga in.",
    "invalidEmail": "Ange en giltig e-postadress"
  },
  "dashboard": {
    "welcome": "Välkommen, {name}",
    "yourCV": "Ditt CV",
    "yourPersonalLetter": "Ditt Personliga Brev",
    "savedJobs": "Sparade Jobb",
    "generatedLetters": "Genererade Brev",
    "uploadCV": "Ladda upp CV",
    "uploadPersonalLetter": "Ladda upp Personligt Brev",
    "noCV": "Inget CV uppladdat än",
    "noPersonalLetter": "Inget personligt brev uppladdat än",
    "uploaded": "Uppladdat",
    "extractedSkills": "Extraherade kompetenser",
    "moreSkills": "+{count} till",
    "searchJobs": "Sök Jobb",
    "viewLetters": "Visa Brev",
    "jobsSaved": "jobb sparade",
    "lettersGenerated": "brev genererade"
  },
  "jobs": {
    "title": "Sök Jobb",
    "searchPlaceholder": "Sök jobb (t.ex. utvecklare, sjuksköterska, lärare)",
    "search": "Sök",
    "found": "Hittade {count} jobb",
    "noResults": "Inga jobb hittades. Prova ett annat sökord.",
    "enterSearch": "Ange ett sökord för att hitta jobb från Arbetsförmedlingen",
    "backToSearch": "Tillbaka till sökning",
    "saveJob": "Spara Jobb",
    "unsaveJob": "Ta bort från sparade",
    "generateLetter": "Generera Personligt Brev",
    "generating": "Genererar...",
    "publishedAt": "Publicerad"
  },
  "letters": {
    "title": "Genererade Brev",
    "empty": "Inga brev genererade än. Sök jobb och generera personliga brev.",
    "aiAdapted": "Personligt Brev AI-anpassat för detta jobb",
    "copy": "Kopiera",
    "copied": "Kopierat!",
    "useOriginal": "Använd mitt originalbrrev",
    "useAI": "Använd AI-anpassat brev",
    "createdAt": "Skapad"
  },
  "upload": {
    "dropCV": "Klicka för att ladda upp CV (PDF, DOCX eller TXT)",
    "dropPersonalLetter": "Klicka för att ladda upp Personligt Brev (PDF, DOCX eller TXT)",
    "uploading": "Laddar upp...",
    "uploadCV": "Ladda upp CV",
    "uploadPersonalLetter": "Ladda upp Personligt Brev",
    "maxSize": "Max 5MB",
    "invalidType": "Filen måste vara PDF, DOCX eller TXT",
    "tooLarge": "Filen måste vara mindre än 5MB"
  }
}
```

**Step 2: Create English translations**

Create `messages/en.json`:
```json
{
  "common": {
    "appName": "JobMatch",
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "upload": "Upload",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Done!"
  },
  "landing": {
    "hero": "Find Your Dream Job in Sweden",
    "subtitle": "Upload your CV and personal letter, discover matching jobs from Arbetsförmedlingen, and generate personalized cover letters with AI.",
    "getStarted": "Get Started",
    "features": {
      "upload": {
        "title": "Upload Documents",
        "description": "We extract your skills automatically using AI"
      },
      "search": {
        "title": "Search Jobs",
        "description": "Find relevant jobs from Arbetsförmedlingen"
      },
      "generate": {
        "title": "Generate Letters",
        "description": "AI creates personalized cover letters for each job"
      }
    }
  },
  "auth": {
    "signInTitle": "Sign in to JobMatch",
    "signInDescription": "Enter your email to receive a magic link",
    "email": "Email",
    "emailPlaceholder": "you@example.com",
    "sendMagicLink": "Send magic link",
    "sending": "Sending...",
    "checkEmail": "Check your email",
    "checkEmailDescription": "We sent a magic link to {email}. Click the link to sign in.",
    "invalidEmail": "Please enter a valid email address"
  },
  "dashboard": {
    "welcome": "Welcome, {name}",
    "yourCV": "Your CV",
    "yourPersonalLetter": "Your Personal Letter",
    "savedJobs": "Saved Jobs",
    "generatedLetters": "Generated Letters",
    "uploadCV": "Upload CV",
    "uploadPersonalLetter": "Upload Personal Letter",
    "noCV": "No CV uploaded yet",
    "noPersonalLetter": "No personal letter uploaded yet",
    "uploaded": "Uploaded",
    "extractedSkills": "Extracted skills",
    "moreSkills": "+{count} more",
    "searchJobs": "Search Jobs",
    "viewLetters": "View Letters",
    "jobsSaved": "jobs saved",
    "lettersGenerated": "letters generated"
  },
  "jobs": {
    "title": "Search Jobs",
    "searchPlaceholder": "Search jobs (e.g., developer, nurse, teacher)",
    "search": "Search",
    "found": "Found {count} jobs",
    "noResults": "No jobs found. Try a different search term.",
    "enterSearch": "Enter a search term to find jobs from Arbetsförmedlingen",
    "backToSearch": "Back to search",
    "saveJob": "Save Job",
    "unsaveJob": "Remove from saved",
    "generateLetter": "Generate Personal Letter",
    "generating": "Generating...",
    "publishedAt": "Published"
  },
  "letters": {
    "title": "Generated Letters",
    "empty": "No letters generated yet. Search for jobs and generate personal letters.",
    "aiAdapted": "Personal Letter AI-adapted for this job",
    "copy": "Copy",
    "copied": "Copied!",
    "useOriginal": "Use my original letter",
    "useAI": "Use AI-adapted letter",
    "createdAt": "Created"
  },
  "upload": {
    "dropCV": "Click to upload CV (PDF, DOCX, or TXT)",
    "dropPersonalLetter": "Click to upload Personal Letter (PDF, DOCX, or TXT)",
    "uploading": "Uploading...",
    "uploadCV": "Upload CV",
    "uploadPersonalLetter": "Upload Personal Letter",
    "maxSize": "Max 5MB",
    "invalidType": "File must be PDF, DOCX, or TXT",
    "tooLarge": "File must be less than 5MB"
  }
}
```

**Step 3: Commit**

```bash
git add messages/
git commit -m "feat: add Swedish and English translation files"
```

---

## Task 3: Configure next-intl

**Files:**
- Create: `i18n/config.ts`
- Create: `i18n/request.ts`
- Modify: `next.config.mjs`

**Step 1: Create i18n config**

Create `i18n/config.ts`:
```typescript
export const locales = ['sv', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'sv'
```

**Step 2: Create request config for next-intl**

Create `i18n/request.ts`:
```typescript
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, type Locale, locales } from './config'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value

  let locale: Locale = defaultLocale
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    locale = localeCookie as Locale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

**Step 3: Update next.config.mjs**

Read current file first, then modify `next.config.mjs`:
```javascript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withNextIntl(nextConfig)
```

**Step 4: Commit**

```bash
git add i18n/ next.config.mjs
git commit -m "feat: configure next-intl with cookie-based locale"
```

---

## Task 4: Create Language Switcher Component

**Files:**
- Create: `components/ui/language-switcher.tsx`
- Create: `app/api/locale/route.ts`

**Step 1: Create locale API route**

Create `app/api/locale/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { locales, type Locale } from '@/i18n/config'

export async function POST(request: NextRequest) {
  const { locale } = await request.json()

  if (!locales.includes(locale as Locale)) {
    return NextResponse.json(
      { success: false, error: { message: 'Invalid locale' } },
      { status: 400 }
    )
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  return response
}
```

**Step 2: Create language switcher component**

Create `components/ui/language-switcher.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  const toggleLocale = async () => {
    const newLocale = locale === 'sv' ? 'en' : 'sv'

    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    })

    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale}>
      <Globe className="h-4 w-4 mr-1" />
      {locale === 'sv' ? 'EN' : 'SV'}
    </Button>
  )
}
```

**Step 3: Commit**

```bash
git add components/ui/language-switcher.tsx app/api/locale/
git commit -m "feat: add language switcher component and locale API"
```

---

## Task 5: Update Root Layout with NextIntlClientProvider

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Read current layout**

Read `app/layout.tsx` to understand current structure.

**Step 2: Update layout with i18n provider**

Update `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'JobMatch',
  description: 'AI-powered job matching for Swedish job seekers',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add NextIntlClientProvider to root layout"
```

---

## Task 6: Update DashboardHeader with Language Switcher

**Files:**
- Modify: `components/dashboard/DashboardHeader.tsx`

**Step 1: Read current header**

Read `components/dashboard/DashboardHeader.tsx`.

**Step 2: Add language switcher to header**

Update `components/dashboard/DashboardHeader.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function DashboardHeader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('common')

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          {t('appName')}
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/jobs">
            <Button variant="ghost">Jobs</Button>
          </Link>
          <Link href="/letters">
            <Button variant="ghost">Letters</Button>
          </Link>
          <LanguageSwitcher />
          {user?.email && (
            <span className="text-sm text-muted-foreground">
              {user.email}
            </span>
          )}
        </nav>
      </div>
    </header>
  )
}
```

**Step 3: Commit**

```bash
git add components/dashboard/DashboardHeader.tsx
git commit -m "feat: add language switcher to dashboard header"
```

---

## Task 7: Update Prisma Schema - Rename DocumentType

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Update enum value**

In `prisma/schema.prisma`, change:
```prisma
enum DocumentType {
  cv
  personal_letter
}
```

**Step 2: Push schema change**

Run:
```bash
npx prisma db push
```

Expected: Schema updated successfully

**Step 3: Regenerate Prisma client**

Run:
```bash
npx prisma generate
```

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: rename cover_letter_template to personal_letter in DocumentType"
```

---

## Task 8: Create PersonalLetterUpload Component

**Files:**
- Create: `components/upload/PersonalLetterUpload.tsx`

**Step 1: Create the component**

Create `components/upload/PersonalLetterUpload.tsx`:
```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, X, Loader2 } from 'lucide-react'

interface PersonalLetterUploadProps {
  onUploadComplete?: (document: { id: string; fileUrl: string }) => void
}

export function PersonalLetterUpload({ onUploadComplete }: PersonalLetterUploadProps) {
  const t = useTranslations('upload')
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ]
      if (!allowedTypes.includes(selectedFile.type)) {
        setError(t('invalidType'))
        return
      }
      // Validate file size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError(t('tooLarge'))
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }, [t])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'personal_letter')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error?.message || t('error'))
        return
      }

      setFile(null)
      onUploadComplete?.(result.data)
      router.refresh()
    } catch {
      setError(t('error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        {!file ? (
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center px-2">
              {t('dropPersonalLetter')}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {t('maxSize')}
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
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </span>
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
                  {t('uploading')}
                </>
              ) : (
                t('uploadPersonalLetter')
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

**Step 2: Commit**

```bash
git add components/upload/PersonalLetterUpload.tsx
git commit -m "feat: add PersonalLetterUpload component with i18n"
```

---

## Task 9: Update Dashboard with Personal Letter Section

**Files:**
- Modify: `app/dashboard/page.tsx`

**Step 1: Read current dashboard**

Read `app/dashboard/page.tsx`.

**Step 2: Update dashboard with Personal Letter card**

Update `app/dashboard/page.tsx`:
```typescript
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { FileUpload } from '@/components/upload/FileUpload'
import { PersonalLetterUpload } from '@/components/upload/PersonalLetterUpload'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Briefcase, Mail } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const t = await getTranslations('dashboard')

  if (!authUser) {
    return null
  }

  const user = await getOrCreateUser(authUser.id, authUser.email!)

  // Get user's CV
  const cvDocument = await prisma.document.findFirst({
    where: { userId: user.id, type: 'cv' },
    orderBy: { createdAt: 'desc' },
  })

  // Get user's Personal Letter
  const personalLetter = await prisma.document.findFirst({
    where: { userId: user.id, type: 'personal_letter' },
    orderBy: { createdAt: 'desc' },
  })

  // Get counts
  const [savedJobsCount, lettersCount] = await Promise.all([
    prisma.savedJob.count({ where: { userId: user.id } }),
    prisma.generatedLetter.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {t('welcome', { name: user.name || user.email })}
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* CV Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('yourCV')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cvDocument ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('uploaded')}: {new Date(cvDocument.createdAt).toLocaleDateString()}
                  </p>
                  {cvDocument.skills && (
                    <div>
                      <p className="text-xs font-medium mb-1">{t('extractedSkills')}:</p>
                      <div className="flex flex-wrap gap-1">
                        {(cvDocument.skills as string[]).slice(0, 3).map((skill, i) => (
                          <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                        {(cvDocument.skills as string[]).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            {t('moreSkills', { count: (cvDocument.skills as string[]).length - 3 })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('noCV')}</p>
                  <FileUpload />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Letter Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('yourPersonalLetter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalLetter ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {t('uploaded')}: {new Date(personalLetter.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {personalLetter.parsedContent?.substring(0, 150)}...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('noPersonalLetter')}</p>
                  <PersonalLetterUpload />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Jobs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                {t('savedJobs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{savedJobsCount}</p>
              <p className="text-sm text-muted-foreground">{t('jobsSaved')}</p>
              <Link href="/jobs">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  {t('searchJobs')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Generated Letters */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('generatedLetters')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{lettersCount}</p>
              <p className="text-sm text-muted-foreground">{t('lettersGenerated')}</p>
              <Link href="/letters">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  {t('viewLetters')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add Personal Letter section to dashboard with i18n"
```

---

## Task 10: Update Gemini Service for Personal Letter Context

**Files:**
- Modify: `lib/services/gemini.ts`

**Step 1: Read current gemini service**

Read `lib/services/gemini.ts`.

**Step 2: Update generateCoverLetter to accept personalLetterContent**

Update `lib/services/gemini.ts` to add `personalLetterContent` parameter:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables')
  }
  return apiKey
}

function getModel() {
  const genAI = new GoogleGenerativeAI(getApiKey())
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

export interface GenerateCoverLetterInput {
  cvContent: string
  personalLetterContent?: string
  jobTitle: string
  jobDescription: string
  companyName?: string
}

export async function generateCoverLetter(
  input: GenerateCoverLetterInput
): Promise<string> {
  const model = getModel()

  const personalLetterSection = input.personalLetterContent
    ? `
The applicant's existing personal letter (use this as a style and content reference):
---
${input.personalLetterContent}
---
`
    : ''

  const prompt = `You are a professional career advisor helping Swedish job seekers write compelling personal letters (personligt brev).

Generate a personal letter in Swedish for this job application. The letter should:
- Be 250-400 words
- Match the tone and style of the applicant's existing personal letter if provided
- Highlight relevant skills and experiences from the CV
- Show enthusiasm for this specific role and company
- Be professional yet personable
- NOT include placeholder text like [Your Name] or [Date]

Job Title: ${input.jobTitle}
Company: ${input.companyName || 'the company'}
Job Description:
${input.jobDescription}

Applicant's CV content:
${input.cvContent}
${personalLetterSection}
Write the personal letter now:`

  const result = await model.generateContent(prompt)
  const response = result.response
  return response.text()
}

export async function extractSkillsFromCV(cvContent: string): Promise<string[]> {
  const model = getModel()

  const prompt = `Analyze this CV/resume and extract a list of professional skills.
Return ONLY a JSON array of skill strings, nothing else.
Focus on technical skills, tools, languages, certifications, and competencies.

CV Content:
${cvContent}

Return only the JSON array:`

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text().trim()

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const skills = JSON.parse(cleaned)
    if (!Array.isArray(skills)) {
      console.error('Skills extraction did not return an array:', skills)
      return []
    }
    return skills.filter((s): s is string => typeof s === 'string')
  } catch (error) {
    console.error('Failed to parse skills JSON:', text, error)
    return []
  }
}
```

**Step 3: Commit**

```bash
git add lib/services/gemini.ts
git commit -m "feat: add personalLetterContent support to cover letter generation"
```

---

## Task 11: Update Generate API Route

**Files:**
- Modify: `app/api/generate/route.ts`

**Step 1: Read current route**

Read `app/api/generate/route.ts`.

**Step 2: Update to fetch and use Personal Letter**

Update `app/api/generate/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { getJobById } from '@/lib/services/arbetsformedlingen'
import { generateCoverLetter } from '@/lib/services/gemini'

const RequestSchema = z.object({
  afJobId: z.string().min(1, 'Job ID is required'),
  documentId: z.string().min(1, 'CV document ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      )
    }

    const user = await getOrCreateUser(authUser.id, authUser.email!)
    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: parsed.error.errors[0].message } },
        { status: 400 }
      )
    }

    const { afJobId, documentId } = parsed.data

    // Fetch job details from AF API
    const job = await getJobById(afJobId)
    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 }
      )
    }

    // Find user's CV document
    const cvDocument = await prisma.document.findFirst({
      where: { id: documentId, userId: user.id, type: 'cv' },
    })

    if (!cvDocument) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'CV document not found' } },
        { status: 404 }
      )
    }

    // Find user's Personal Letter (optional)
    const personalLetter = await prisma.document.findFirst({
      where: { userId: user.id, type: 'personal_letter' },
      orderBy: { createdAt: 'desc' },
    })

    // Generate cover letter with AI
    const content = await generateCoverLetter({
      cvContent: cvDocument.parsedContent ?? '',
      personalLetterContent: personalLetter?.parsedContent ?? undefined,
      jobTitle: job.headline ?? '',
      jobDescription: job.description?.text ?? '',
      companyName: job.employer?.name ?? undefined,
    })

    // Save generated letter
    const generatedLetter = await prisma.generatedLetter.create({
      data: {
        userId: user.id,
        afJobId,
        content,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: generatedLetter.id,
        content: generatedLetter.content,
        createdAt: generatedLetter.createdAt,
      },
    })
  } catch (error) {
    console.error('Generate letter error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to generate letter' } },
      { status: 500 }
    )
  }
}
```

**Step 3: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: use Personal Letter as context in AI generation"
```

---

## Task 12: Create Seed Script for Debug User

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

**Step 1: Create seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient, DocumentType } from '@prisma/client'

const prisma = new PrismaClient()

const DEBUG_USER_EMAIL = 'carlelelid@gmail.com'
const DEBUG_USER_ID = 'debug-user-001'

const MOCK_CV_CONTENT = `
CARL ELELID
Mjukvaruutvecklare | Stockholm, Sverige
carl.elelid@gmail.com | +46 70 123 4567

PROFIL
Erfaren mjukvaruutvecklare med 5+ års erfarenhet av fullstack-utveckling.
Specialiserad på React, Node.js och molnteknologier. Passionerad för att
bygga användarvänliga applikationer och lösa komplexa tekniska problem.

ARBETSLIVSERFARENHET

Senior Utvecklare | Tech Solutions AB | 2021 - Nu
- Ledde utvecklingen av företagets huvudprodukt med React och TypeScript
- Implementerade CI/CD-pipelines som minskade deploymenttiden med 60%
- Mentorerade juniorutvecklare och ledde kodgranskningar

Fullstack Utvecklare | Digital Innovation AB | 2019 - 2021
- Utvecklade REST APIs med Node.js och Express
- Byggde responsiva webbapplikationer med React
- Arbetade i agila team med Scrum-metodologi

UTBILDNING

Civilingenjör Datateknik | KTH | 2015 - 2019
- Inriktning mot mjukvaruutveckling
- Examensarbete om maskininlärning för bildklassificering

TEKNISKA KOMPETENSER

Programmeringsspråk: JavaScript, TypeScript, Python, Java
Frontend: React, Next.js, Vue.js, HTML5, CSS3, Tailwind
Backend: Node.js, Express, PostgreSQL, MongoDB
Verktyg: Git, Docker, AWS, Azure, CI/CD
Metodik: Agile, Scrum, TDD

SPRÅK
Svenska: Modersmål
Engelska: Flytande
`

const MOCK_PERSONAL_LETTER_CONTENT = `
Hej,

Jag heter Carl Elelid och är en passionerad mjukvaruutvecklare med över fem års
erfarenhet av att bygga moderna webbapplikationer. Jag skriver till er för att
uttrycka mitt starka intresse för möjligheter inom ert företag.

Under min karriär har jag utvecklat en djup expertis inom fullstack-utveckling,
med särskilt fokus på React och Node.js. Jag trivs i miljöer där jag kan kombinera
teknisk problemlösning med kreativt tänkande för att skapa lösningar som verkligen
gör skillnad för användarna.

Det som driver mig mest i mitt arbete är möjligheten att lära mig nya teknologier
och arbeta med begåvade kollegor. Jag tror starkt på att dela kunskap och har
alltid uppskattat att mentorera yngre utvecklare i teamet.

På min nuvarande tjänst har jag haft förmånen att leda utvecklingen av kritiska
system och implementera processer som förbättrat både kodkvalitet och teamets
produktivitet. Jag är särskilt stolt över att ha infört automatiserade
testningsrutiner som dramatiskt minskat antalet buggar i produktion.

Utöver mina tekniska färdigheter värderar jag kommunikation och samarbete högt.
Jag har erfarenhet av att arbeta nära produktägare och designers för att
säkerställa att vi levererar produkter som möter både affärsmål och användarbehov.

Jag är övertygad om att min kombination av teknisk kompetens, ledarskapsförmåga
och genuina intresse för att skapa värde skulle vara en tillgång för ert team.

Jag ser fram emot möjligheten att diskutera hur jag kan bidra till er organisation.

Med vänliga hälsningar,
Carl Elelid
`

const MOCK_SKILLS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'PostgreSQL',
  'Docker',
  'AWS',
  'Git',
  'Agile/Scrum',
  'TDD',
  'CI/CD',
]

async function main() {
  console.log('🌱 Starting seed...')

  // Create or update debug user
  const user = await prisma.user.upsert({
    where: { email: DEBUG_USER_EMAIL },
    update: {},
    create: {
      id: DEBUG_USER_ID,
      email: DEBUG_USER_EMAIL,
      name: 'Carl Elelid',
    },
  })
  console.log(`✅ User created/updated: ${user.email}`)

  // Delete existing documents for clean seed
  await prisma.document.deleteMany({
    where: { userId: user.id },
  })

  // Create mock CV
  const cv = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.cv,
      fileUrl: 'https://example.com/mock-cv.pdf',
      parsedContent: MOCK_CV_CONTENT.trim(),
      skills: MOCK_SKILLS,
    },
  })
  console.log(`✅ CV created: ${cv.id}`)

  // Create mock Personal Letter
  const personalLetter = await prisma.document.create({
    data: {
      userId: user.id,
      type: DocumentType.personal_letter,
      fileUrl: 'https://example.com/mock-personal-letter.pdf',
      parsedContent: MOCK_PERSONAL_LETTER_CONTENT.trim(),
    },
  })
  console.log(`✅ Personal Letter created: ${personalLetter.id}`)

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Step 2: Add seed script to package.json**

Add to `package.json` under "prisma" key:
```json
{
  "prisma": {
    "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

**Step 3: Install ts-node if needed**

Run:
```bash
npm install -D ts-node
```

**Step 4: Run seed**

Run:
```bash
npx prisma db seed
```

Expected:
```
🌱 Starting seed...
✅ User created/updated: carlelelid@gmail.com
✅ CV created: [id]
✅ Personal Letter created: [id]
🎉 Seed completed successfully!
```

**Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "feat: add seed script with debug user, mock CV and Personal Letter"
```

---

## Task 13: Update Landing Page with i18n

**Files:**
- Modify: `app/page.tsx`

**Step 1: Read current landing page**

Read `app/page.tsx`.

**Step 2: Update with translations**

Update `app/page.tsx`:
```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations('landing')
  const common = await getTranslations('common')

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-xl font-bold">{common('appName')}</span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/auth/signin">
              <Button>{common('signIn')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold mb-6">
          {t('hero')}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
        <Link href="/auth/signin">
          <Button size="lg">{t('getStarted')}</Button>
        </Link>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.upload.title')}</h3>
            <p className="text-muted-foreground">{t('features.upload.description')}</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.search.title')}</h3>
            <p className="text-muted-foreground">{t('features.search.description')}</p>
          </div>
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold mb-2">{t('features.generate.title')}</h3>
            <p className="text-muted-foreground">{t('features.generate.description')}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add i18n to landing page"
```

---

## Task 14: Update Sign In Page with i18n

**Files:**
- Modify: `components/auth/SignInForm.tsx`

**Step 1: Read current SignInForm**

Read `components/auth/SignInForm.tsx`.

**Step 2: Update with translations**

Update `components/auth/SignInForm.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SignInForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('invalidEmail'))
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
          <CardTitle>{t('checkEmail')}</CardTitle>
          <CardDescription>
            {t('checkEmailDescription', { email })}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('signInTitle')}</CardTitle>
        <CardDescription>{t('signInDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('sending') : t('sendMagicLink')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 3: Commit**

```bash
git add components/auth/SignInForm.tsx
git commit -m "feat: add i18n to SignInForm"
```

---

## Task 15: Verify Full Implementation

**Step 1: Run dev server**

Run:
```bash
npm run dev
```

**Step 2: Test language switching**

1. Open http://localhost:3000
2. Click language switcher (should toggle SV/EN)
3. Verify text changes on landing page

**Step 3: Test debug user login**

1. Go to /auth/signin
2. Enter: carlelelid@gmail.com
3. Check Supabase for magic link (or use Supabase dashboard to get link)

**Step 4: Verify dashboard shows both documents**

1. After login, go to /dashboard
2. Verify CV card shows mock CV with skills
3. Verify Personal Letter card shows mock personal letter

**Step 5: Test AI generation**

1. Go to /jobs
2. Search for a job
3. Click on a job
4. Click "Generate Personal Letter"
5. Verify generated letter incorporates personal letter style

**Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete Personal Letter + i18n implementation"
```

---

## Summary

This plan implements:

1. **i18n with next-intl** (Tasks 1-6, 13-14)
   - Swedish/English translations
   - Cookie-based locale persistence
   - Language switcher component

2. **Personal Letter Feature** (Tasks 7-11)
   - Renamed DocumentType enum
   - PersonalLetterUpload component
   - Dashboard with both CV and Personal Letter
   - AI generation uses Personal Letter as context

3. **Debug User Seed Data** (Task 12)
   - User: carlelelid@gmail.com
   - Mock Swedish CV with skills
   - Mock Swedish Personal Letter

4. **Verification** (Task 15)
   - End-to-end testing checklist
