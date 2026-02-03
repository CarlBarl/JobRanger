# JobMatch 🎯

An AI-powered job matching platform that helps Swedish job seekers find relevant positions and generate personalized cover letters.

## Features

- **📄 CV & Cover Letter Upload** - Upload your documents in PDF, DOCX, or TXT format
- **🔍 Smart Job Matching** - Find relevant jobs from Arbetsförmedlingen based on your profile
- **✨ AI Cover Letters** - Generate personalized cover letters tailored to each job
- **💾 Save & Organize** - Save interesting jobs and manage your applications

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Jobs Data**: Arbetsförmedlingen JobSearch API
- **Testing**: Vitest, React Testing Library, Claude Code Chrome Integration
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Supabase account (free tier works)
- Arbetsförmedlingen API key
- Google AI API key (Gemini)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jobmatch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in the values in `.env.local`:
   ```
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Database
   DATABASE_URL=your_database_url
   
   # Arbetsförmedlingen API
   AF_API_KEY=your_af_api_key
   
   # Gemini AI
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Project Structure

```
jobmatch/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── dashboard/         # User dashboard
│   ├── jobs/              # Job listings
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Utilities and clients
├── prisma/               # Database schema
├── __tests__/            # Test files
├── docs/                 # Documentation
└── public/               # Static assets
```

### Testing Philosophy

This project uses **Test-Driven Development (TDD)**:

1. Write a failing test first
2. Write minimal code to make it pass
3. Refactor while keeping tests green

**Unit Tests** are written with Vitest and React Testing Library.

**UI/E2E Tests** use Claude Code's Chrome integration for browser automation.

See [docs/TESTING.md](./docs/TESTING.md) for detailed testing guidelines.

## API Documentation

### Arbetsförmedlingen JobSearch API

We use the Swedish Employment Agency's open API to fetch job listings.

- **Documentation**: https://jobsearch.api.jobtechdev.se
- **Get API Key**: https://apirequest.jobtechdev.se

See [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) for integration details.

## Contributing

1. Create a feature branch
2. Write tests first (TDD)
3. Implement the feature
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For questions or issues, please open a GitHub issue.
