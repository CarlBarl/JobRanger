# Unified Search: Skills + Text Query

## Problem

When skills are selected on the Jobs page, the text input is ignored entirely. The code has an either/or branch: skills selected → skill-only search, no skills → text-only search. Users expect the text query to guide/narrow skill-based results.

## Design

### API calls: combine text with each skill

`runSkillsSearch` accepts an optional `textQuery` parameter. Each skill's API call concatenates the text:

- Skills: `["React", "TypeScript"]`, text: `"Stockholm"`
- API calls: `q=React Stockholm`, `q=TypeScript Stockholm`

When `textQuery` is empty, behavior is unchanged (`q=React`, `q=TypeScript`).

### Sorting: weighted score

When a text query is present, sort by a combined score instead of raw skill match count:

```
sortScore = (skillMatchCount * 3) + textRelevanceBonus
```

`textRelevanceBonus` (checked against lowercase text):
- +3 if query appears in `headline`
- +2 if query appears in `employer.name`
- +1 if query appears in `description.text`
- These stack (max +6 if found in all three)

When no text query is present, sorting stays as-is (skill match count → date).

### Score examples (3x multiplier)

| Skills matched | Text in headline | Text in employer | Score | Outcome |
|---|---|---|---|---|
| 3 | no | no | 9 | High — many skill matches |
| 2 | yes | yes | 11 | Higher — text match tips the scale |
| 1 | yes | yes | 8 | Decent despite few skill matches |
| 2 | no | no | 6 | Lower than 1-skill + strong text |

### Files to change

- `components/jobs/JobSearch.tsx` — `runSkillsSearch` takes `textQuery`, `handleUnifiedSearch` passes it through, sorting uses weighted score when text present
- No changes to `lib/services/arbetsformedlingen.ts` or `lib/scoring.ts`

### What doesn't change

- Text-only search (no skills selected) works exactly as before
- Skill match badges still show clean skill names
- Region filter, relevance toggle, saved jobs — all untouched
- Onboarding job preview — skills-only, no text input
