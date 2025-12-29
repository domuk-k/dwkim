# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **pnpm workspace monorepo** with three main packages:

### 1. `packages/dwkim/` - CLI Business Card Tool
- **Purpose**: Command-line tool that displays a developer profile card
- **Entry**: `src/index.ts` (binary: `dwkim`)
- **Commands**: `dwkim` (profile + chat), `dwkim profile` (profile only), `dwkim help`
- **Build**: Custom esbuild script at `script/build.js`

### 2. `packages/persona-api/` - Fastify RAG API Server
- **Purpose**: Personal chatbot API using RAG (Retrieval-Augmented Generation)
- **Framework**: Fastify with TypeScript
- **Vector DB**: Qdrant (primary), Neon (alternative), ChromaDB (legacy)
- **LLM**: OpenAI (primary), Anthropic/Google Genai via LangChain
- **Deployment**: Fly.io at https://persona-api.fly.dev

### 3. `packages/blog/` - Astro Blog
- **Purpose**: Personal blog with Markdown content (Chiri theme)
- **Framework**: Astro 5.11+ with static site generation
- **Content**: Astro Content Collections (`posts`, `about`)
- **Styling**: Custom CSS with KaTeX for mathematical typography
- **Features**: RSS/Atom feeds, sitemap, image optimization, TOC, Mermaid diagrams

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
pnpm lint:fix            # ESLint with auto-fix
pnpm type-check          # TypeScript check

# Vector DB initialization (choose one)
pnpm init-qdrant         # Initialize Qdrant vector DB
pnpm init-qdrant:clean   # Clean and reinitialize Qdrant
pnpm init-neon           # Initialize Neon postgres vector DB
pnpm init-neon:clean     # Clean and reinitialize Neon

pnpm manage              # Manage vector DB data
pnpm docker:up           # Start Docker containers
pnpm docker:down         # Stop Docker containers
```

#### blog (`packages/blog/`)
```bash
pnpm dev                 # Astro dev server
pnpm build               # Astro static build (runs sync-cogni prebuild)
pnpm preview             # Preview built site
pnpm lint                # ESLint
pnpm lint:fix            # ESLint with auto-fix
pnpm new <title>         # Create new blog post (use _title for drafts)
pnpm sync-cogni          # Sync posts from Cogni SSOT
pnpm update-theme        # Update Chiri theme to latest
```

## Architecture Notes

### persona-api Server Architecture
- **Entry**: `src/index.ts` → `src/server.ts`
- **Routes**: `src/routes/` (health, chat)
- **Services**:
  - `vectorStore.ts` - Multi-backend vector store (Qdrant/Neon/Chroma)
  - `llmService.ts` - LLM abstraction (OpenAI/Anthropic)
  - `ragEngine.ts` - RAG orchestration
  - `deepAgentService.ts` - Agent-based processing
- **Middleware**: Rate limiting, abuse detection (Redis-optional)
- **Data**: `data/systemPrompt.md` contains the system prompt
- **Graceful Degradation**: Runs without Redis, falls back to memory-based rate limiting
- **Tests**: Jest with tests in `src/__tests__/`, run single test with `pnpm test -- path/to/test`

### Blog Architecture
- **Content Collections**: Defined in `src/content.config.ts`
  - `posts`: Blog posts with title, description, pubDate, image, highlight, keywords frontmatter
  - `about`: Profile sections (developer, coach, runner, contributor)
- **Custom Plugins** (`src/plugins/`):
  - `remark-embedded-media.mjs` - YouTube/Vimeo embeds
  - `remark-reading-time.mjs` - Reading time calculation
  - `remark-toc.mjs` - Table of contents generation
  - `rehype-image-processor.mjs` - Image optimization
  - `rehype-copy-code.mjs` - Code block copy buttons

### Development Patterns
- **Error Handling**: Always provide fallbacks (especially for Redis)
- **TypeScript**: Strict mode across all packages
- **Testing**: Jest for persona-api only
- **Versioning**: Changesets for version management (`pnpm changeset`)
- **Linting**: Husky + lint-staged for pre-commit hooks

### Git Commit Convention
Use **scoped commits** with conventional commit format:
```
<type>(<scope>): <description>
```

**Scopes** (package names):
- `dwkim` - CLI business card tool
- `blog` - Astro blog
- `persona-api` - RAG API server

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `chore` - Maintenance tasks

**Examples**:
```bash
fix(dwkim): update company info
docs(blog): update developer profile
feat(persona-api): add new RAG endpoint
```

**Rules**:
- Separate commits by package/concern
- One logical change per commit

### Deployment
- **persona-api**: Deploy with `fly deploy` from packages/persona-api/
- **blog**: Deploy with `pnpm deploy` from packages/blog/
- **Rate Limiting**: 8 req/min in production
- **Health Check**: `/health` endpoint for monitoring