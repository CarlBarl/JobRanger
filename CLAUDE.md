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
- **UI/UX work:** Always use `/frontend-design` skill for components, pages, and styling

### Testing

- Use Vitest + React Testing Library
- Mock external services (Supabase, Gemini, AF API)
- Co-locate tests: `ComponentName.test.tsx` alongside source
- Browser testing: Use Claude in Chrome extension (see MCP Plugins below)

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

## MCP Plugins & Synergy

### Available Plugins

| Plugin | Purpose | When to Use |
|--------|---------|-------------|
| **Claude in Chrome** | Browser automation & UI testing | Visual testing, E2E flows, UI verification, screenshots |
| **Supabase** | Database & backend management | Schema changes, queries, migrations, edge functions |
| **Context7** | Library documentation lookup | Fetching up-to-date docs for any library |

### Claude in Chrome (Browser Testing)

**CRITICAL: Use Claude in Chrome extension for ALL browser-based testing and UI verification. NEVER use Playwright.**

```
Workflow:
1. Start dev server: npm run dev
2. Get tab context: tabs_context_mcp (with createIfEmpty: true if needed)
3. Navigate: navigate to localhost:3000
4. Read page: read_page for accessibility tree (preferred) or get_page_text
5. Interact: computer tool with left_click, type actions or form_input
6. Verify: read_page or computer tool with screenshot action
```

**Key tools:**
- `tabs_context_mcp` - Get available tabs, create tab group if needed
- `tabs_create_mcp` - Create new tab in the group
- `navigate` - Go to URL
- `read_page` - Get accessibility tree (best for understanding page structure)
- `find` - Find elements by natural language description
- `computer` - Take screenshots, click, type, scroll, hover
- `form_input` - Set form field values by element ref
- `javascript_tool` - Execute JavaScript in page context
- `get_page_text` - Extract raw text content from page

**Testing pattern:**
1. Make code change
2. Use `read_page` to get page structure and verify elements exist
3. Test user flows with `computer` (click/type) or `form_input` interactions
4. Use `computer` with screenshot action for visual verification
5. Use `find` for natural language element queries

### Supabase MCP

Direct database access without leaving Claude. Use for:

- **Schema inspection:** `list_tables`, `execute_sql`
- **Migrations:** `apply_migration` for DDL changes
- **Debugging:** `get_logs` for service logs
- **Edge Functions:** `deploy_edge_function`, `list_edge_functions`
- **Security:** `get_advisors` to check for vulnerabilities

**Workflow with code:**
1. Write Prisma schema change
2. Use `execute_sql` to verify current state
3. Push schema: `npx prisma db push`
4. Verify with `list_tables`

### Context7 (Documentation)

Fetch current documentation for any library when unsure about APIs:

```
1. resolve-library-id: "next.js" → /vercel/next.js
2. get-library-docs: /vercel/next.js, topic: "app router"
```

Use when:
- Implementing unfamiliar library features
- Checking for API changes
- Getting code examples

### Superpowers Skills

Invoke with `/skill-name`. Key workflows:

| Skill | When to Use |
|-------|-------------|
| `/brainstorming` | Before any new feature - explores intent & requirements |
| `/frontend-design` | **Always use for UI/UX work** - components, pages, layouts, styling |
| `/systematic-debugging` | When hitting bugs - structured diagnosis |
| `/test-driven-development` | Before implementing features |
| `/writing-plans` | Multi-step tasks needing structure |
| `/verification-before-completion` | Before claiming work is done |

### Plugin Synergy Examples

**Feature Development:**
1. `/brainstorming` - Clarify requirements
2. Context7 - Fetch relevant library docs
3. `/test-driven-development` - Write tests first
4. Implement code
5. Chrome `read_page` - Verify visually with accessibility tree
6. Supabase `get_advisors` - Check for security issues
7. `/verification-before-completion` - Final check

**UI/UX Development:**
1. `/brainstorming` - Understand user needs and design goals
2. `/frontend-design` - **Always invoke for UI work** - generates production-grade, distinctive designs
3. Context7 - Fetch Tailwind/shadcn docs if needed
4. Implement components
5. Chrome `read_page` - Verify layout and accessibility tree
6. Chrome `computer` screenshot - Visual review of styling
7. Iterate design with `/frontend-design` if refinements needed

**Debugging:**
1. `/systematic-debugging` - Structure the investigation
2. Supabase `get_logs` - Check backend logs
3. Chrome `read_page` - See current page state
4. Supabase `execute_sql` - Verify data state
5. Fix and verify with Chrome extension

**Database Changes:**
1. Update `prisma/schema.prisma`
2. Supabase `list_tables` - See current schema
3. `npx prisma db push`
4. Supabase `execute_sql` - Verify migration
5. Supabase `get_advisors` - Security check
