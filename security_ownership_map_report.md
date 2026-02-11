# Security Ownership Map Report

## Executive Summary
Ownership analysis (last 12 months) shows a single-maintainer risk across all identified auth-sensitive code. There is no orphaned sensitive code by staleness criteria, but bus factor is 1 for all auth-tagged files, creating continuity and review-depth risk.

## Data Source
- Generated artifacts:
  - `ownership-map-out/summary.json`
  - `ownership-map-out/people.csv`
  - `ownership-map-out/files.csv`
  - `ownership-map-out/edges.csv`
  - `ownership-map-out/cochange_edges.csv`
- Command used:
  - `python3 /Users/carlelelid/.codex/skills/security-ownership-map/scripts/build_ownership_map.py --repo . --out ownership-map-out --since "12 months ago" --emit-commits --no-communities`

## Environment Constraint
- `networkx` was unavailable in the sandbox and package install was blocked by no-network restrictions.
- Community detection and GraphML export were therefore skipped (`--no-communities`).

## Key Findings

### OWN-001: Hidden owner concentration in auth-sensitive code
- Severity: High
- Evidence: `ownership-map-out/summary.json` (`hidden_owners`)
- Detail: `CarlBarl` controls `100% of auth code` in the analyzed window.
- Risk: Security-critical knowledge and review authority are concentrated in one identity.

### OWN-002: Bus factor hotspots across auth-sensitive paths
- Severity: High
- Evidence: `ownership-map-out/summary.json` (`bus_factor_hotspots`), `ownership-map-out/files.csv`
- Example hotspots (all bus factor = 1):
  - `app/api/auth/signin/route.ts`
  - `app/auth/callback/route.ts`
  - `components/auth/SignInForm.tsx`
  - `components/auth/SignUpForm.tsx`
- Risk: Single-reviewer monoculture on authentication flows increases security regression likelihood.

### OWN-003: No orphaned sensitive code by configured staleness threshold
- Severity: Informational
- Evidence: `ownership-map-out/summary.json` (`orphaned_sensitive_code: []`)
- Detail: Sensitive-tagged files are recently touched, but still single-owned.

## Metrics Snapshot
- Commits analyzed: 53
- Distinct people: 1
- Files analyzed: 151
- Total file-touch edges: 397
- Sensitive touches (top owner): 32
- Auth-sensitive bus-factor hotspots: 17

## Recommendations
1. Require dual-review on all auth and session-related paths.
2. Add CODEOWNERS rules for `app/api/auth/**`, `app/auth/**`, and `components/auth/**` with at least two maintainers.
3. Create ownership rotation for auth/session code (pairing, on-call shadowing, fix-forward drills).
4. Add security-focused review checklists for auth/callback/session changes.
5. Re-run ownership map monthly and track bus-factor trend for auth-sensitive files.

## Suggested Follow-up Queries
- `python3 /Users/carlelelid/.codex/skills/security-ownership-map/scripts/query_ownership.py --data-dir ownership-map-out files --tag auth --bus-factor-max 1 --limit 50`
- `python3 /Users/carlelelid/.codex/skills/security-ownership-map/scripts/query_ownership.py --data-dir ownership-map-out summary --section hidden_owners`
- `python3 /Users/carlelelid/.codex/skills/security-ownership-map/scripts/query_ownership.py --data-dir ownership-map-out people --sort sensitive_touches --limit 10`
