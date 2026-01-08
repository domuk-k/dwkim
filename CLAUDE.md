# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **Bun workspace monorepo** with three main packages:

### 1. `packages/dwkim/` - CLI Personal Agent
- **Purpose**: CLI 기반 개인 에이전트 (터미널에서 김동욱에 대해 대화)
- **Entry**: `src/index.tsx` (binary: `dwkim`)
- **Commands**: `dwkim` (profile + chat), `dwkim profile` (profile only), `dwkim help`
- **Build**: Custom esbuild script at `script/build.js`
- **Environment**: `DWKIM_API_URL` (optional, defaults to https://persona-api.fly.dev)

### 2. `packages/persona-api/` - Personal AI Agent API
- **Purpose**: 김동욱 AI 에이전트 백엔드 (RAG + 개인화 + 대화형 UX)
- **Framework**: Fastify with TypeScript
- **Agent**: LangGraph + Gemini 2.0 Flash
- **Vector DB**: Qdrant (primary), Neon (alternative)
- **Features**: Query Rewriting, Device ID 개인화, A2UI, 대화 제한
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
bun run build             # Build all packages
bun run dev               # Start all packages in dev mode
bun run lint              # Lint all packages with Biome
bun run lint:fix          # Auto-fix lint issues
bun run format            # Format all files with Biome
bun run release:dwkim     # Build and publish dwkim to npm
```

### Package-specific Commands

#### dwkim CLI (`packages/dwkim/`)
```bash
bun run dev              # Watch mode
bun run build            # Custom esbuild
bun run type-check       # TypeScript check
```

#### persona-api (`packages/persona-api/`)
```bash
bun run dev              # Development server
bun run build            # TypeScript build
bun run start            # Production server
bun test                 # Bun tests
bun test --watch         # Watch tests
bun test --coverage      # Coverage report
bun run type-check       # TypeScript check

# Vector DB initialization (choose one)
bun run init-qdrant      # Initialize Qdrant vector DB
bun run init-qdrant:clean # Clean and reinitialize Qdrant
bun run init-neon        # Initialize Neon postgres vector DB
bun run init-neon:clean  # Clean and reinitialize Neon

bun run manage           # Manage vector DB data
bun run docker:up        # Start Docker containers
bun run docker:down      # Stop Docker containers
```

#### blog (`packages/blog/`)
```bash
bun run dev              # Astro dev server
bun run build            # Astro static build (runs sync-cogni prebuild)
bun run preview          # Preview built site
bun run new <title>      # Create new blog post (use _title for drafts)
bun run sync-cogni       # Sync posts from Cogni SSOT
bun run update-theme     # Update Chiri theme to latest
```

## Tooling

### Package Manager: Bun
- Fast JavaScript runtime and package manager
- Uses `bun.lock` for lockfile
- Workspace configuration in root `package.json` with `"workspaces": ["packages/*"]`

### Linting & Formatting: Biome
- Configuration in `biome.json` at root level
- Replaces ESLint and Prettier for unified lint/format
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix
- Pre-commit hooks via Husky + lint-staged

## Architecture Notes

### dwkim CLI Architecture
- **UI Framework**: React + Ink (terminal renderer)
- **Source Structure**:
  - `src/index.tsx` - Entry point, CLI command routing
  - `src/ui/App.tsx` - Mode-based routing (full/profile)
  - `src/ui/ChatView.tsx` - Streaming chat interface (~700 lines, complex state)
  - `src/ui/ProfileCard.tsx` - Profile display component
  - `src/ui/MarkdownText.tsx` - marked + marked-terminal renderer
  - `src/ui/theme.ts` - Catppuccin Mocha color palette
  - `src/utils/personaApiClient.ts` - SSE streaming with discriminated union events
  - `src/utils/deviceId.ts` - UUID persistence to `~/.dwkim/device_id`
- **Key Patterns**:
  - **Discriminated Union Events**: Type-safe SSE parsing (`session | status | content | sources | clarification | progress | done | error`)
  - **Async Generator Streaming**: `streamChat()` yields events from SSE response
  - **HITL (Human-in-the-Loop)**: Email collection prompt after 5+ conversation turns
  - **A2UI**: Suggested questions for ambiguous queries

### persona-api Server Architecture
- **Entry**: `src/index.ts` → `src/server.ts`
- **Routes**: `src/routes/` (health, chat)
- **Services**:
  - `personaAgent.ts` - LangGraph Agent with tools
  - `vectorStore.ts` - Qdrant/Neon vector store (MMR search)
  - `queryRewriter.ts` - 대명사 치환, 쿼리 확장
  - `deviceService.ts` - Device ID 기반 개인화
  - `ragEngine.ts` - RAG + A2UI events
  - `conversationLimiter.ts` - 대화 제한
  - `contactService.ts` - 연락처 수집
- **Infra**: `src/infra/redis.ts` (graceful fallback to memory)
- **Data**: `~/.cogni/notes/persona/` (SSOT for indexing)
- **Tests**: Bun test with tests in `src/__tests__/`

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
- **Testing**: Bun test for persona-api
- **Versioning**: Semantic Release for dwkim (`bun run release:dwkim`), Changesets for others (`bunx changeset`)
- **Linting**: Biome via Husky + lint-staged for pre-commit hooks

### Git Commit Convention
Use **scoped commits** with conventional commit format:
```
<type>(<scope>): <description>
```

**Scopes** (package names):
- `dwkim` - CLI personal agent
- `blog` - Astro blog
- `persona-api` - Personal AI agent API

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
- **blog**: Deploy with `bun run deploy` from packages/blog/
- **Rate Limiting**: 8 req/min in production
- **Health Check**: `/health` endpoint for monitoring
