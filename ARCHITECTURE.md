# Architecture Documentation

## System Overview

JobMatch is a full-stack web application built with Next.js 14, using the App Router pattern for both frontend and backend functionality.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Next.js Frontend                       │   │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │ Landing │  │Dashboard │  │  Jobs    │  │ Profile  │   │   │
│  │  │  Page   │  │  Page    │  │  Page    │  │  Page    │   │   │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ /api/upload│  │ /api/jobs  │  │/api/generate│                │
│  │ Handle file│  │ Fetch from │  │ AI cover   │                 │
│  │ uploads    │  │ AF API     │  │ letters    │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────┐  ┌───────────────┐  ┌─────────────┐
│   Supabase   │  │Arbetsförmedl- │  │  Gemini AI  │
│  (Database)  │  │ ingen API     │  │    API      │
│  (Storage)   │  │               │  │             │
└──────────────┘  └───────────────┘  └─────────────┘
```

---

## Core Data Flow

### 1. User Document Upload Flow

```
User uploads CV/Cover Letter
         │
         ▼
┌──────────────────┐
│ POST /api/upload │
└──────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌──────────────┐    ┌──────────────┐
│ Validate     │    │ Upload to    │
│ file type    │    │ Supabase     │
│ and size     │    │ Storage      │
└──────────────┘    └──────────────┘
         │                  │
         ▼                  │
┌──────────────┐            │
│ Parse text   │            │
│ content      │            │
└──────────────┘            │
         │                  │
         ▼                  │
┌──────────────┐            │
│ Extract      │            │
│ skills (AI)  │◄───────────┘
└──────────────┘
         │
         ▼
┌──────────────┐
│ Save to      │
│ Database     │
└──────────────┘
```

### 2. Job Search Flow

```
User requests job search
         │
         ▼
┌──────────────────┐
│  GET /api/jobs   │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Get user skills  │
│ from database    │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Query AF API     │
│ with skills as   │
│ search terms     │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Transform and    │
│ return results   │
└──────────────────┘
```

### 3. Cover Letter Generation Flow

```
User selects job for cover letter
         │
         ▼
┌────────────────────┐
│ POST /api/generate │
└────────────────────┘
         │
         ▼
┌──────────────────┐
│ Fetch user CV    │
│ and base letter  │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Fetch job details│
│ from AF API      │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Build prompt     │
│ with context     │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Call Gemini API  │
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Return generated │
│ cover letter     │
└──────────────────┘
```

---

## Component Architecture

### Component Hierarchy

```
app/layout.tsx
└── Providers (Auth, Theme)
    └── app/page.tsx (Landing)
    │   ├── Hero
    │   ├── Features
    │   └── CallToAction
    │
    └── app/dashboard/page.tsx
        ├── DashboardHeader
        ├── DocumentUpload
        │   ├── FileDropzone
        │   └── FilePreview
        ├── JobsList
        │   ├── JobCard
        │   └── JobFilters
        └── SavedJobs
            └── SavedJobCard
```

### Component Categories

| Category | Location | Purpose |
|----------|----------|---------|
| Pages | `/app/**/page.tsx` | Route-level components |
| Layouts | `/app/**/layout.tsx` | Shared page structure |
| Features | `/components/[feature]/` | Feature-specific components |
| UI | `/components/ui/` | Base components (Button, Input, etc.) |
| Providers | `/components/providers/` | Context providers |

---

## Database Schema

### Entity Relationship Diagram

```
┌───────────────┐       ┌───────────────┐
│     User      │       │   Document    │
├───────────────┤       ├───────────────┤
│ id (PK)       │───┐   │ id (PK)       │
│ email         │   │   │ userId (FK)   │◄──┐
│ name          │   │   │ type          │   │
│ createdAt     │   │   │ fileUrl       │   │
│ updatedAt     │   └──►│ parsedContent │   │
└───────────────┘       │ skills (JSON) │   │
                        │ createdAt     │   │
                        └───────────────┘   │
                                            │
┌───────────────┐       ┌───────────────┐   │
│   SavedJob    │       │GeneratedLetter│   │
├───────────────┤       ├───────────────┤   │
│ id (PK)       │       │ id (PK)       │   │
│ userId (FK)   │◄──────│ userId (FK)   │───┘
│ afJobId       │       │ afJobId       │
│ jobTitle      │       │ content       │
│ company       │       │ version       │
│ savedAt       │       │ createdAt     │
│ notes         │       └───────────────┘
└───────────────┘
```

### Key Design Decisions

1. **Skills stored as JSON**: User skills extracted from CV are stored as JSON array for flexibility
2. **AF Job ID reference**: We store Arbetsförmedlingen's job ID rather than copying full job data (keeps data fresh)
3. **Version tracking**: Generated letters track version for iteration

---

## API Route Design

### RESTful Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/upload` | Upload CV or cover letter |
| GET | `/api/documents` | Get user's documents |
| DELETE | `/api/documents/[id]` | Delete a document |
| GET | `/api/jobs` | Search jobs |
| GET | `/api/jobs/[id]` | Get job details |
| POST | `/api/jobs/save` | Save a job |
| DELETE | `/api/jobs/save/[id]` | Unsave a job |
| POST | `/api/generate` | Generate cover letter |
| GET | `/api/letters` | Get generated letters |

### Response Format

All API responses follow this structure:

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message"
  }
}
```

---

## External Service Integration

### Arbetsförmedlingen API

- **Base URL**: `https://jobsearch.api.jobtechdev.se`
- **Auth**: API key in header
- **Rate Limiting**: Respect their limits, implement caching
- **Data Freshness**: Jobs change frequently, don't cache aggressively

### Gemini AI

- **Model**: `gemini-pro`
- **Use Cases**: Skill extraction, cover letter generation
- **Cost Management**: Use free tier limits wisely
- **Fallback**: Consider degraded mode if API unavailable

### Supabase

- **Database**: PostgreSQL via Prisma
- **Storage**: File uploads (CVs, letters)
- **Auth**: User authentication (future)
- **Realtime**: Not used currently

---

## Security Considerations

1. **File Upload Validation**
   - Validate file types (PDF, DOCX, TXT only)
   - Limit file size (5MB max)
   - Scan for malicious content

2. **API Security**
   - Rate limiting on all endpoints
   - Input validation with Zod
   - Sanitize user content before AI prompts

3. **Data Privacy**
   - User documents are private by default
   - Implement proper deletion (GDPR compliance)
   - Don't log sensitive content

---

## Performance Considerations

1. **Caching**
   - Cache AF API responses (5-15 min)
   - Cache static assets aggressively
   - Use ISR for job listing pages

2. **Optimization**
   - Lazy load heavy components
   - Optimize images with next/image
   - Minimize client-side JavaScript

3. **Monitoring**
   - Track API response times
   - Monitor error rates
   - Set up alerts for failures
