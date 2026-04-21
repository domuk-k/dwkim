# Code Generation Plan: deployment-docs

**Unit**: deployment-docs (single logical unit)
**Source of Truth**: This plan is the single source of truth for Code Generation. Steps must be executed in order; each step checkbox marked when complete.

## Unit Context

- **Stories Implemented**: US-1 (3개월 후 본인), US-2 (AI 에이전트 자동 배포), US-3 (장애 대응)
- **Dependencies**: 없음 (문서 단위, 런타임 의존 무)
- **Expected Interfaces**: 각 DEPLOY.md 는 FR-2 의 10섹션 구조 준수
- **Database Entities**: N/A
- **Service Boundaries**: 3 패키지 + 루트 인덱스

## Files to Create / Modify

**Create** (11 파일):
- `DEPLOYMENT.md` (루트)
- `packages/dwkim/DEPLOY.md`
- `packages/dwkim/.env.example`
- `packages/dwkim/secrets-manifest.md`
- `packages/persona-api/DEPLOY.md`
- `packages/persona-api/.env.example`
- `packages/persona-api/secrets-manifest.md`
- `packages/blog/DEPLOY.md`
- `packages/blog/.env.example`
- `packages/blog/secrets-manifest.md`
- `harness-docs/construction/deployment-docs/code/generation-summary.md` (산출물 요약)

**Modify** (3~4 파일):
- `packages/blog/scripts/deploy-blog.sh` — pnpm → bun
- `packages/persona-api/Dockerfile.fly` — 삭제 or 주석 명시
- `packages/persona-api/Dockerfile.dev` — 주석 명시
- `.gitignore` — 이미 수정됨 (audit.md). 추가 보강 검토.
- `CLAUDE.md` 또는 `README.md` — DEPLOYMENT.md 링크 (1건)

## Execution Steps

### Phase 1 — 공통 기반

- [x] **Step 1**: 루트 `DEPLOYMENT.md` 생성
  - **목적**: 3 패키지 배포 오버뷰 + 공통 사전조건 + 각 `DEPLOY.md` 링크
  - **내용**: 아키텍처 개요 다이어그램, 필수 도구 (Bun, Node 22, flyctl, GitHub CLI), 공통 GitHub secrets, 배포 매트릭스 (package × platform × trigger)
  - **Stories**: US-1, US-2

### Phase 2 — 패키지별 (병렬 가능, 순차 실행)

- [x] **Step 2**: `packages/dwkim/DEPLOY.md` (FR-2 10섹션)
  - **Stories**: US-1, US-2
  - **Quirks 섹션**: semantic-release 이 commit 을 추가로 생성, provenance OIDC

- [x] **Step 3**: `packages/dwkim/.env.example`
  - 키: `DWKIM_API_URL` (선택, 기본 https://persona-api.fly.dev)

- [x] **Step 4**: `packages/dwkim/secrets-manifest.md`
  - GitHub Secrets: `NPM_TOKEN`, `GITHUB_TOKEN` (자동)

- [x] **Step 5**: `packages/persona-api/DEPLOY.md` (FR-2 10섹션)
  - **Stories**: US-1, US-2, US-3
  - **Quirks 섹션**: **Fly.io cold start ~4-5s** (FR-4), auto-stop 동작, min=0 트레이드오프, warming 옵션들

- [x] **Step 6**: `packages/persona-api/.env.example`
  - 키: `OPENROUTER_API_KEY`, `REDIS_URL` (선택), `LOGTAIL_TOKEN` (선택), `LANGFUSE_*` (선택), `ADMIN_API_KEY`, `DISCORD_WEBHOOK_URL` 등 (env.ts 에서 추출)

- [x] **Step 7**: `packages/persona-api/secrets-manifest.md`
  - Fly secrets (`fly secrets set`), 출처 링크 (OpenRouter, Upstash, BetterStack, Langfuse)

- [x] **Step 8**: `packages/blog/DEPLOY.md` (FR-2 10섹션)
  - **Stories**: US-1, US-2
  - **Quirks 섹션**: prebuild sync-cogni (`~/.cogni` 없으면 스킵), postbuild link check, Vercel 자동 배포 트리거

- [x] **Step 9**: `packages/blog/.env.example`
  - 키: Vercel Analytics 자동, 외부 env 최소

- [x] **Step 10**: `packages/blog/secrets-manifest.md`
  - Vercel Env (대시보드), GitHub → Vercel integration

### Phase 3 — Stale 자산 수정

- [x] **Step 11**: `packages/blog/scripts/deploy-blog.sh` — `pnpm` → `bun` 치환
  - `pnpm sync-cogni` → `bun run sync-cogni`
  - `set -e` 유지
  - shebang 유지

- [x] **Step 12**: `packages/persona-api/Dockerfile.fly` 처리
  - **결정**: 삭제 (fly.toml 이 `Dockerfile` 을 참조하므로 사용처 없음). 제거 전 git 이력에서 확인.

- [x] **Step 13**: `packages/persona-api/Dockerfile.dev` 처리
  - **결정**: 상단에 용도 주석 추가 ("For local docker-compose.dev.yml only, not used by Fly.io")

- [x] **Step 14**: `.gitignore` 보강
  - `packages/*/secrets-manifest.md` 은 커밋 대상 (메타데이터). 명시 불필요.
  - `packages/*/.env` 는 이미 `.env` 로 커버됨. 명시 확인.
  - 필요 시 `**/.env.*` 제외 `.env.example` 보강.

### Phase 4 — 메타 & 발견성

- [x] **Step 15**: 루트 `CLAUDE.md` 에 `DEPLOYMENT.md` 링크 추가 (NFR-3 Discoverability)
  - Deployment 섹션에 `> 상세: [DEPLOYMENT.md](./DEPLOYMENT.md)` 한 줄 추가

- [x] **Step 16**: `harness-docs/construction/deployment-docs/code/generation-summary.md` 작성
  - 생성/수정 파일 리스트
  - security-baseline 룰별 적용 결과
  - 다음 단계 (Build and Test) 체크 항목

## Security-Baseline Considerations (Code Generation 중 적용)

각 DEPLOY.md 작성 시:
- **SECURITY-01 (암호화)**: Fly HTTPS force, Redis TLS 스킴 (`rediss://`), Neon TLS default 명시 / Qdrant 내부망 주석
- **SECURITY-02 (접근 로깅)**: Fly proxy 로그, Vercel 로그 대시보드 링크
- **SECURITY-03 (앱 로깅)**: persona-api Pino + Logtail, 로그에 PII 금지 주의 명시
- **SECURITY-04 (HTTP 헤더)**: blog Vercel 헤더 설정 항목 (현재 부재면 Known Issues 에 기록)
- **SECURITY-05 (시크릿)**: FR-3 과 정합. 값 커밋 금지, 플랫폼별 관리

## Quality Gates (본 단계 기준)

- [ ] 11개 create + 3~4개 modify = 총 14~15 파일 변경
- [ ] 각 DEPLOY.md 는 10섹션 헤더 모두 포함
- [ ] 모든 명령은 fenced code block 안
- [ ] 시크릿 값 실제 포함 0건
- [ ] 현 코드베이스와 명령/버전 일치 (package.json, fly.toml 참조)

## Estimated Scope
- **Total Steps**: 16
- **Total Files Touched**: 14~15
- **Session**: 1

## Traceability

| Step | Story | FR | NFR |
|------|-------|-----|-----|
| 1 (DEPLOYMENT.md) | US-1, US-2 | FR-1 | NFR-3 |
| 2, 5, 8 (DEPLOY.md × 3) | US-1, US-2, US-3 | FR-2, FR-4, FR-6 | NFR-1, NFR-4, NFR-5 |
| 3, 6, 9 (.env.example × 3) | US-1, US-2 | FR-3 | NFR-4 (SECURITY-05) |
| 4, 7, 10 (secrets-manifest × 3) | US-1, US-2 | FR-3 | NFR-4 (SECURITY-05) |
| 11 (deploy-blog.sh) | US-1 | FR-5 | NFR-2 |
| 12, 13 (Dockerfile.*) | US-3 | FR-5 | NFR-2 |
| 14 (.gitignore) | - | FR-3 | NFR-4 |
| 15 (CLAUDE.md 링크) | US-1, US-2 | - | NFR-3 |
| 16 (summary) | - | - | - |
