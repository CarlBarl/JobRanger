# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobMatch is an AI-powered job matching platform for Swedish job seekers. Users upload CVs, get matched with jobs from Arbetsförmedlingen (Swedish Employment Agency), and generate personalized cover letters using Gemini AI.

**Tech Stack:** Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, shadcn/ui, Prisma ORM, Supabase (PostgreSQL + Storage), Google Gemini API, Vitest

## Lessons Learned

**Always consult [`docs/LESSONS-LEARNED.md`](docs/LESSONS-LEARNED.md) before starting work.** This file contains accumulated technical decisions, gotchas, and patterns. When you discover something new that would save future time (deployment issue, API quirk, design pattern, etc.), add it to the relevant section in that file.

## Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Build for production
npm run lint                   # ESLint
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

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `JobCard.tsx` |
| Utilities | camelCase | `parseResume.ts` |
| API Routes | lowercase | `route.ts` |
| Tests | *.test.ts(x) | `JobCard.test.tsx` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

### Key Directories

```
app/                    # Next.js pages and API routes
  admin/                # Admin user management (DEBUG_EMAIL gated)
  api/upload/           # File upload endpoint
  api/jobs/             # Job search (proxies AF API)
  api/generate/         # Cover letter generation
  api/admin/users/      # Admin: list users (GET), delete user (DELETE [id])
components/
  ui/                   # shadcn/ui base components
  [feature]/            # Feature-specific components (upload/, jobs/, letters/)
lib/
  constants.ts          # Shared constants (upload limits, MIME types)
  services/gemini.ts    # Gemini AI client
  services/arbetsformedlingen.ts # AF JobSearch API client
  supabase/             # Supabase client (auth + storage)
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
- Browser testing: Use Claude in Chrome (preferred) or Playwright (fallback) - see MCP Plugins below

### Avoid

- `any` types - use proper typing or Zod
- Inline styles - use Tailwind
- Business logic in components - extract to lib/
- Prop drilling - use context or composition
- Hardcoded values - use constants or env vars
- Writing code before tests

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
# Optional - email address for debug chat access
DEBUG_EMAIL
```

## Plugins

All installed plugins organized by type. Each plugin provides MCP tools, skills (`/command`), agents (subprocesses), or background rules.

### Overview

| Plugin | Type | Provides |
|--------|------|----------|
| **superpowers** | Skills + Agents | 14 workflow skills, code-reviewer agent, master-planning-architect, error-detective-fixer, documentation-maintainer agents |
| **frontend-design** | Skill | `/frontend-design` for production-grade UI/UX |
| **feature-dev** | Skill + Agents | `/feature-dev` guided workflow, code-architect, code-explorer, code-reviewer agents |
| **code-review** | Skill | `/code-review` for PR reviews |
| **ralph-loop** | Skill | `/ralph-loop` autonomous coding loop |
| **claude-md-management** | Skill | `/revise-claude-md`, `/claude-md-improver` for CLAUDE.md maintenance |
| **code-simplifier** | Agent | Simplifies and refines code for clarity |
| **security-guidance** | Background | Secure coding rules (OWASP, input validation, secrets) |
| **github** | Background | GitHub workflow integration (PRs, issues, `gh` CLI) |
| **typescript-lsp** | MCP Tools | `getDiagnostics`, `executeCode` via IDE |
| **Figma** | MCP Tools | Design-to-code, screenshots, variables, Code Connect |
| **Slack** | MCP Tools | Messaging, search, channels, canvases |
| **Claude in Chrome** | MCP Tools | Browser automation, UI testing, GIF recording |
| **Playwright** | MCP Tools | Browser automation (fallback) |
| **Supabase** | MCP Tools | Database, migrations, edge functions, branching |
| **Context7** | MCP Tools | Library documentation lookup |

---

### Skill Plugins

Skills are invoked with `/skill-name`. They provide guided workflows.

#### superpowers (14 skills)

| Skill | When to Use |
|-------|-------------|
| `/brainstorming` | **Before any creative work** - new features, components, modifications |
| `/frontend-design` | **Always for UI/UX work** - components, pages, layouts, styling |
| `/systematic-debugging` | Any bug, test failure, or unexpected behavior |
| `/test-driven-development` | Before implementing any feature or bugfix |
| `/writing-plans` | Multi-step tasks needing structured planning |
| `/verification-before-completion` | Before claiming work is done or committing |
| `/requesting-code-review` | After completing features, before merging |
| `/receiving-code-review` | When processing code review feedback |
| `/executing-plans` | Running implementation plans with review checkpoints |
| `/dispatching-parallel-agents` | 2+ independent tasks that can run in parallel |
| `/subagent-driven-development` | Executing plans with independent tasks in current session |
| `/finishing-a-development-branch` | When implementation is done, deciding merge/PR/cleanup |
| `/using-git-worktrees` | Isolating feature work from current workspace |
| `/writing-skills` | Creating or editing custom skills |

#### feature-dev

| Skill | When to Use |
|-------|-------------|
| `/feature-dev` | Guided feature development with codebase analysis and architecture focus |

#### code-review

| Skill | When to Use |
|-------|-------------|
| `/code-review` | Review a pull request for issues, style, correctness |

#### ralph-loop

| Skill | When to Use |
|-------|-------------|
| `/ralph-loop` | Start autonomous coding loop in current session |
| `/cancel-ralph` | Stop an active Ralph Loop |
| `/help` (ralph-loop) | Explain Ralph Loop and available commands |

#### claude-md-management

| Skill | When to Use |
|-------|-------------|
| `/revise-claude-md` | Update CLAUDE.md with learnings from current session |
| `/claude-md-improver` | Audit and improve all CLAUDE.md files in the repo |

---

### Agent Plugins

Agents are subprocesses launched via the Task tool for complex, multi-step work.

| Agent | Source Plugin | Purpose |
|-------|--------------|---------|
| `feature-dev:code-architect` | feature-dev | Designs feature architectures, provides implementation blueprints |
| `feature-dev:code-explorer` | feature-dev | Deep codebase analysis, traces execution paths, maps architecture |
| `feature-dev:code-reviewer` | feature-dev | Reviews code for bugs, security, quality with confidence filtering |
| `superpowers:code-reviewer` | superpowers | Reviews completed project steps against plan and coding standards |
| `code-simplifier:code-simplifier` | code-simplifier | Simplifies code for clarity and maintainability |
| `master-planning-architect` | superpowers | Creates comprehensive technical blueprints for implementation |
| `error-detective-fixer` | superpowers | Diagnoses, fixes, and prevents runtime errors |
| `documentation-maintainer` | superpowers | Updates project docs after implementation changes |

---

### Background Plugins

These provide rules and guidance without explicit tools.

**security-guidance** - Injects secure coding practices: OWASP top 10 prevention, input validation patterns, secrets handling, dependency safety.

**github** - GitHub workflow integration: PR conventions, issue handling, `gh` CLI patterns, branch management.

---

### MCP Tool Plugins

#### Figma

Design-to-code bridge. Pulls design context, variables, and screenshots directly from Figma files.

**Key tools:**
- `get_screenshot` - Screenshot of selected Figma frame
- `get_design_context` - Full design context (layout, styles, components). Defaults to React + Tailwind, configurable
- `get_variable_defs` - Design tokens (colors, spacing, typography)
- `get_metadata` - Sparse XML outline of layers/positions/sizes (use for large designs before `get_design_context`)
- `get_code_connect_map` / `add_code_connect_map` - Map Figma components to codebase components
- `get_code_connect_suggestions` / `send_code_connect_mappings` - Auto-suggest and confirm Code Connect
- `create_design_system_rules` - Generate rules file for accurate design translation
- `get_figjam` - Convert FigJam diagrams to XML
- `generate_diagram` - Create FigJam diagrams from Mermaid syntax (flowchart, gantt, sequence, state)
- `whoami` - Current authenticated user info

**Workflow: Figma to code**
1. `get_screenshot` of the target frame for visual reference
2. `get_design_context` to get structured layout + styles
3. Optionally `get_variable_defs` for design tokens
4. `get_code_connect_map` to reuse existing components
5. Implement in React + Tailwind, matching the design context

**Prompt tips:**
- Change framework: `"generate my Figma selection in Vue"` or `"in plain HTML + CSS"`
- Use your components: `"generate using components from src/components/ui"`
- Large designs: `get_metadata` first for outline, then `get_design_context` on sections

#### Slack

Read, search, and send messages across Slack workspaces.

**Key tools:**
- `slack_send_message` / `slack_send_message_draft` - Send or draft messages
- `slack_schedule_message` - Schedule for later delivery
- `slack_create_canvas` - Create Slack canvas documents
- `slack_search_public` / `slack_search_public_and_private` - Search messages and files
- `slack_search_channels` / `slack_search_users` - Find channels or users
- `slack_read_channel` / `slack_read_thread` / `slack_read_canvas` - Read content
- `slack_read_user_profile` - View user profiles

**Search modifiers:** `in:channel`, `from:<@user>`, `before:YYYY-MM-DD`, `after:YYYY-MM-DD`, `has:link`, `has:file`, `is:thread`, `"exact phrase"`

#### Claude in Chrome (Browser - Preferred)

Interactive browser automation for UI testing and visual verification.

**Workflow:**
```
1. npm run dev
2. tabs_context_mcp (createIfEmpty: true)
3. navigate to localhost:3000
4. read_page for accessibility tree
5. computer (click, type, scroll) or form_input
6. read_page or computer screenshot to verify
```

**Key tools:**
- `tabs_context_mcp` / `tabs_create_mcp` - Tab management (always call first)
- `navigate` - Go to URL
- `read_page` - Accessibility tree (best for page structure)
- `find` - Locate elements by natural language
- `computer` - Screenshots, click, type, scroll, hover
- `form_input` - Set form field values
- `javascript_tool` - Execute JS in page context
- `get_page_text` - Extract raw text
- `gif_creator` - Record multi-step interactions as GIF
- `read_console_messages` - Console output (use `pattern` param to filter)
- `read_network_requests` - Network traffic inspection
- `resize_window` / `upload_image` / `switch_browser` - Viewport, uploads, browser switching

#### Playwright (Browser - Fallback)

Use when Claude in Chrome is not available.

**Workflow:**
```
1. npm run dev
2. browser_navigate to http://localhost:3000
3. browser_click, browser_fill_form, browser_type
4. browser_take_screenshot or browser_snapshot
5. browser_close when done
```

**Key tools:**
- `browser_navigate` / `browser_navigate_back` - Navigation
- `browser_click` / `browser_hover` / `browser_drag` - Mouse
- `browser_type` / `browser_press_key` / `browser_fill_form` / `browser_select_option` - Input
- `browser_file_upload` - File uploads
- `browser_take_screenshot` / `browser_snapshot` - Visual capture
- `browser_evaluate` / `browser_run_code` - Execute JS
- `browser_console_messages` / `browser_network_requests` - Debug output
- `browser_handle_dialog` / `browser_wait_for` - Dialogs and waits
- `browser_tabs` / `browser_resize` / `browser_install` - Management

**Cleanup:** `rm -f *.png *.jpg && rm -rf .playwright-mcp/`

#### Supabase

Direct database and project management.

**Key tools:**
- **Schema:** `list_tables`, `list_extensions`, `execute_sql`
- **Migrations:** `list_migrations`, `apply_migration`
- **Logs & Security:** `get_logs`, `get_advisors`
- **Edge Functions:** `list_edge_functions`, `get_edge_function`, `deploy_edge_function`
- **Projects:** `list_projects`, `get_project`, `create_project`, `pause_project`, `restore_project`
- **Branching:** `create_branch`, `list_branches`, `merge_branch`, `delete_branch`, `reset_branch`, `rebase_branch`
- **Config:** `get_project_url`, `get_publishable_keys`, `generate_typescript_types`
- **Docs & Cost:** `search_docs`, `get_cost`, `confirm_cost`

**Workflow with Prisma:**
1. Write Prisma schema change
2. `execute_sql` to verify current state
3. `npx prisma db push`
4. `list_tables` to verify
5. `get_advisors` for security check

#### Context7 (Documentation)

Fetch current library docs when unsure about APIs.

```
1. resolve-library-id: "next.js" → /vercel/next.js
2. get-library-docs: /vercel/next.js, topic: "app router"
```

Use for unfamiliar library features, API changes, or code examples.

#### TypeScript LSP (IDE)

Editor integration for diagnostics and code execution.

- `getDiagnostics` - Lint errors, type errors, warnings from editor (can target specific file URI or all files)
- `executeCode` - Run code in Jupyter kernel context

Use `getDiagnostics` after changes to catch TypeScript errors without a full build.

---

### Plugin Synergy Examples

**Figma-to-Code:**
1. Figma `get_screenshot` + `get_design_context` - Pull the design
2. Figma `get_variable_defs` - Extract design tokens
3. `/frontend-design` - Plan component architecture
4. Context7 - Fetch Tailwind/shadcn docs if needed
5. Implement components matching Figma output
6. Chrome `read_page` - Verify against Figma screenshot
7. Figma `add_code_connect_map` - Link components back to Figma

**Feature Development:**
1. `/brainstorming` - Clarify requirements
2. `feature-dev:code-explorer` agent - Analyze existing codebase patterns
3. Context7 - Fetch relevant library docs
4. `/test-driven-development` - Write tests first
5. Implement code
6. IDE `getDiagnostics` - Check for type errors
7. Chrome `read_page` - Verify visually
8. Supabase `get_advisors` - Security check
9. `/verification-before-completion` - Final check
10. Slack `slack_send_message` - Notify team

**Debugging:**
1. `/systematic-debugging` - Structure the investigation
2. IDE `getDiagnostics` - Check type/lint errors
3. `error-detective-fixer` agent - Diagnose and fix
4. Supabase `get_logs` - Backend logs
5. Chrome `read_page` + `read_console_messages` - Page state + console
6. Supabase `execute_sql` - Verify data
7. Fix and verify

**Database Changes:**
1. Update `prisma/schema.prisma`
2. Supabase `list_tables` - Current schema
3. `npx prisma db push`
4. Supabase `execute_sql` - Verify migration
5. Supabase `generate_typescript_types` - Regenerate types
6. Supabase `get_advisors` - Security check

**Code Quality:**
1. `feature-dev:code-reviewer` agent - Review for bugs and security
2. `code-simplifier:code-simplifier` agent - Simplify and refine
3. `/requesting-code-review` - Final review
4. `documentation-maintainer` agent - Update docs
5. `/finishing-a-development-branch` - Merge/PR decision
