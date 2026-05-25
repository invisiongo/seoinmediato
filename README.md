# SEOImediato

SEO automation platform for keyword generation, Google indexing, and AI-powered landing page creation.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Backend/Auth | Appwrite (Auth + Database) |
| Styling | Tailwind CSS 3.4 + shadcn/ui |
| AI Engine | OpenRouter API (GPT-4o-mini) |
| Deployment | Dokploy on Hetzner |

## Features

- **Projects** -- Manage SEO projects with domain, niche, and status tracking
- **Keyword Generator** -- Combinatorial keyword generation with prefix/suffix modifiers, location templates, and file import (XLSX/CSV/TXT)
- **Keyword Import** -- Bulk import from files with server-side batch processing (500 keywords per batch)
- **Google Indexing** -- Automated Google Indexing API integration with batch processing, retry failed, and pause/resume
- **AI Landing Pages** -- Generate neuromarketing-optimized landing pages via OpenRouter/GPT-4o-mini
- **SEO Sites** -- Dynamic SEO page serving with sitemaps, robots.txt, and schema.org markup
- **Location Templates** -- Reusable location templates for geo-targeted keyword generation
- **2FA Authentication** -- Email/password auth with optional two-factor authentication

## Architecture

Feature-First organization. Each feature contains its own components, hooks, services, types, and store.

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup, 2FA)
│   ├── (main)/                   # Protected routes (dashboard, projects)
│   └── api/                      # Server-side API routes
│       ├── projects/[id]/        # Keywords, landing, status, retry
│       ├── indexing/             # Google Indexing operations
│       └── sites/[domain]/[slug] # SEO page serving
│
├── features/                     # Feature-First modules
│   ├── auth/                     # Authentication + 2FA
│   ├── projects/                 # Project CRUD + detail
│   ├── keywords/                 # Generator + import + export
│   ├── locations/                # Location templates
│   ├── indexing/                 # Google Indexing management
│   ├── sites/                    # SEO sites configuration
│   └── dashboard/                # Dashboard overview
│
└── shared/                       # Shared code
    ├── components/               # Reusable UI components
    ├── hooks/                    # Shared hooks
    ├── lib/                      # Appwrite clients, utilities
    └── types/                    # Shared type definitions
```

**Key architectural decision:** All bulk operations (keyword save, delete, import) use server-side API routes with the `node-appwrite` server SDK to avoid client-side rate limits. The client SDK is used only for single-document operations.

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/projects/[id]/keywords` | Bulk save keywords |
| DELETE | `/api/projects/[id]/keywords` | Bulk delete keywords |
| POST | `/api/projects/[id]/retry-failed` | Reset failed keywords for re-indexing |
| GET | `/api/projects/[id]/landing` | Get landing page data |
| PUT | `/api/projects/[id]/landing` | Update landing page |
| DELETE | `/api/projects/[id]/landing` | Delete landing page |
| POST | `/api/projects/[id]/generate-landing` | Generate AI landing page |
| POST | `/api/projects/[id]/status` | Update project status |
| POST | `/api/indexing/*` | Indexing batch operations |
| GET | `/api/indexing/*` | Indexing status queries |
| GET | `/api/sites/[domain]/[slug]` | Serve SEO page dynamically |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` at the project root:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Start development server

```bash
npm run dev
```

The dev server auto-detects an available port in the range 3000-3006.

## Commands

```bash
npm run dev          # Development server (auto-port 3000-3006)
npm run build        # Production build
npm run start        # Production server
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
```

## Deployment

Deployed via Dokploy on Hetzner. Ensure all environment variables are configured in the Dokploy dashboard before deploying.
