# Job Skills Catalog Expansion Design

## Problem

The current `extractJobSkills()` function matches job listing text against a hardcoded catalog of ~30 tech skills (`DEFAULT_JOB_SKILL_CATALOG` in `lib/scoring.ts`). This means non-tech jobs or jobs using different terminology show zero extracted skills, making the "Show job skills" feature useless for most of the Swedish job market.

## Goal

Expand skill extraction to cover all industries (healthcare, education, trades, logistics, finance, soft skills, Swedish-specific terms) by using AF's synonym dictionary as the primary skill catalog with an expanded static fallback.

## Design

### Data Source: AF Synonym Dictionary

The JobAd Enrichments API at `jobad-enrichments-api.jobtechdev.se` provides a `/synonymdictionary` endpoint:

```
GET /synonymdictionary?type=COMPETENCE&spelling=CORRECTLY_SPELLED
```

Returns a comprehensive list of competency terms used in the Swedish labor market. Response includes `items[]` with `concept` labels.

### Architecture

```
Client (JobSearch.tsx)
  -> fetches /api/skills/catalog on mount
  -> receives skill catalog (string[])
  -> passes to extractJobSkills(job, catalog)
  -> existing regex matching continues

Server (/api/skills/catalog/route.ts)
  -> tries AF synonym dictionary API
  -> caches in-memory (24h TTL)
  -> falls back to expanded static catalog on failure
  -> returns { success: true, data: string[] }
```

### Changes

#### 1. New API Route: `app/api/skills/catalog/route.ts`

- `GET` handler that fetches AF synonym dictionary
- Module-level cache with 24h TTL (simple `{ data, timestamp }` pattern)
- Extracts unique `concept_label` strings from response items
- Deduplicates and returns sorted list
- On AF failure: returns `DEFAULT_JOB_SKILL_CATALOG` (expanded version)

#### 2. Expand `DEFAULT_JOB_SKILL_CATALOG` in `lib/scoring.ts`

Grow from ~30 to ~150-200 entries covering:

- **Tech**: existing + Rust, Go, Ruby, PHP, Angular, Vue, Swift, Kotlin, Redis, Kafka, etc.
- **Soft skills**: Projektledning, Ledarskap, Kommunikation, Teamwork, etc.
- **Healthcare**: Omvardnad, Sjukvard, Medicin, etc.
- **Education**: Pedagogik, Undervisning, etc.
- **Trades/Industry**: Svetsning, Elinstallation, CNC, B-korkort, etc.
- **Finance/Admin**: Ekonomi, Bokforing, Fakturering, Excel, SAP, etc.
- **General**: Kundservice, Forsaljning, Marknadsforring, etc.

Both Swedish and English variants where applicable.

#### 3. Update `extractJobSkills()` Signature

```typescript
export function extractJobSkills(
  job: JobTextFields,
  catalog?: readonly string[]
): string[]
```

- Optional `catalog` parameter, defaults to `DEFAULT_JOB_SKILL_CATALOG`
- No other logic changes (same regex matching)

#### 4. Update `JobSearch.tsx`

- New state: `skillCatalog` (string[])
- Fetch `/api/skills/catalog` on mount (parallel with documents/saved jobs)
- Pass `skillCatalog` to `extractJobSkills()` in the `extractedSkillsByJob` memo
- Graceful degradation: if catalog fetch fails, `extractJobSkills` uses its default

#### 5. Empty State in `SearchResults.tsx`

Currently the "Show job skills" button is hidden when `hasExtractedSkills` is false (line 175). Change to:

- Always show the toggle button
- When expanded with no skills, show "No skills found for this job" message
- New i18n key: `noJobSkills`

#### 6. i18n Updates

**en.json** (`jobs` namespace):
```json
"noJobSkills": "No skills found for this job"
```

**sv.json** (`jobs` namespace):
```json
"noJobSkills": "Inga kompetenser hittades for detta jobb"
```

#### 7. Tests

- `app/api/skills/catalog/route.test.ts`: AF success returns catalog, AF failure returns fallback
- `lib/scoring.test.ts`: `extractJobSkills` with custom catalog parameter
- `components/jobs/JobSearch.test.tsx`: empty-state rendering when job has no extractable skills
- `components/jobs/JobSearch.test.tsx`: matched vs unmatched skill highlighting (already partially covered)

### What Stays The Same

- Client-side regex matching in `extractJobSkills()` / `scoreJobRelevance()`
- Matched vs unmatched highlighting (CV skills for highlighting)
- All existing UI layout, card design, pagination
- Existing test assertions continue passing

### Risks

- AF synonym dictionary may return thousands of items, impacting regex matching performance. Mitigation: limit catalog size or benchmark.
- AF API may be unreliable. Mitigation: 24h cache + static fallback.
- Swedish terms may need special regex handling for compound words. Mitigation: existing `normalizeForSkillMatching` already handles diacritics.
