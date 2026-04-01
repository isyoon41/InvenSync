# Development Setup Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (for monorepo management)
- Docker & Docker Compose (for PostgreSQL)
- PostgreSQL 16 (via Docker, or local installation)
- Git

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/isyoon41/InvenSync.git
cd InvenSync
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Configure `.env.local`:

```env
# Database (for development with Docker)
DATABASE_URL="postgresql://invensync:password@localhost:5432/invensync_dev"

# LLM Provider (use mock for development)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
TRADEMARK_PROVIDER_MODE=mock

# Email integration (optional)
GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-secret

# Application
NODE_ENV=development
```

### 4. Start PostgreSQL Database

```bash
# Start PostgreSQL container
docker compose -f docker-compose.dev.yml up -d

# Verify it's running
docker compose -f docker-compose.dev.yml ps
```

### 5. Database Setup

```bash
# Create migration (if needed)
pnpm db:migrate dev

# Apply migrations and seed data
pnpm db:migrate
pnpm db:seed

# Open Prisma Studio to view data
pnpm db:studio
```

### 6. Start Development Server

```bash
# Run all applications in development mode
pnpm dev

# The web app will be available at http://localhost:3000
```

## Project Scripts

### Build & Development

```bash
# Start all dev servers
pnpm dev

# Build all packages and apps
pnpm build

# Run in production mode
pnpm start

# Run type checking
pnpm typecheck
```

### Database

```bash
# Run migrations in dev mode
pnpm db:migrate dev

# Apply pending migrations
pnpm db:migrate

# Reset database (removes all data)
pnpm db:reset

# Open Prisma Studio UI
pnpm db:studio

# Generate Prisma client
pnpm db:generate

# Seed with test data
pnpm db:seed
```

### Code Quality

```bash
# Run linter
pnpm lint

# Format code
pnpm format

# Check formatting without changing
pnpm format:check
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Workspace Structure

The project uses pnpm workspaces:

```bash
# Run script in all packages
pnpm --recursive run build

# Run script in specific package
pnpm --filter @ip-review/db run typecheck

# Add dependency to specific package
pnpm add lodash --filter @ip-review/workflows
```

## First Time Data Setup

The seed script creates demo data:

**Demo Firm**: IP Review Desk Demo Firm
- **Admin User**: 윤인식 (yoon@example.com)
- **Reviewer User**: 홍준 (hong@example.com)
- **Demo Inquiries**:
  1. PETBOWL - Full processing pipeline example
  2. K-GEL CARE - Parsed stage example

Access the app at http://localhost:3000 with the demo credentials.

## IDE Setup

### VS Code

Recommended extensions:
- TypeScript Vue Plugin
- Tailwind CSS IntelliSense
- Prisma
- ESLint
- Prettier

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@ip-review/*": ["./packages/*/src"],
      "@/*": ["./apps/web/src"]
    }
  }
}
```

Use these imports:

```typescript
import { prisma } from "@ip-review/db";
import { InquiryOrchestrator } from "@ip-review/workflows";
import { Header } from "@/components";
```

## Troubleshooting

### Docker Issues

**Container won't start:**
```bash
# Check Docker daemon
docker ps

# View logs
docker compose -f docker-compose.dev.yml logs postgres

# Restart containers
docker compose -f docker-compose.dev.yml restart
```

### Database Issues

**Migration failure:**
```bash
# Reset database
pnpm db:reset

# Reseed data
pnpm db:seed
```

**Prisma client out of sync:**
```bash
# Regenerate Prisma client
pnpm db:generate
```

### Port Conflicts

If ports are already in use:

**PostgreSQL (5432):**
```bash
# Use different port in docker-compose.dev.yml
lsof -i :5432  # Find what's using it
```

**Web App (3000):**
```bash
PORT=3001 pnpm dev
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Validate workspace integrity
pnpm audit
```

## Next Steps

1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Check [API.md](./API.md) for endpoint documentation
3. Read [WORKFLOWS.md](./WORKFLOWS.md) for processing pipeline details
4. Explore source code starting with `apps/web/src/app/page.tsx`

## Getting Help

- Check existing issues: https://github.com/isyoon41/InvenSync/issues
- Review PRD and documentation in `/docs`
- Examine test files for usage examples
