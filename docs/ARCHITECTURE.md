# InvenSync Architecture

## Overview

InvenSync is a monorepo-based trademark review automation platform built with Next.js, TypeScript, Prisma, and PostgreSQL. It uses a Port-Adapter pattern to maintain clean separation of concerns and pluggable external service integrations.

## Project Structure

```
InvenSync/
├── apps/
│   ├── web/                 # Next.js web application
│   ├── worker/              # Background job processor
│   └── py-adapters/         # Python service adapters
├── packages/
│   ├── domain/              # Core domain types and business logic
│   ├── db/                  # Database layer (Prisma)
│   ├── workflows/           # Workflow orchestration
│   ├── config/              # Shared configuration
│   ├── ui/                  # Shared UI components
│   ├── kipris-client/       # KIPRIS API integration
│   ├── llm-engine/          # LLM integration
│   ├── mail-ingest/         # Email processing
│   └── observability/       # Logging and monitoring
└── docs/                    # Documentation
```

## Key Architectural Principles

### 1. Port-Adapter Pattern
External integrations (LLM, KIPRIS, Gmail) are defined as **Ports** (interfaces) in the domain layer. Concrete implementations are **Adapters** that can be swapped without affecting core logic.

**Ports defined in `@ip-review/domain`:**
- `ILLMPort` - Language model inference
- `ITrademarkSearchPort` - Trademark database search
- `IInboxPort` - Email/calendar integration

### 2. Domain-Driven Design
- **Domain Layer** (`packages/domain/`): Core business logic, entities, and value objects
- **Infrastructure Layer** (`packages/db/`, `packages/kipris-client/`): External integrations
- **Application Layer** (`packages/workflows/`): Use cases and orchestration
- **Presentation Layer** (`apps/web/`): UI and API routes

### 3. Repository Pattern
Data access is abstracted through repository interfaces:
- `IInquiryRepository` - Inquiry data access
- `ICandidateRepository` - Candidate management
- `ISearchJobRepository` - Search job coordination
- `ISearchResultRepository` - Search results management
- `IReviewReportRepository` - Review report persistence

## Data Flow

### Inquiry Processing Pipeline

```
Inquiry Created (Status: new)
    ↓
[InquiryParseWorkflow] - Parse with LLM
    ↓ (Status: parsed)
[CandidateGenerateWorkflow] - Generate candidates with LLM
    ↓ (Status: candidate_ready)
[SearchExecuteWorkflow] - Search KIPRIS database
    ↓ (Status: searched)
[ReportGenerateWorkflow] - Generate review report with LLM
    ↓ (Status: reviewed)
[Manual Review] - Human review and approval
    ↓ (Status: approved)
[Export] - Export for client delivery
    ↓ (Status: exported)
```

## Key Workflows

### 1. InquiryParseWorkflow
- **Input**: Raw inquiry text
- **Process**: Extract mark name, goods description, metadata
- **Output**: Parsed inquiry ready for candidate generation
- **Provider**: LLM (OpenAI/Claude)

### 2. CandidateGenerateWorkflow
- **Input**: Parsed inquiry with mark name and goods
- **Process**: Generate candidate trademark classifications
- **Output**: List of candidates with confidence scores
- **Provider**: LLM

### 3. SearchExecuteWorkflow
- **Input**: Selected candidates
- **Process**: Query KIPRIS database for similar marks
- **Output**: Similar trademark results with relevance scores
- **Provider**: KIPRIS API

### 4. ReportGenerateWorkflow
- **Input**: Search results and parsed inquiry
- **Process**: Analyze similarity, assess risk, draft recommendations
- **Output**: Structured review report with client reply draft
- **Provider**: LLM

## Database Schema

### Core Entities

**Firm** - Trademark law firm (root tenant)
- Users, Clients, InboxAccounts, Inquiries

**User** - Team member with role-based access
- Roles: admin, reviewer, operator

**Inquiry** - Trademark review request
- Status: new → parsed → candidate_ready → searched → reviewed → approved → exported
- Relationships: Client, User (owner), InboxAccount, Inquiry data

**CandidateRun** - Version of candidate generation
- Contains multiple GoodsCandidate entries
- Tracks run state: running, done, failed

**GoodsCandidate** - Individual trademark candidate
- Classification number, term, confidence
- Source type: official, accepted_similar, ai_generated, manual, competitor

**SearchJob** - Trademark search execution
- Contains multiple SearchQuery and SearchResult
- State tracking: queued, running, done, failed

**SearchResult** - Individual trademark found in search
- Mark details: name, applicant, class, status
- Relevance scoring for similarity assessment

**ReviewReport** - Final analysis and recommendations
- Risk assessment, recommendation, client draft
- Approval workflow with timestamp

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/invensync

# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Trademark Search
TRADEMARK_PROVIDER_MODE=mock  # or 'kipris' for production
KIPRIS_API_KEY=...

# Email Integration
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# Application
NODE_ENV=development
```

## API Endpoints

### Inquiries
- `POST /api/inquiries` - Create inquiry
- `GET /api/inquiries?firmId=...` - List inquiries
- `GET /api/inquiries/[id]` - Get inquiry details
- `PATCH /api/inquiries/[id]` - Update inquiry
- `POST /api/inquiries/[id]/process` - Trigger processing

### Candidates
- `GET /api/candidates?candidateRunId=...` - List candidates
- `PATCH /api/candidates/[id]` - Update candidate selection/rating

### Search Results
- `GET /api/search-results?searchJobId=...` - List results
- `PATCH /api/search-results/[id]` - Update shortlist status

### Review Reports
- `GET /api/review-reports?firmId=...` - List reports
- `GET /api/review-reports/[id]` - Get report details
- `PATCH /api/review-reports/[id]` - Update report
- `POST /api/review-reports/[id]?action=approve` - Approve report

## Development Workflow

### Setup
```bash
# Install dependencies
pnpm install

# Create .env.local
cp .env.example .env.local

# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Run migrations
pnpm db:migrate dev

# Seed test data
pnpm db:seed

# Start development server
pnpm dev
```

### Adding a New Feature

1. **Define domain types** in `packages/domain/`
2. **Create repository interface** if data access needed
3. **Implement repository** in `packages/db/src/repositories/`
4. **Create workflow** in `packages/workflows/` if multi-step process
5. **Add API routes** in `apps/web/src/app/api/`
6. **Create React components** in `apps/web/src/components/`
7. **Add pages** in `apps/web/src/app/`
8. **Write tests** in `__tests__/` directories

## Testing Strategy

### Unit Tests
- Domain logic validation
- Workflow step execution
- Repository queries

### Integration Tests
- Full workflow execution with mock providers
- API endpoint functionality
- Database operations

### E2E Tests
- Complete inquiry processing from creation to approval
- User interactions in web UI
- Error handling and recovery

## Performance Considerations

### Indexing
- Inquiries: by firmId, status, createdAt, ownerUserId
- Candidates: by candidateRunId, classNo, isSelected
- Search results: by searchJobId, relevanceScore
- Review reports: by inquiryId, approvedAt

### Caching
- External API responses cached via `ExternalApiCache` table
- KIPRIS search results cached by query hash
- LLM responses cached when identical inputs detected

### Optimization
- Batch operations for search result storage
- Pagination for large result sets
- Async processing for long-running workflows

## Security Considerations

### Data Protection
- Row-level security on tenanted queries (firmId)
- Sensitive fields encrypted at rest (API keys)
- Audit trail for approval actions

### Access Control
- Role-based authorization (admin, reviewer, operator)
- User scoped to firm membership
- API key rotation support

### Secrets Management
- Environment variables for sensitive config
- No secrets in code or git
- Separate prod/staging credentials
