# Onboarding Wizard — Implementation Plan

## Phase 1: Foundation (Sequential — must be first)

### 1.1 Prisma Schema Migration
- Add `onboardingCompleted Boolean @default(false)` to User model
- Run `npx prisma db push`
- Verify with `npx prisma generate`

### 1.2 API Endpoints (can be parallel with 1.3)
- `app/api/user/profile/route.ts` — PATCH, updates user.name
- `app/api/user/onboarding/route.ts` — PATCH, sets onboardingCompleted=true

## Phase 2: Components (Parallel — 3 agents)

### Agent A: WizardOrb + WizardProgress (Frontend Design)
- `components/onboarding/WizardOrb.tsx` — Animated orb with states (idle, thinking, celebrating), positioning system, speech bubble
- `components/onboarding/WizardProgress.tsx` — Thin 5-segment progress bar

### Agent B: OnboardingWizard Shell + WelcomeStep + DocumentsStep
- `components/onboarding/OnboardingWizard.tsx` — Step management, transitions, orb position coordination
- `components/onboarding/steps/WelcomeStep.tsx` — Name input
- `components/onboarding/steps/DocumentsStep.tsx` — CV + personal letter upload

### Agent C: SkillsStep + JobPreviewStep + CompletionStep
- `components/onboarding/steps/SkillsStep.tsx` — Skills extraction + edit
- `components/onboarding/steps/JobPreviewStep.tsx` — Mini job search
- `components/onboarding/steps/CompletionStep.tsx` — Celebration + navigation

## Phase 3: Integration (Sequential — after Phase 2)

### 3.1 Onboarding Page
- `app/onboarding/page.tsx` — Server component with auth check

### 3.2 Middleware Update
- Check `onboardingCompleted` status
- Redirect logic for `/onboarding`

### 3.3 Translations
- Add `onboarding` section to `messages/en.json` and `messages/sv.json`

### 3.4 Tests
- API endpoint tests
- Middleware redirect tests
- Component integration tests
