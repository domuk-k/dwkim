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

### 3. `packages/blog/` - Astro Blog
- **Purpose**: Personal blog with MDX content
- **Framework**: Astro 5.11+ with static site generation
- **Content**: Astro Content Collections for MDX processing
- **Styling**: Custom CSS with KaTeX for mathematical typography
- **Features**: RSS/Atom feeds, sitemap, image optimization, table of contents

## Common Commands

### Workspace-level (from root)
```bash
pnpm dev                  # Start all packages in dev mode
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
pnpm release:dwkim        # Build and publish dwkim to npm
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
pnpm manage              # Manage vector DB data
```

#### blog (`packages/blog/`)
```bash
pnpm dev                 # Astro dev server
pnpm build               # Astro static build
pnpm preview             # Preview built site
pnpm lint                # ESLint
pnpm new                 # Create new blog post (interactive)
```

## Architecture Notes

### persona-api Server Architecture
- **Entry**: `src/index.ts` → `src/server.ts`
- **Routes**: `src/routes/` (health, chat)
- **Services**: `src/services/` (LLM, RAG engine, vector store)
- **Middleware**: Rate limiting, abuse detection (Redis-dependent)
- **Data**: `data/` contains personal info (resume, experience, FAQ, thoughts)
- **Graceful Degradation**: Runs without Redis, falls back to memory-based rate limiting

### Development Patterns
- **Error Handling**: Always provide fallbacks (especially for Redis)
- **Environment Variables**: All configuration externalized
- **TypeScript**: Strict mode across all packages
- **Testing**: Jest for persona-api only

### Deployment
- **persona-api**: Auto-deploys to Render.com on git push
- **Rate Limiting**: 8 req/min in production
- **Health Check**: `/health` endpoint for monitoring