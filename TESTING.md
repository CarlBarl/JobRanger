# Testing Documentation

## Testing Philosophy

This project follows **Test-Driven Development (TDD)** strictly. Every feature must have tests written before implementation code.

### The TDD Cycle

```
    ┌─────────────────┐
    │   1. RED        │
    │   Write a test  │
    │   that fails    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   2. GREEN      │
    │   Write minimal │
    │   code to pass  │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │   3. REFACTOR   │
    │   Improve code  │
    │   keep tests    │
    │   green         │
    └────────┬────────┘
             │
             └──────────► Repeat
```

---

## Testing Stack

| Tool | Purpose | Documentation |
|------|---------|---------------|
| **Vitest** | Test runner | https://vitest.dev |
| **React Testing Library** | Component testing | https://testing-library.com/react |
| **MSW** | API mocking | https://mswjs.io |
| **Claude Code + Chrome** | Browser/E2E testing | See below |

---

## Vitest Configuration

### Setup File: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'vitest.config.ts',
        '**/*.d.ts',
        'prisma/',
      ],
    },
  },
})
```

### Setup File: `vitest.setup.ts`

```typescript
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock next/headers for server components
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
  }),
  headers: () => new Headers(),
}))
```

---

## Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test -- JobCard.test.tsx

# Run tests matching pattern
npm run test -- --grep "should upload"
```

---

## Writing Unit Tests

### Component Test Pattern

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JobCard } from '@/components/jobs/JobCard'

describe('JobCard', () => {
  const mockJob = {
    id: '123',
    title: 'Software Engineer',
    company: 'Tech AB',
    location: 'Stockholm',
    description: 'Build cool stuff',
  }

  it('should render job title and company', () => {
    render(<JobCard job={mockJob} />)
    
    expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    expect(screen.getByText('Tech AB')).toBeInTheDocument()
  })

  it('should call onSave when save button clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    
    render(<JobCard job={mockJob} onSave={onSave} />)
    
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(onSave).toHaveBeenCalledWith('123')
  })

  it('should show loading state during save', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => new Promise(r => setTimeout(r, 100)))
    
    render(<JobCard job={mockJob} onSave={onSave} />)
    
    await user.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
  })
})
```

### API Route Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/generate/route'
import { NextRequest } from 'next/server'

// Mock external services
vi.mock('@/lib/gemini', () => ({
  generateCoverLetter: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getDocument: vi.fn(),
}))

describe('POST /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 if jobId is missing', async () => {
    const request = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('MISSING_JOB_ID')
  })

  it('should return generated cover letter', async () => {
    const { generateCoverLetter } = await import('@/lib/gemini')
    const { getDocument } = await import('@/lib/supabase')
    
    vi.mocked(getDocument).mockResolvedValue({ content: 'CV content' })
    vi.mocked(generateCoverLetter).mockResolvedValue('Generated letter')

    const request = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ jobId: '123', userId: 'user-1' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.content).toBe('Generated letter')
  })
})
```

### Utility Function Test Pattern

```typescript
import { describe, it, expect } from 'vitest'
import { extractSkills, parseCV } from '@/lib/utils/cvParser'

describe('extractSkills', () => {
  it('should extract programming languages', () => {
    const text = 'I have experience with JavaScript, Python, and TypeScript'
    
    const skills = extractSkills(text)
    
    expect(skills).toContain('JavaScript')
    expect(skills).toContain('Python')
    expect(skills).toContain('TypeScript')
  })

  it('should handle empty input', () => {
    const skills = extractSkills('')
    
    expect(skills).toEqual([])
  })

  it('should deduplicate skills', () => {
    const text = 'JavaScript JavaScript JavaScript'
    
    const skills = extractSkills(text)
    
    expect(skills).toHaveLength(1)
  })
})
```

---

## Browser Testing with Claude Code + Chrome

### Overview

Claude Code integrates with the Chrome browser extension to enable automated UI testing without traditional E2E frameworks like Playwright or Cypress.

### Setup

1. **Install Claude in Chrome extension**
   - Go to Chrome Web Store
   - Search for "Claude in Chrome"
   - Click "Add to Chrome"
   - Sign in with your Claude credentials

2. **Verify connection in Claude Code**
   ```bash
   claude
   # Then run:
   /chrome
   ```
   
   You should see "Chrome extension connected" or similar.

3. **Enable by default (optional)**
   - Run `/chrome`
   - Select "Enabled by default"

### How It Works

Claude Code communicates with Chrome through the Native Messaging API:

```
┌─────────────┐       ┌─────────────────────┐       ┌─────────────┐
│ Claude Code │◄─────►│ Claude in Chrome    │◄─────►│   Chrome    │
│  (Terminal) │       │    (Extension)      │       │  (Browser)  │
└─────────────┘       └─────────────────────┘       └─────────────┘
```

### Capabilities

Claude can:
- ✅ Navigate to URLs
- ✅ Click elements
- ✅ Fill forms
- ✅ Read page content
- ✅ Check console logs
- ✅ Monitor network requests
- ✅ Take screenshots
- ✅ Record GIFs
- ✅ Manage multiple tabs

### Writing Browser Tests

Instead of writing test files, you interact with Claude in natural language.

**Example Test Session:**

```
You: Start the dev server and verify the homepage loads

Claude: I'll start the dev server and check the homepage.
[Runs npm run dev]
[Opens localhost:3000 in Chrome]
[Verifies the page loads]

The homepage loaded successfully. I can see:
- The main heading "JobMatch"
- The "Get Started" button
- No console errors

You: Try uploading a file and check if it appears in the preview

Claude: [Clicks the upload button]
[Selects a test PDF file]
[Waits for upload to complete]

The file uploaded successfully. The preview shows:
- Filename: "test-cv.pdf"
- File size: "245 KB"
- A "Remove" button appeared
```

### Best Practices

1. **Keep browser window visible**
   - Chrome must be in the foreground
   - No headless mode support

2. **Use fresh tabs**
   ```
   "Open a new tab and navigate to localhost:3000"
   ```

3. **Be specific about what to check**
   ```
   "Check if the console has any errors related to 'TypeError'"
   "Verify the button with text 'Submit' is disabled"
   ```

4. **Handle modals manually**
   - If an alert/confirm appears, dismiss it manually
   - Then tell Claude to continue

5. **Use for debugging**
   ```
   "The form submission isn't working. Check the console for errors 
    and the network tab for the API request"
   ```

### Common Test Scenarios

**Form Validation:**
```
"Go to localhost:3000/upload and try to submit the form without 
selecting a file. Verify the error message appears."
```

**API Integration:**
```
"Search for 'developer' jobs and verify at least 5 job cards appear. 
Check the network tab to confirm the API request was made to 
jobsearch.api.jobtechdev.se"
```

**Responsive Design:**
```
"Resize the browser to 375px width (mobile) and verify the navigation 
collapses into a hamburger menu"
```

**Error States:**
```
"Disconnect from the internet and try to search for jobs. Verify an 
appropriate error message is shown to the user"
```

### Limitations

- ❌ Not supported on Brave, Arc, or other Chromium browsers
- ❌ No WSL support
- ❌ Requires visible browser window
- ❌ Can't handle JavaScript alerts automatically
- ❌ No parallel test execution

---

## Test Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | - |
| Branches | 75% | - |
| Functions | 80% | - |
| Lines | 80% | - |

### Critical Paths (100% coverage required)

- File upload validation
- API error handling
- User authentication flows
- Data sanitization

---

## Mocking External Services

### Arbetsförmedlingen API

```typescript
// __mocks__/arbetsformedlingen.ts
export const searchJobs = vi.fn().mockResolvedValue({
  total: { value: 10 },
  hits: [
    {
      id: '1',
      headline: 'Test Job',
      employer: { name: 'Test Company' },
    },
  ],
})
```

### Gemini AI

```typescript
// __mocks__/gemini.ts
export const generateCoverLetter = vi.fn().mockResolvedValue(
  'Dear Hiring Manager,\n\nI am writing to express...'
)
```

### Supabase

```typescript
// __mocks__/supabase.ts
export const supabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.pdf' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://...' } }),
    })),
  },
}
```

---

## Troubleshooting

### "Tests pass locally but fail in CI"
- Check for timezone-dependent code
- Verify all mocks are properly reset
- Look for race conditions in async tests

### "Chrome extension not detected"
- Ensure Chrome is running
- Verify extension version is 1.0.36+
- Run `claude --version` to check Claude Code version (need 2.0.73+)
- Restart Chrome after installing extension

### "Mock not working"
- Check mock path matches import path exactly
- Ensure mock is defined before import
- Use `vi.mocked()` for TypeScript types

### "Test timeout"
- Increase timeout: `it('...', { timeout: 10000 }, ...)`
- Check for unresolved promises
- Verify async/await usage
