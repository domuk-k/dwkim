# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **pnpm workspace monorepo** with three main packages:

### 1. `packages/dwkim/` - CLI Business Card Tool
- **Purpose**: Command-line tool that displays a developer profile card
- **Entry**: `src/index.ts` (binary: `dwkim`)
- **Commands**: `dwkim` (profile), `dwkim chat` (AI chat), `dwkim help`
- **Build**: Custom esbuild script at `script/build.js`

### 2. `packages/persona-api/` - Fastify RAG API Server
- **Purpose**: Personal chatbot API using RAG (Retrieval-Augmented Generation)
- **Framework**: Fastify with TypeScript
- **Database**: ChromaDB (vector store), Redis (cache, optional)
- **LLM**: OpenAI (primary), Anthropic (fallback)
- **Deployment**: Render.com at https://dwkim.onrender.com

### 3. `packages/blog/` - Next.js Blog
- **Purpose**: Personal blog with MDX content
- **Framework**: Next.js 13+ with App Router
- **Content**: Contentlayer for MDX processing
- **Styling**: Tailwind CSS with shadcn/ui components

## Common Commands

### Workspace-level (from root)
```bash
pnpm dev                  # Start all packages in dev mode
pnpm build               # Build all packages
pnpm lint                # Lint all packages

# Individual package commands
pnpm dev:dwkim           # CLI tool dev mode
pnpm dev:blog            # Blog dev server
pnpm build:dwkim         # Build CLI tool
pnpm build:blog          # Build blog
```

### Package-specific Commands

#### dwkim CLI (`packages/dwkim/`)
```bash
pnpm dev                 # Watch mode with tsx
pnpm build               # Custom esbuild
pnpm lint                # TypeScript check
```

#### persona-api (`packages/persona-api/`)
```bash
pnpm dev                 # Development server
pnpm build               # TypeScript build
pnpm start               # Production server
pnpm test                # Jest tests
pnpm test:watch          # Watch tests
pnpm test:coverage       # Coverage report
pnpm lint                # ESLint
pnpm type-check          # TypeScript check
pnpm init-data           # Initialize vector DB
```

#### blog (`packages/blog/`)
```bash
pnpm dev                 # Next.js dev server
pnpm build               # Next.js build
pnpm preview             # Build and start
pnpm lint                # Next.js lint
```

## Architecture Notes

### persona-api Server Architecture
- **Entry**: `src/index.ts` → `src/server.ts`
- **Routes**: `src/routes/` (health, chat)
- **Services**: `src/services/` (LLM, RAG engine, vector store)
- **Middleware**: Rate limiting, abuse detection (Redis-dependent)
- **Graceful Degradation**: Runs without Redis, falls back to memory-based rate limiting
- **Error Handling**: Comprehensive error handlers with fallback mechanisms

### Development Patterns
- **Error Handling**: Always provide fallbacks (especially for Redis)
- **Environment Variables**: All configuration externalized
- **Logging**: Uses emojis for status indication
- **TypeScript**: Strict mode across all packages
- **Testing**: Jest for persona-api, no test setup for other packages

### Deployment
- **persona-api**: Auto-deploys to Render.com on git push
- **Rate Limiting**: 8 req/min in production
- **Redis**: Optional dependency (free tier)
- **Health Check**: `/health` endpoint for monitoring

## Development Workflow
1. Work from workspace root
2. Use package-specific commands when needed
3. Test changes before committing
4. persona-api auto-deploys on push to main