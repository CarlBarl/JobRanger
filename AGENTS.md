# JobRanger Agent Notes

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

## Autonomous memory updates
- The agent may decide on its own to append notes to this file when it discovers stable, high-value project workflow knowledge.
- Add only project-relevant operational guidance (build/test commands, environment constraints, recurring pitfalls).
- Keep entries concise and actionable; do not add secrets, credentials, or personal data.
