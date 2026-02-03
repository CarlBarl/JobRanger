# AGENTS.md - Instructions for AI Coding Agents

This document provides guidance for any AI assistant (Claude Code, ChatGPT Codex, Cursor, Copilot, etc.) working on this codebase.

---

## 🎯 Project Overview

**JobMatch** is a job application assistant that:
1. Accepts user-uploaded CVs and cover letters
2. Fetches relevant job listings from Arbetsförmedlingen (Swedish Employment Agency)
3. Generates personalized cover letters for each job using AI
4. Allows users to review, edit, and save generated content

**Target Market**: Swedish job seekers (support Swedish + English)

---

## 🧠 Development Approach

### Test-Driven Development (TDD)

**This is non-negotiable.** Every feature must follow this cycle:

```
1. WRITE TEST FIRST (it should fail)
2. Write minimal code to pass
3. Refactor while keeping tests green
4. Repeat
```

When asked to implement a feature:
1. First, ask: "What test files exist for this feature?"
2. If none, create the test file first
3. Write the failing test
4. Then implement the feature

### Code Quality Priorities
1. **Correctness** - Does it work?
2. **Testability** - Can it be tested in isolation?
3. **Readability** - Can a human understand it?
4. **Performance** - Is it efficient?

---

## 🛠️ Tech Stack Reference

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | Next.js 14+ (App Router) | Use Server Components by default |
| Language | TypeScript (strict) | No `any` types |
| Styling | Tailwind CSS | Mobile-first approach |
| Database | Supabase (PostgreSQL) | Via Prisma ORM |
| ORM | Prisma | Type-safe database access |
| AI | Gemini API (free tier) | For cover letter generation |
| Jobs API | Arbetsförmedlingen | Swedish job listings |
| Testing | Vitest + RTL | Unit and component tests |
| E2E Testing | Claude Code + Chrome | Browser automation |
| Hosting | Vercel | Optimized for Next.js |

---

## 📁 File Organization Rules

### Where to Put Things

```
/app                     → Pages and API routes only
/app/api                 → Backend API routes
/components              → Reusable React components
/components/ui           → Base UI components (buttons, inputs)
/components/[feature]    → Feature-specific components
/lib                     → Utilities, clients, helpers
/lib/services            → External service integrations
/lib/validators          → Zod schemas
/prisma                  → Database schema
/__tests__               → Test files (can also co-locate)
/docs                    → Documentation
/types                   → TypeScript type definitions
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `JobCard.tsx` |
| Utilities | camelCase | `parseResume.ts` |
| API Routes | lowercase | `route.ts` |
| Tests | *.test.ts(x) | `JobCard.test.tsx` |
| Types | PascalCase | `JobListing.ts` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

---

## 🧪 Testing Guidelines

### Unit Tests (Vitest)

```typescript
// Pattern for testing
import { describe, it, expect, vi } from 'vitest'

describe('ComponentName', () => {
  it('should [expected behavior] when [condition]', () => {
    // Arrange
    // Act  
    // Assert
  })
})
```

### What to Test

✅ **DO test:**
- Component rendering with different props
- User interactions (clicks, inputs)
- API route handlers
- Utility functions
- Error states and edge cases
- Loading states

❌ **DON'T test:**
- Implementation details
- Third-party library internals
- Styling (unless functional)

### Mocking External Services

Always mock external services in tests:

```typescript
// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}))

// Mock Gemini
vi.mock('@/lib/gemini', () => ({
  generateCoverLetter: vi.fn().mockResolvedValue('Generated content')
}))
```

### Browser Testing with Claude Code + Chrome

For UI testing, Claude Code can control Chrome directly:

**Setup:**
1. Claude in Chrome extension must be installed
2. Run `/chrome` in Claude Code to verify connection
3. Chrome window must be visible

**Example prompts for browser testing:**
- "Navigate to localhost:3000 and verify the homepage loads"
- "Upload a test file and check if it appears in the preview"
- "Submit the form with invalid data and verify error messages"
- "Check the console for any JavaScript errors"

**Important:** Claude Code reads console logs and DOM state directly, so be specific about what to check.

---

## 🔌 API Integration Details

### Arbetsförmedlingen JobSearch API

**Endpoint:** `https://jobsearch.api.jobtechdev.se`

**Key Endpoints:**
- `GET /search?q={query}` - Search jobs by keyword
- `GET /ad/{id}` - Get specific job ad
- `GET /ad/{id}/logo` - Get company logo

**Authentication:**
```
Header: api-key: YOUR_API_KEY
```

**Get API Key:** https://apirequest.jobtechdev.se

**Rate Limits:** Be mindful of request frequency

### Gemini AI API

**Model:** `gemini-pro`

**Use Cases:**
- Parse CV content to extract skills
- Match skills to job requirements  
- Generate personalized cover letters
- Suggest improvements to existing letters

**Best Practices:**
- Include clear system prompts
- Provide context (job description + CV)
- Set temperature for creativity vs consistency
- Handle rate limit errors gracefully

---

## 🗄️ Database Schema Principles

### Core Entities

```
User
  - id, email, name, created_at

Document (CV or Cover Letter)
  - id, user_id, type, file_url, parsed_content, created_at

SavedJob
  - id, user_id, job_id (AF), saved_at, notes

GeneratedLetter  
  - id, user_id, job_id, content, version, created_at
```

### Prisma Best Practices
- Always use transactions for related writes
- Index frequently queried fields
- Use relations over manual joins
- Keep schema.prisma as single source of truth

---

## 🚫 Anti-Patterns to Avoid

### Code
- ❌ Using `any` type
- ❌ Inline styles (use Tailwind)
- ❌ Business logic in components
- ❌ Direct DOM manipulation in React
- ❌ Ignoring TypeScript errors

### Testing  
- ❌ Writing implementation code before tests
- ❌ Testing implementation details
- ❌ Skipping edge cases
- ❌ Leaving `console.log` in test files
- ❌ Writing tests that depend on each other

### Architecture
- ❌ Circular dependencies
- ❌ God components (too much responsibility)
- ❌ Prop drilling (use context or composition)
- ❌ Hardcoded values (use constants/env)

---

## 💡 When You're Stuck

1. **Read the test file first** - It documents expected behavior
2. **Check existing patterns** - Look for similar implementations
3. **Consult the docs/** folder - Architecture decisions are documented
4. **Ask clarifying questions** - Don't assume requirements

---

## 📋 PR/Commit Checklist

Before considering any feature complete:

- [ ] All tests pass (`npm run test`)
- [ ] No TypeScript errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] New code has corresponding tests
- [ ] No `console.log` statements left
- [ ] Environment variables documented if new ones added
- [ ] README updated if setup changed
