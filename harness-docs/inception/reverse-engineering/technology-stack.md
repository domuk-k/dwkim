# Technology Stack

## Programming Languages
- **TypeScript** 5.3–5.8 — 전 패키지
- **JavaScript (ESM)** — 빌드 스크립트, `release.config.js`
- **Shell (bash)** — `scripts/deploy-blog.sh`, `scripts/install.sh`

## Frameworks

### dwkim CLI
- **@mariozechner/pi-tui** ^0.50.3 — TUI 렌더링
- **chalk** ^5.6.2 — 컬러 출력
- **@catppuccin/palette** ^1.7.1 — 테마 팔레트

### persona-api
- **Elysia** ^1.4.22 — HTTP 서버 (Bun 친화)
- **LangChain / LangGraph** ^1.0.0 — RAG 파이프라인
- **@ai-sdk/langchain** ^2.0.54 — AI SDK 브리지
- **Zod** ^3.25.67 — 환경변수·요청 스키마
- **Pino** ^10.1.0 + **@logtail/pino** — 구조화 로깅

### blog
- **Astro** ^5.11.1 — SSG 프레임워크
- **React** ^19.2.3 — 선택적 아일랜드
- **MDX**, **Mermaid**, **KaTeX** — 콘텐츠 처리
- **Sharp** ^0.34.3 — 이미지 최적화

## Infrastructure
- **Fly.io** — persona-api 호스팅 (Tokyo `nrt`, shared-cpu-1x, 512MB RAM)
  - auto_stop_machines = "stop", min_machines_running = 0 → 유휴 시 완전 정지, cold start ~4-5s
- **Vercel** — blog 호스팅 (정적 빌드 + Analytics)
- **npm registry** — `dwkim` 패키지 (OIDC provenance)
- **Upstash Redis** (선택) — 대화 히스토리·레이트리밋, 미설정 시 in-memory fallback
- **Neon Postgres** (선택) — 벡터 스토어
- **BetterStack Logtail** — 로그 집계
- **Langfuse** — LLM observability (옵션)
- **GitHub** — 소스 + Actions

## Build Tools
- **Bun** 1.3.10 — 런타임·패키지 매니저·테스트러너
- **esbuild** ^0.20.0 — dwkim 번들러
- **TypeScript** tsc — persona-api 컴파일
- **Astro** CLI — blog 빌드
- **Biome** ^2.3.11 — 린트·포맷 (prettier+eslint 대체)

## Release & CI Tools
- **semantic-release** ^25.0.2 + 플러그인 — dwkim 자동 배포
- **Husky** ^9.1.7 + **lint-staged** ^16.1.2 — pre-commit 훅
- **GitHub Actions** — CI/publish
- **flyctl** (로컬) — persona-api 수동 배포

## Testing Tools
- **bun test** — persona-api 유닛 테스트
- **pino-pretty** — 개발 로그 포매터
