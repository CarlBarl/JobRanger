# Onboarding Wizard Design

## Overview

A 5-step guided onboarding wizard for new JobRanger users. Features an animated AI "orb" companion that floats around the interface, pointing users to the next action and teaching them the platform's core loop: **CV → Skills → Job Search → Save → Generate Letters**.

The wizard lives at `/onboarding` and is shown to all new users (when `onboardingCompleted === false`). The orb acts as a teacher — explaining *why* each step matters and *how to do it on their own later*.

---

## Visual Direction

- **Aesthetic:** Apple-esque dark minimal — near-black background (`zinc-950`) with blue accent lighting
- **The Orb:** 48px luminous circle, radial gradient `blue-500` → `blue-700`, ambient glow. Has states: idle (breathing), thinking (pulse), celebrating (sparkle). Moves smoothly between positions to guide user's eye.
- **Surfaces:** Cards/inputs on `zinc-900/80` with subtle borders, floating above the dark canvas
- **Progress:** Thin horizontal line at top, 5 segments, current fills blue. No labels.
- **Typography:** Same soft font stack as dashboard. Orb messages in `text-[15px]` with relaxed leading.
- **Transitions:** Steps cross-fade with 300ms ease. Orb position animates with spring physics (or CSS `transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## Data Model Change

```prisma
model User {
  // ... existing fields
  onboardingCompleted Boolean @default(false)
}
```

Single field. Set to `true` when wizard completes. Middleware checks this to redirect.

---

## Routing & Middleware

### Middleware changes (`middleware.ts`)

After auth check, for authenticated users:
1. If `onboardingCompleted === false` AND path is NOT `/onboarding` → redirect to `/onboarding`
2. If `onboardingCompleted === true` AND path IS `/onboarding` → redirect to `/dashboard`
3. Allow `/onboarding` in the protected routes list

### New route: `app/onboarding/page.tsx`

Server component:
1. Auth check (redirect to signin if unauthenticated)
2. Check `user.onboardingCompleted` — redirect to `/dashboard` if already done
3. Render `<OnboardingWizard userId={user.id} userName={user.name} />`

---

## Component Architecture

```
components/onboarding/
  OnboardingWizard.tsx       — Client. Manages step state, orb position, step transitions.
  WizardOrb.tsx              — The animated orb with speech bubble. Accepts position + message + state.
  WizardProgress.tsx         — Thin 5-segment progress bar.
  steps/
    WelcomeStep.tsx          — Name input
    DocumentsStep.tsx        — CV + personal letter upload
    SkillsStep.tsx           — Skills review/edit after extraction
    JobPreviewStep.tsx       — Mini job search with saves
    CompletionStep.tsx       — Celebration + navigation
```

---

## Step Details

### Step 1: Welcome

**Layout:** Centered content, generous vertical padding.

**Orb behavior:**
- Fades in at center of page
- Message: *"Hi there! I'm your job search companion. Let's get you set up — it only takes a few minutes."*
- After 1.5s, orb floats down to hover near the name input
- Secondary message: *"What should I call you?"*

**UI:**
- Single text input, large (`h-12`), placeholder "Your name", autofocused
- Continue button below, disabled until name has 2+ characters
- Enter key advances

**Teaching moment:** The orb explains its role — "I'll help you find and apply for jobs. First, let me get to know you."

**API call on continue:** `PATCH /api/user/profile` → saves `name` field

### Step 2: Documents

**Layout:** Two stacked cards with clear visual hierarchy.

**Orb behavior:**
- Floats to top-right of CV upload card
- Message: *"Upload your CV and I'll analyze it to find jobs that match your experience."*
- Once CV uploaded, orb moves to personal letter section
- Message: *"If you have a personal letter, I can use it as a reference for your writing style. This is optional."*
- Once done (or skipped), orb moves to Continue button

**UI:**
- **CV Card:** Uses `FileUpload` with `variant="embedded"`. Blue "Required" badge. Accepts PDF, DOCX, TXT.
- **Personal Letter Card:** Uses `PersonalLetterUpload` with `variant="embedded"`. Muted "Optional" badge.
- Continue button disabled until CV is uploaded

**Teaching moment:** *"Later, you can replace these anytime from your dashboard."*

### Step 3: Skills Extraction

**Layout:** Full-width card with skills tags.

**Orb behavior:**
- Enters "thinking" state (faster pulse + rotation)
- Message: *"Reading your CV..."* → *"Extracting your key skills..."*
- Once extracted, returns to idle state near the skills area
- Message: *"I found these skills in your CV. On the Jobs page, you'll search using these — so make sure they look right."*

**UI:**
- Loading state with animated orb and progress text
- Skills appear as editable tags (reuse SkillsEditor pattern)
- Users can add/remove skills
- Continue button always enabled (skills auto-save on edit)

**API calls:**
- On mount: `POST /api/skills/extract` (or call existing batch endpoint) with the uploaded CV's documentId
- On edit: `PATCH /api/skills` (existing endpoint)

**Teaching moment:** *"Tip: You can always edit these from your dashboard later. The more accurate your skills, the better your job matches."*

### Step 4: Job Preview

**Layout:** Location filter at top, compact job list below.

**Orb behavior:**
- Floats to top of page
- Message: *"Let me search for jobs matching your skills. You can filter by location too."*
- After results load, orb moves to the first job card
- Message: *"Tap the heart to save jobs you like. You can generate personalized letters for saved jobs later."*

**UI:**
- Location dropdown (Swedish regions, same list as JobSearch)
- Auto-searches on mount using all extracted skills
- Shows top 5 results as compact cards: title, employer, location, skill match count, save button
- No pagination — just "See more on the Jobs page" link at bottom
- Continue button always enabled (saving is optional)

**API call:** `GET /api/jobs?skills=...&region=...&limit=5`

**Teaching moment:** *"This is just a preview. The full Jobs page has advanced search, filters, and all your saved jobs."*

### Step 5: Completion

**Layout:** Centered, celebratory.

**Orb behavior:**
- Returns to center
- Celebration state: glow expands briefly, then settles
- Message: *"You're all set! Here's what you can do now:"*

**UI:**
- Summary of what was set up: name, CV uploaded, X skills found, Y jobs saved
- Two action cards:
  - **"Search for jobs"** → `/jobs` (primary, filled blue button)
  - **"Go to dashboard"** → `/dashboard` (secondary, outlined)
- Both buttons trigger `PATCH /api/user/onboarding` → sets `onboardingCompleted = true`

**Teaching moment:** *"I'll always be here on your dashboard. Come back anytime to update your CV, manage skills, or generate new letters."*

---

## New API Endpoints

### `PATCH /api/user/profile`
- Auth required
- Body: `{ name: string }`
- Validates: name 1-100 chars, trimmed
- Updates `user.name`

### `PATCH /api/user/onboarding`
- Auth required
- Body: `{ completed: true }`
- Sets `user.onboardingCompleted = true`
- Returns updated user

---

## Middleware Logic (pseudocode)

```typescript
// In updateSession() after getting user session:
if (user && protectedPaths) {
  const dbUser = await getUser(user.id)

  if (!dbUser?.onboardingCompleted && !path.startsWith('/onboarding')) {
    redirect('/onboarding')
  }

  if (dbUser?.onboardingCompleted && path.startsWith('/onboarding')) {
    redirect('/dashboard')
  }
}
```

Note: This requires a lightweight DB check in middleware. To avoid this on every request, we could store `onboardingCompleted` in a cookie/session claim instead. Evaluate during implementation.

---

## Translation Keys

```json
{
  "onboarding": {
    "progress": "Step {current} of {total}",
    "welcome": {
      "orbGreeting": "Hi there! I'm your job search companion. Let's get you set up — it only takes a few minutes.",
      "orbNamePrompt": "What should I call you?",
      "namePlaceholder": "Your name",
      "nameLabel": "Your name",
      "continue": "Continue"
    },
    "documents": {
      "orbCvPrompt": "Upload your CV and I'll analyze it to find jobs that match your experience.",
      "orbLetterPrompt": "If you have a personal letter, I can use it as a reference for your writing style. This is optional.",
      "orbTip": "Later, you can replace these anytime from your dashboard.",
      "cvRequired": "Required",
      "letterOptional": "Optional",
      "continue": "Continue"
    },
    "skills": {
      "orbThinking": "Reading your CV...",
      "orbExtracting": "Extracting your key skills...",
      "orbFound": "I found these skills in your CV. On the Jobs page, you'll search using these — so make sure they look right.",
      "orbTip": "Tip: You can always edit these from your dashboard later. The more accurate your skills, the better your job matches.",
      "continue": "Continue"
    },
    "jobs": {
      "orbSearching": "Let me search for jobs matching your skills. You can filter by location too.",
      "orbResults": "Tap the heart to save jobs you like. You can generate personalized letters for saved jobs later.",
      "orbTip": "This is just a preview. The full Jobs page has advanced search, filters, and all your saved jobs.",
      "locationFilter": "Filter by location",
      "allLocations": "All locations",
      "seeMore": "See more on the Jobs page",
      "continue": "Continue"
    },
    "completion": {
      "orbMessage": "You're all set! Here's what you can do now:",
      "orbTip": "I'll always be here on your dashboard. Come back anytime to update your CV, manage skills, or generate new letters.",
      "summary": {
        "name": "Welcome, {name}",
        "cvUploaded": "CV uploaded",
        "skillsFound": "{count} skills found",
        "jobsSaved": "{count} jobs saved"
      },
      "searchJobs": "Search for jobs",
      "goToDashboard": "Go to dashboard"
    }
  }
}
```

---

## Implementation Sequence

### Phase 1: Foundation (Steps 1-2)
1. Prisma migration: add `onboardingCompleted` to User
2. Create `/onboarding` route + layout
3. Build `WizardOrb` component with animation states + positioning
4. Build `WizardProgress` component
5. Build `OnboardingWizard` shell with step management
6. Implement `WelcomeStep` (name input + API)
7. Implement `DocumentsStep` (embed existing upload components)
8. Create `PATCH /api/user/profile` endpoint

### Phase 2: Intelligence (Step 3)
9. Implement `SkillsStep` (trigger extraction + edit)
10. Wire up skills extraction API call on CV upload completion

### Phase 3: Discovery (Steps 4-5)
11. Implement `JobPreviewStep` (mini search + save)
12. Implement `CompletionStep` (summary + navigation)
13. Create `PATCH /api/user/onboarding` endpoint

### Phase 4: Integration
14. Update middleware to check onboarding status
15. Update auth callback to respect onboarding redirect
16. Add all translation keys (sv + en)
17. Tests for wizard flow, API endpoints, middleware logic

---

## Dashboard Name Fix

**Separate from wizard but done in same PR:**

In `app/dashboard/page.tsx`, the hero section already shows `user.name || user.email`. Once the wizard collects the name, this will display correctly. No dashboard change needed — just ensure the wizard saves the name before advancing.

---

## Files to Create/Modify

### New Files (10)
| File | Purpose |
|------|---------|
| `app/onboarding/page.tsx` | Server component, auth + redirect logic |
| `components/onboarding/OnboardingWizard.tsx` | Client wizard shell |
| `components/onboarding/WizardOrb.tsx` | Animated orb guide |
| `components/onboarding/WizardProgress.tsx` | Progress bar |
| `components/onboarding/steps/WelcomeStep.tsx` | Name input |
| `components/onboarding/steps/DocumentsStep.tsx` | CV + letter upload |
| `components/onboarding/steps/SkillsStep.tsx` | Skills extraction + edit |
| `components/onboarding/steps/JobPreviewStep.tsx` | Mini job search |
| `components/onboarding/steps/CompletionStep.tsx` | Celebration + nav |
| `app/api/user/profile/route.ts` | Update user name |

### Modified Files (5)
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `onboardingCompleted Boolean @default(false)` |
| `middleware.ts` | Check onboarding status, redirect logic |
| `messages/en.json` | Add `onboarding` section |
| `messages/sv.json` | Add `onboarding` section (Swedish) |
| `app/api/user/onboarding/route.ts` | New endpoint for completion flag |
