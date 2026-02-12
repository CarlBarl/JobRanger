# JobbJägaren Agent Notes

## Build command in Codex sandbox
- Use `npx next build --webpack` for build validation.
- Avoid `next build` (Turbopack) in this environment because sandbox restrictions can trigger process/port binding errors.

## TypeScript check workflow
- If `npx tsc --noEmit` reports missing files under `.next/types/**` (TS6053), run `npx next build --webpack` first to regenerate Next.js type artifacts.

## Next.js route handler params
- In this codebase (Next.js 16), dynamic route handlers use async params typing:
  - `{ params }: { params: Promise<{ id: string }> }`
  - `const { id } = await params`
- Tests for these handlers must pass `params` as a Promise (for example `params: Promise.resolve({ id: '123' })`).

## Vercel + Prisma deploy pitfalls
- Git-connected Vercel deploys run `npm run build` in Vercel (Turbopack) and can restore build cache, so type errors may differ from local sandbox builds.
- After Prisma schema field changes, ensure Vercel build regenerates Prisma client types (for example via `prisma generate` in build/prebuild) to avoid stale-client TS errors like missing model properties.
- For failed Vercel builds, use `npx vercel inspect <deployment-url> --logs` to get the exact failing file/line quickly.

## Lessons Learned
- **Read first:** Before starting any task, read `docs/LESSONS-LEARNED.md` for accumulated project knowledge (deployment gotchas, API quirks, design patterns, DB decisions).
- **Write back:** When you discover something new that would save future time, add it to the relevant section in `docs/LESSONS-LEARNED.md`. If no section fits, create one.
- Categories to watch for: Vercel deployment issues, AF API behavior, UI/UX patterns, Prisma/Supabase quirks, i18n, security.

## Autonomous memory updates
- The agent may decide on its own to append notes to this file when it discovers stable, high-value project workflow knowledge.
- For broader lessons (not just build/deploy), prefer `docs/LESSONS-LEARNED.md` over this file.
- Add only project-relevant operational guidance (build/test commands, environment constraints, recurring pitfalls).
- Keep entries concise and actionable; do not add secrets, credentials, or personal data.

## Security hardening baseline (2026-02-10)
- Fix order used for the full security pass (keep this priority for future audits):
  1. CSRF protections on cookie-authenticated state-changing routes.
  2. Rate limiting on auth and high-cost endpoints.
  3. Payload/file validation bounds (size + type/signature checks).
  4. Redirect hardening and response-hardening headers.
  5. Error-message hardening (avoid detailed auth/provider leakage).
- CSRF rule: all `POST`/`PATCH`/`DELETE` route handlers should enforce `enforceCsrfProtection(request)` from `lib/security/csrf.ts` unless a route is explicitly cross-origin by design.
  - Allowed origins can be extended with `CSRF_TRUSTED_ORIGINS` (comma-separated origins).
- Rate-limit rule: sensitive routes should use `consumeRateLimit(...)` from `lib/security/rate-limit.ts` and return `rateLimitResponse(...)` on exhaustion.
  - Current high-priority protected routes include signin, upload, generate, skills (single + batch), debug chat, and mutation routes for documents/jobs/letters.
- Upload rule (`app/api/upload/route.ts`): keep all three checks:
  - MIME allowlist
  - extension allowlist + extension/MIME match
  - file signature validation (PDF magic, DOCX zip signature, text sanity)
- Document PATCH rule (`app/api/documents/[id]/route.ts`): keep `MAX_PARSED_CONTENT_CHARS` enforcement and return `413` for oversized payloads.
- Redirect rule (`app/auth/callback/route.ts`): keep `next` path sanitization (relative-path only; reject protocol-relative/absolute/newline payloads).
- Header baseline rule (`next.config.mjs`): maintain global security headers (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) unless a reviewed exception is required.
- Auth error rule (`app/api/auth/signin/route.ts`): keep generic client-facing invalid-credentials message.
- Storage RLS baseline (`storage.objects`): for bucket `documents`, enforce per-user folder policies so authenticated users can only `SELECT/INSERT/UPDATE/DELETE` objects under `<auth.uid()>/...` (see `prisma/storage-rls-policies.sql`).

## Lessons learned: PDF upload incident (2026-02-10)
- Browser uploads may send PDF as `application/x-pdf`, empty MIME, or `application/octet-stream`; normalize to `application/pdf` only when extension is `.pdf` and signature matches `%PDF-`.
- Keep upload success independent from PDF text extraction: if parsing fails, still persist document with `parsedContent: null` and log structured `requestId` diagnostics.
- In Next.js server runtime, PDF.js worker resolution can fail in dev chunks; keep explicit worker bootstrap/setup in `app/api/upload/route.ts` and maintain `types/pdfjs-worker.d.ts` for `pdf.worker.mjs` typing.
- On Vercel, `pdfjs-dist` text parsing may fail with `DOMMatrix is not defined` if `@napi-rs/canvas` is not installed at the app root; keep `@napi-rs/canvas` as a direct dependency in `package.json`.
- Route tests must mirror current Supabase client usage: when route uploads via `createClient().storage`, mocks must include `storage.from().upload` on `createClient`.
