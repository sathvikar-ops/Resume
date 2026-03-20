# Workspace

## Overview

pnpm workspace monorepo using TypeScript. AI Resume Screener — an HR tool that uses OpenAI to analyze and score candidate resumes against job descriptions.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations
- **File parsing**: pdf-parse (PDFs), mammoth (Word docs)
- **Excel export**: exceljs

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── resume-screener/    # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI integration
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

### AI Resume Screener
- **Step 1 - Setup**: Select target roles (SDE Backend, SDE Frontend, AI/ML Engineer, etc.), add custom keywords, upload job descriptions (PDF/Word), company info, previously shortlisted resumes
- **Step 2 - Upload**: Upload candidate resumes (PDF/Word, multiple files)
- **Step 3 - Processing**: AI analyzes each resume with animated loading state
- **Step 4 - Results**: Sortable table with candidate scores, role fit, expandable detail view
- **Excel Export**: Download results as a formatted Excel file with color-coded scores

### Scoring
- Skill Match: 40%
- Job Description Match: 25%
- Keyword Match: 15%
- Experience Match: 10%
- Education Match: 10%

## API Endpoints

- `GET /api/healthz` — Health check
- `POST /api/screen` — Multipart form: roles, customKeywords, jobDescriptions[], companyInfo, shortlistedResumes[], resumes[] → returns CandidateResult[]
- `POST /api/download-excel` — JSON body {results: CandidateResult[]} → returns .xlsx file

## Key Files

- `artifacts/api-server/src/routes/screen.ts` — Main screening logic with OpenAI integration
- `artifacts/resume-screener/src/pages/Dashboard.tsx` — Main wizard UI
- `artifacts/resume-screener/src/components/steps/` — Wizard step components
- `lib/api-spec/openapi.yaml` — API contract (source of truth)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas
