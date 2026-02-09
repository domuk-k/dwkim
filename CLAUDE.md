# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **Bun workspace monorepo** with three main packages:

### 1. `packages/dwkim/` - CLI Personal Agent
- **Purpose**: CLI 기반 개인 에이전트 (터미널에서 김동욱에 대해 대화)
- **Entry**: `src/index.ts` (binary: `dwkim`)
- **Commands**: `dwkim` (profile + chat), `dwkim profile` (profile only), `dwkim help`
- **Build**: Custom esbuild script at `script/build.js`
- **Environment**: `DWKIM_API_URL` (optional, defaults to https://persona-api.fly.dev)

### 2. `packages/persona-api/` - Personal AI Agent API
- **Purpose**: 김동욱 AI 에이전트 백엔드 (RAG + 개인화 + 대화형 UX)
- **Framework**: Elysia with TypeScript
- **Agent**: LangGraph StateGraph + OpenRouter (Gemini 2.0 Flash)
- **Vector DB**: Qdrant (hybrid search: dense + BM25)
- **Features**: Query Rewriting, SEU (Semantic Embedding Uncertainty), Device ID 개인화, A2UI, 대화 제한
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
- Uses `bun.lock` for lockfile
- Workspace configuration in root `package.json` with `"workspaces": ["packages/*"]`

### Linting & Formatting: Biome
- Configuration in `biome.json` at root level
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix
- Pre-commit hooks via Husky + lint-staged

## Architecture Notes

### dwkim CLI Architecture
- **UI Framework**: `@mariozechner/pi-tui` (imperative TUI with differential rendering)
- **State Machine**: Pure `transition(state, event) → state` function with discriminated union
- **Source Structure**:
  - `src/index.ts` - Entry point, CLI command routing
  - `src/app.ts` - Main orchestrator (TUI setup, event loop, side effects)
  - `src/state/types.ts` - AppState discriminated union + AppEvent types
  - `src/state/machine.ts` - Pure state transition function
  - `src/components/` - pi-tui Text-based components (chatHistory, streamingView, welcomeView, statusBar, progressPipeline, suggestedQuestions)
  - `src/overlays/` - pi-tui Overlay components (emailCollector, feedbackPrompt, exitFeedback, sourcesPanel)
  - `src/ui/theme.ts` - Catppuccin Mocha color palette + chalk functions
  - `src/ui/markdown.ts` - marked + marked-terminal renderer
  - `src/ui/data.ts` - Icons and profile data
  - `src/utils/personaApiClient.ts` - SSE streaming with discriminated union events
  - `src/utils/deviceId.ts` - UUID persistence to `~/.dwkim/device_id`
- **Key Patterns**:
  - **State Machine**: Modes — connecting, welcome, idle, loading, emailInput, feedback, feedbackConfirmed, exitFeedback, error
  - **Discriminated Union Events**: Type-safe SSE parsing (`session | status | content | sources | clarification | progress | done | error`)
  - **Async Generator Streaming**: `streamChat()` yields events from SSE response
  - **Differential Rendering**: pi-tui CSI 2026 synchronized output, no flickering
  - **Overlay System**: HITL UIs (email, feedback, sources) as pi-tui overlays
  - **HITL (Human-in-the-Loop)**: Email collection, feedback prompts, exit feedback
  - **A2UI**: Suggested questions for ambiguous queries

### persona-api Server Architecture
- **Entry**: `src/index.ts` → `src/server.ts` (Elysia app)
- **Routes**: `src/routes/` — chat, chat-aisdk, health, feedback, correction, sync, logs

#### LangGraph RAG Pipeline (`personaAgent.ts`)
```
classify → [simple: directResponse] / [complex: rewrite → search → analyze → generate → followup] → done
```
- **classify**: 쿼리 복잡도 분류 (simple/complex)
- **rewrite**: 규칙 기반 쿼리 재작성 (대명사 치환, "김동욱" 맥락 추가). 비의미 쿼리("흠...", "ㅋㅋ")는 `method: 'skip'`으로 조기 반환
- **search**: Hybrid search (Qdrant dense + BM25 sparse → RRF fusion)
- **analyze**: SEU 불확실성 측정 (초단문/연락처 intent 시 스킵)
- **generate**: LLM 스트리밍 응답 생성
- **followup**: 추천 질문 생성
- **done**: 메타데이터 emit

#### Services (`src/services/`)
- `personaAgent.ts` - LangGraph StateGraph 정의 + PersonaEngine 클래스 (싱글턴, `_initialized` 플래그)
- `chatService.ts` - 비즈니스 로직 (대화 추적, UX 로그, sources 이벤트 캡처)
- `vectorStore.ts` - Qdrant hybrid search (dense + BM25 RRF) + LRU 임베딩 캐시
- `queryRewriter.ts` - 규칙 기반 쿼리 재작성 + 비의미 쿼리 감지 + followup 질문 생성
- `seuService.ts` - Semantic Embedding Uncertainty (다중 LLM 응답 유사도 비교)
- `llmService.ts` - LLM 래퍼 (OpenRouter → Gemini/Claude, 스트리밍/채팅 모드)
- `bm25Engine.ts` - BM25 키워드 인덱싱 (싱글턴)
- `deviceService.ts` - Device ID 기반 개인화 (활동 추적, 관심사 추론)
- `conversationLimiter.ts` - 대화 제한 (턴 수, rate limit)
- `conversationStore.ts` - Redis 기반 대화 히스토리
- `contactService.ts` - 이메일 수집
- `feedbackService.ts` - 사용자 피드백 저장
- `chatLogger.ts` - Pino + Logtail (Better Stack) 구조화 로깅
- `uxLogService.ts` - UX 이벤트 로그 (rewriteMethod, sourceIds, processingTimeMs 등)

#### Singleton Init/Get Pattern
모든 서비스는 `initXxx()` → `getXxx()` 싱글턴 패턴 사용:
```typescript
let instance: Service | null = null
export function initService(deps) { instance = new Service(deps) }
export function getService() { if (!instance) throw; return instance }
```

- **Infra**: `src/infra/redis.ts` (IRedisClient 인터페이스, Redis 실패 시 in-memory fallback)
- **Config**: `src/config/env.ts` (Zod 스키마), `src/config/models.ts` (LLM 모델 프로파일)
- **Data**: `~/.cogni/notes/persona/` (SSOT for vector DB indexing)
- **Tests**: `src/__tests__/` (Bun test, LLM/VectorStore 모킹)

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

**자동 배포 (push to main):**
- **dwkim CLI**: semantic-release → npm publish (packages/dwkim/** 변경 시)
- **blog**: Vercel 자동 빌드

**수동 배포:**
- **persona-api**: `fly deploy` from packages/persona-api/

**Deployment Order (API 변경 시):**
1. persona-api 먼저 배포 (`fly deploy`)
2. git push → dwkim, blog 자동 배포

**Production Info:**
- **Rate Limiting**: 8 req/min
- **Health Check**: `/health` endpoint
- **Streaming**: `/api/v2/chat/stream` (AI SDK Data Stream Protocol)
