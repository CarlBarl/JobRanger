# Document View & Edit Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace "Open in New Tab" behavior to navigate to `/documents/[id]` page with split-pane editor and preview.

**Architecture:** Server component fetches document with auth check, passes to client component. Client has split-pane layout (editor left, preview right). PATCH endpoint updates both DB and Supabase Storage file.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, shadcn/ui, Prisma, Supabase Storage, next-intl

---

## Task 1: Add Translation Strings

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/sv.json`

**Step 1: Add English translations**

In `messages/en.json`, add to the `dashboard` section after `"noContent": "No content available"`:

```json
"edit": "Edit",
"preview": "Preview",
"saveChanges": "Save",
"saving": "Saving...",
"uploadNewFile": "Upload New",
"unsavedChanges": "You have unsaved changes",
"backToDashboard": "Back to Dashboard",
"lastUpdated": "Last updated",
"changesSaved": "Changes saved"
```

**Step 2: Add Swedish translations**

In `messages/sv.json`, add matching translations after `"noContent": "Inget innehåll tillgängligt"`:

```json
"edit": "Redigera",
"preview": "Förhandsgranska",
"saveChanges": "Spara",
"saving": "Sparar...",
"uploadNewFile": "Ladda upp ny",
"unsavedChanges": "Du har osparade ändringar",
"backToDashboard": "Tillbaka till Dashboard",
"lastUpdated": "Senast uppdaterad",
"changesSaved": "Ändringar sparade"
```

**Step 3: Commit**

```bash
git add messages/en.json messages/sv.json
git commit -m "feat: add document editor translation strings"
```

---

## Task 2: Add PATCH Endpoint for Document Updates

**Files:**
- Modify: `app/api/documents/[id]/route.ts`
- Modify: `app/api/documents/[id]/route.test.ts`

**Step 1: Write the failing tests**

Add to `app/api/documents/[id]/route.test.ts` after the existing `DELETE` describe block. First add `update` to the mocks and import `PATCH`:

Update the mocks at the top (around line 4-9):
```typescript
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  storageUpdate: vi.fn(),
}))
```

Update the mock for supabase storage (around line 11-22):
```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
    storage: {
      from: () => ({
        remove: mocks.remove,
        update: mocks.storageUpdate,
      }),
    },
  }),
}))
```

Update the prisma mock (around line 24-31):
```typescript
vi.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: mocks.findFirst,
      delete: mocks.delete,
      update: mocks.update,
    },
  },
}))
```

Update the import (around line 33):
```typescript
import { DELETE, PATCH } from './route'
```

Add new describe block at end of file:
```typescript
describe('PATCH /api/documents/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: { id: 'd1' } })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    })
  })

  it('returns 404 when document not found', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: { id: 'd1' } })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND' },
    })
  })

  it('returns 400 when parsedContent is not a string', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 123 }),
    })
    const res = await PATCH(req, { params: { id: 'd1' } })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BAD_REQUEST' },
    })
  })

  it('updates parsedContent for owned document', async () => {
    const mockDoc = {
      id: 'd1',
      userId: 'u1',
      parsedContent: 'old content',
      fileUrl: 'https://example.supabase.co/storage/v1/object/public/documents/u1/1-cv.txt',
    }
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mocks.findFirst.mockResolvedValue(mockDoc)
    mocks.storageUpdate.mockResolvedValue({ data: {}, error: null })
    mocks.update.mockResolvedValue({ ...mockDoc, parsedContent: 'new content' })

    const req = new NextRequest('http://localhost/api/documents/d1', {
      method: 'PATCH',
      body: JSON.stringify({ parsedContent: 'new content' }),
    })
    const res = await PATCH(req, { params: { id: 'd1' } })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.parsedContent).toBe('new content')
    expect(mocks.storageUpdate).toHaveBeenCalledWith(
      'u1/1-cv.txt',
      expect.any(Buffer),
      { contentType: 'text/plain', upsert: true }
    )
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { parsedContent: 'new content' },
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- route.test.ts -t "PATCH"
```

Expected: FAIL - PATCH is not defined

**Step 3: Implement PATCH handler**

Add to `app/api/documents/[id]/route.ts` after the existing `DELETE` function:

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    )
  }

  const id = params.id
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Missing document id' } },
      { status: 400 }
    )
  }

  const body = await request.json()
  const { parsedContent } = body

  if (typeof parsedContent !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'parsedContent must be a string' } },
      { status: 400 }
    )
  }

  const document = await prisma.document.findFirst({
    where: { id, userId: user.id },
  })

  if (!document) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      { status: 404 }
    )
  }

  // Update file in Supabase Storage if fileUrl exists
  if (document.fileUrl) {
    const storagePath = parseStoragePathFromPublicUrl(document.fileUrl)
    if (storagePath) {
      await supabase.storage
        .from('documents')
        .update(storagePath, Buffer.from(parsedContent), {
          contentType: 'text/plain',
          upsert: true,
        })
    }
  }

  // Update database
  const updated = await prisma.document.update({
    where: { id },
    data: { parsedContent },
  })

  return NextResponse.json({ success: true, data: updated })
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test -- route.test.ts -t "PATCH"
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/api/documents/[id]/route.ts app/api/documents/[id]/route.test.ts
git commit -m "feat: add PATCH endpoint for document content updates"
```

---

## Task 3: Create DocumentEditor Client Component

**Files:**
- Create: `components/documents/DocumentEditor.tsx`
- Create: `components/documents/DocumentEditor.test.tsx`

**Step 1: Write the failing test**

Create `components/documents/DocumentEditor.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@/lib/test-utils'
import { DocumentEditor } from './DocumentEditor'

const mockPush = vi.fn()
const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockDocument = {
  id: 'doc-1',
  type: 'cv' as const,
  parsedContent: 'Test content',
  fileUrl: 'https://example.com/file.txt',
  createdAt: '2024-01-15',
}

describe('DocumentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders editor with document content', () => {
    render(<DocumentEditor document={mockDocument} />)

    expect(screen.getByRole('textbox')).toHaveValue('Test content')
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
  })

  it('enables save button when content changes', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    const saveButton = screen.getByRole('button', { name: /save/i })

    expect(saveButton).toBeDisabled()

    await user.clear(textarea)
    await user.type(textarea, 'New content')

    expect(saveButton).not.toBeDisabled()
  })

  it('updates preview when content changes', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Updated preview text')

    expect(screen.getByText('Updated preview text')).toBeInTheDocument()
  })

  it('calls API and refreshes on save', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)

    render(<DocumentEditor document={mockDocument} />)

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'New content')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedContent: 'New content' }),
      })
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('shows unsaved changes indicator when dirty', async () => {
    const user = userEvent.setup()
    render(<DocumentEditor document={mockDocument} />)

    expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument()

    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'Changed')

    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test -- DocumentEditor.test.tsx
```

Expected: FAIL - Cannot find module './DocumentEditor'

**Step 3: Create the documents directory**

```bash
mkdir -p components/documents
```

**Step 4: Implement DocumentEditor component**

Create `components/documents/DocumentEditor.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Upload, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface DocumentEditorProps {
  document: {
    id: string
    type: 'cv' | 'personal_letter'
    parsedContent: string | null
    fileUrl: string | null
    createdAt: string
  }
}

export function DocumentEditor({ document }: DocumentEditorProps) {
  const t = useTranslations('dashboard')
  const router = useRouter()
  const [content, setContent] = useState(document.parsedContent || '')
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = content !== (document.parsedContent || '')

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedContent: content }),
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const typeLabel = document.type === 'cv' ? t('yourCV') : t('yourPersonalLetter')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToDashboard')}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {t('uploadNewFile')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>
      </header>

      {/* Document info bar */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-2 flex items-center gap-4 text-sm">
          <span className="font-medium">{typeLabel}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {t('lastUpdated')}: {document.createdAt}
          </span>
          {isDirty && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-orange-600 dark:text-orange-400">
                {t('unsavedChanges')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Split pane editor */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Editor pane */}
          <div className="flex flex-col">
            <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              {t('edit')}
            </h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-sm bg-muted rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('noContent')}
            />
          </div>

          {/* Preview pane */}
          <div className="flex flex-col">
            <h2 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wide">
              {t('preview')}
            </h2>
            <div className="flex-1 p-4 bg-card rounded-lg border overflow-auto">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {content || t('noContent')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test -- DocumentEditor.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add components/documents/DocumentEditor.tsx components/documents/DocumentEditor.test.tsx
git commit -m "feat: create DocumentEditor component with split-pane layout"
```

---

## Task 4: Create Document Page Route

**Files:**
- Create: `app/documents/[id]/page.tsx`

**Step 1: Create the directory structure**

```bash
mkdir -p app/documents/[id]
```

**Step 2: Create the page**

Create `app/documents/[id]/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DocumentEditor } from '@/components/documents/DocumentEditor'

interface DocumentPageProps {
  params: { id: string }
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
  })

  if (!document) {
    redirect('/dashboard')
  }

  const serializedDocument = {
    id: document.id,
    type: document.type as 'cv' | 'personal_letter',
    parsedContent: document.parsedContent,
    fileUrl: document.fileUrl,
    createdAt: document.createdAt.toISOString().slice(0, 10),
  }

  return <DocumentEditor document={serializedDocument} />
}
```

**Step 3: Test manually**

```bash
npm run dev
```

Navigate to `/documents/<some-document-id>` - should show the editor page.

**Step 4: Commit**

```bash
git add app/documents/[id]/page.tsx
git commit -m "feat: add document view/edit page route"
```

---

## Task 5: Update Dashboard Links

**Files:**
- Modify: `components/dashboard/DashboardClient.tsx`
- Modify: `components/dashboard/DocumentPreviewDialog.tsx`

**Step 1: Update DashboardClient**

In `components/dashboard/DashboardClient.tsx`:

Add import at top (after existing imports):
```typescript
import Link from 'next/link'
```

Replace the CV button section (lines 99-109) with:
```typescript
{cvDocument.fileUrl && (
  <Button
    variant="outline"
    size="sm"
    className="gap-2"
    asChild
    onClick={(e) => e.stopPropagation()}
  >
    <Link href={`/documents/${cvDocument.id}`}>
      <ExternalLink className="h-4 w-4" />
      {t('openInNewTab')}
    </Link>
  </Button>
)}
```

Replace the Personal Letter button section (lines 149-159) with:
```typescript
{personalLetter.fileUrl && (
  <Button
    variant="outline"
    size="sm"
    className="gap-2"
    asChild
    onClick={(e) => e.stopPropagation()}
  >
    <Link href={`/documents/${personalLetter.id}`}>
      <ExternalLink className="h-4 w-4" />
      {t('openInNewTab')}
    </Link>
  </Button>
)}
```

Remove the `handleOpenInNewTab` function (lines 35-40).

Update the dialog props to include documentId (around lines 171-179):
```typescript
{cvDocument && (
  <DocumentPreviewDialog
    open={cvDialogOpen}
    onOpenChange={setCvDialogOpen}
    title={t('yourCV')}
    content={cvDocument.parsedContent}
    fileUrl={cvDocument.fileUrl}
    documentId={cvDocument.id}
    type="cv"
  />
)}
```

And for personal letter dialog (around lines 183-191):
```typescript
{personalLetter && (
  <DocumentPreviewDialog
    open={letterDialogOpen}
    onOpenChange={setLetterDialogOpen}
    title={t('yourPersonalLetter')}
    content={personalLetter.parsedContent}
    fileUrl={personalLetter.fileUrl}
    documentId={personalLetter.id}
    type="personal_letter"
  />
)}
```

**Step 2: Update DocumentPreviewDialog**

In `components/dashboard/DocumentPreviewDialog.tsx`:

Add import at top:
```typescript
import Link from 'next/link'
```

Update the interface to add documentId (around lines 13-20):
```typescript
interface DocumentPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string | null
  fileUrl: string | null
  documentId: string
  type: 'cv' | 'personal_letter'
}
```

Update the component to receive documentId (around line 22-28):
```typescript
export function DocumentPreviewDialog({
  open,
  onOpenChange,
  title,
  content,
  fileUrl,
  documentId,
}: DocumentPreviewDialogProps) {
```

Replace the button section (lines 49-58) with:
```typescript
{fileUrl && (
  <Button variant="outline" size="sm" asChild className="gap-2">
    <Link href={`/documents/${documentId}`}>
      <ExternalLink className="h-4 w-4" />
      {t('openInNewTab')}
    </Link>
  </Button>
)}
```

Remove the `handleOpenInNewTab` function (lines 31-35).

**Step 3: Run tests**

```bash
npm run test
```

Expected: Some tests may fail (the ones testing window.open behavior)

**Step 4: Commit**

```bash
git add components/dashboard/DashboardClient.tsx components/dashboard/DocumentPreviewDialog.tsx
git commit -m "feat: update Open in New Tab to link to document editor page"
```

---

## Task 6: Update Tests for Link Changes

**Files:**
- Modify: `components/dashboard/DashboardClient.test.tsx`

**Step 1: Update the test file**

Replace the entire test file `components/dashboard/DashboardClient.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, within } from '@/lib/test-utils'
import { DashboardClient } from './DashboardClient'

describe('DashboardClient', () => {
  const cvDocument = {
    id: 'cv-1',
    createdAt: '2025-01-01',
    parsedContent: 'CV content',
    fileUrl: 'https://example.com/cv.pdf',
    skills: null,
  }

  const personalLetter = {
    id: 'pl-1',
    createdAt: '2025-01-02',
    parsedContent: 'Personal letter content',
    fileUrl: 'https://example.com/letter.pdf',
    skills: null,
  }

  it('opens the CV preview when pressing the CV card', async () => {
    const user = userEvent.setup()
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /view document: your cv/i })
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/your cv/i)).toBeInTheDocument()
  })

  it('opens the personal letter preview when pressing the personal letter card', async () => {
    const user = userEvent.setup()
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: /view document: your personal letter/i,
      })
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/your personal letter/i)).toBeInTheDocument()
  })

  it('renders links to document editor pages', () => {
    render(
      <DashboardClient
        cvDocument={cvDocument}
        personalLetter={personalLetter}
        cvUploadComponent={<div />}
        personalLetterUploadComponent={<div />}
      />
    )

    const links = screen.getAllByRole('link', { name: /open in new tab/i })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/documents/cv-1')
    expect(links[1]).toHaveAttribute('href', '/documents/pl-1')
  })
})
```

**Step 2: Run tests to verify they pass**

```bash
npm run test -- DashboardClient.test.tsx
```

Expected: PASS

**Step 3: Commit**

```bash
git add components/dashboard/DashboardClient.test.tsx
git commit -m "test: update dashboard tests for document editor links"
```

---

## Verification

After completing all tasks:

1. **Run `npm run dev`** and go to dashboard
2. Click "Open in new tab" on CV card → navigates to `/documents/[id]`
3. Verify split-pane layout: editor (left), preview (right)
4. Edit text in editor → preview updates in real-time
5. Click Save → content persists (refresh page to verify)
6. Go back to dashboard → document still shows
7. Test on mobile viewport → layout stacks vertically
8. **Run `npm run test`** → all tests pass
9. **Run `npm run lint`** → no lint errors
