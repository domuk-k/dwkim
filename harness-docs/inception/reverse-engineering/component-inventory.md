# Component Inventory

## Application Packages
- **packages/dwkim** — CLI TUI 개인 에이전트 (npm 배포 `dwkim`)
- **packages/persona-api** — RAG+LLM 페르소나 백엔드 (Fly.io 배포)
- **packages/blog** — Astro 정적 블로그 (Vercel 배포)

## Infrastructure Packages
- **packages/persona-api/fly.toml** — Fly.io 앱 정의
- **packages/persona-api/Dockerfile** — 프로덕션 컨테이너 (multi-stage Bun)
- **packages/persona-api/docker-compose.*.yml** — 로컬/개발 스택 (Redis, Chroma, Ollama)
- **packages/blog/vercel.json** — Vercel 프로젝트 설정
- **packages/persona-api/qdrant/fly.toml** — sister app `persona-qdrant` 배포 설정

## CI/CD Packages
- **.github/workflows/ci.yml** — 모든 브랜치 lint+build
- **.github/workflows/publish.yml** — dwkim npm publish (semantic-release, OIDC)
- **.github/workflows/claude-code-review.yml** — PR 자동 리뷰
- **.github/workflows/claude.yml** — Claude Code bot 트리거

## Shared/Config Packages
- **biome.json** (root) — 린트·포맷
- **.husky/** — 커밋 훅
- **package.json** (root) — 워크스페이스, lint-staged

## Test Packages
- **packages/persona-api/src/__tests__/** — Bun 테스트 (LLM/VectorStore 모킹)
- (dwkim, blog 전용 테스트 없음 — CI build 로 검증)

## Total Count
- **Total Packages**: 3 application + 2 infra (fly apps)
- **Application**: 3 (dwkim, persona-api, blog)
- **Infrastructure**: 2 Fly apps (persona-api, persona-qdrant)
- **Shared**: 0 (모노레포지만 패키지 간 import 없음)
- **Test**: 1 (persona-api 내부)
