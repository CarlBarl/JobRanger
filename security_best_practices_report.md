# Security Best Practices Report

## Executive Summary
The codebase has strong per-route authentication and user ownership checks, but several high-impact baseline controls are missing in request handling. The largest risks are cross-site request forgery exposure on cookie-authenticated state-changing endpoints and lack of throttling on authentication/AI-cost endpoints. These issues can enable account actions without user intent and drive operational abuse.

## Scope
- Reviewed stack: Next.js Route Handlers, React frontend, Supabase session auth, Prisma persistence.
- Primary evidence: `/app/api/**`, `/lib/**`, middleware/config files.

## Critical Findings
No critical findings identified.

## High Findings

### SBP-001: Missing CSRF protections on cookie-authenticated state-changing endpoints
- Severity: High
- Impact: Cross-site requests can trigger authenticated state changes (create/update/delete) when a victim has an active session.
- Evidence:
  - `app/api/upload/route.ts:12`
  - `app/api/generate/route.ts:15`
  - `app/api/jobs/save/route.ts:12`
  - `app/api/skills/route.ts:16`
  - `app/api/skills/route.ts:89`
  - `app/api/skills/batch/route.ts:28`
  - `app/api/documents/[id]/route.ts:6`
  - `app/api/documents/[id]/route.ts:53`
  - `app/api/letters/[id]/route.ts:5`
- Notes: No CSRF token validation, `Origin`/`Referer` enforcement, or custom anti-CSRF header checks were found in API handlers.
- Recommendation:
  - Implement one consistent CSRF strategy for all cookie-auth state-changing handlers.
  - Enforce strict `Origin` (and fallback `Referer`) checks server-side.
  - Use synchronized token or double-submit token pattern for mutation endpoints.

### SBP-002: No request throttling on authentication and AI-cost endpoints
- Severity: High
- Impact: Enables brute-force login pressure and cost-amplification/DoS via repeated AI generation calls.
- Evidence:
  - `app/api/auth/signin/route.ts:14`
  - `app/api/generate/route.ts:15`
  - `app/api/skills/route.ts:16`
  - `app/api/skills/batch/route.ts:28`
  - `app/api/debug-chat/route.ts:7`
- Recommendation:
  - Add IP + account keyed rate limits with burst and sustained windows.
  - Add stricter per-user quotas for LLM endpoints and batch workflows.
  - Alert on repeated auth failures and LLM request spikes.

## Medium Findings

### SBP-003: Unbounded content size in document PATCH update
- Severity: Medium
- Impact: Large payloads can increase memory, storage, and processing costs; repeated abuse can degrade availability.
- Evidence:
  - `app/api/documents/[id]/route.ts:87`
  - `app/api/documents/[id]/route.ts:113`
  - `app/api/documents/[id]/route.ts:127`
- Recommendation:
  - Enforce maximum `parsedContent` length before `Buffer.from` and DB/storage updates.
  - Return `413` for oversized updates and log metric counters.

### SBP-004: Upload validation trusts client MIME metadata only
- Severity: Medium
- Impact: Attackers can spoof MIME type, bypass intended file-type restrictions, and push malformed content into parsing/storage paths.
- Evidence:
  - `app/api/upload/route.ts:51`
  - `app/api/upload/route.ts:119`
- Recommendation:
  - Validate magic bytes/signatures server-side for allowed formats.
  - Prefer parser sandbox/resource constraints for PDF handling.
  - Consider malware scanning before persistence in document bucket.

### SBP-005: Security header baseline not visible in app code
- Severity: Medium
- Impact: Missing CSP/clickjacking/nosniff/referrer controls increases exploitability if XSS or injection appears elsewhere.
- Evidence:
  - `next.config.mjs:6`
  - `middleware.ts:4`
- Notes: These headers may be set at edge/platform level, but that is not visible in this repository.
- Recommendation:
  - Set and verify baseline headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`, frame-ancestors / `X-Frame-Options`) either in app config or edge config.

## Low Findings

### SBP-006: Sign-in endpoint returns raw upstream auth error text
- Severity: Low
- Impact: Can expose auth-provider details and may aid account-enumeration tuning.
- Evidence:
  - `app/api/auth/signin/route.ts:26`
- Recommendation:
  - Return a stable generic authentication failure message to clients.
  - Keep detailed provider errors in server logs only.

## Positive Controls Noted
- Consistent auth checks are present on most API routes via Supabase user lookup (example: `app/api/jobs/route.ts:13`, `app/api/documents/[id]/route.ts:57`).
- Resource ownership checks are implemented for user-scoped CRUD operations (example: `app/api/documents/[id]/route.ts:96`, `app/api/letters/[id]/route.ts:29`).
- Route input validation with Zod appears in multiple handlers (`app/api/generate/route.ts:10`, `app/api/jobs/route.ts:6`, `app/api/auth/signin/route.ts:5`).

## Testing Gaps
- No tests were found for CSRF rejection behavior on state-changing endpoints.
- No tests were found validating rate-limit behavior for auth and LLM-heavy routes.
- No tests were found for oversized `parsedContent` rejection in document PATCH.

## Prioritized Next Actions
1. Implement CSRF protection and origin enforcement across all state-changing cookie-auth endpoints.
2. Add rate limiting and quotas on `signin`, `generate`, `skills`, and `batch` routes.
3. Add payload size bounds for document PATCH and file-type signature verification for uploads.
4. Establish and verify security headers in app or edge config.
