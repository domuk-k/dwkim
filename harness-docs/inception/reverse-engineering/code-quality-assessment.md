# Code Quality Assessment

## Test Coverage
- **Overall**: Fair
- **Unit Tests**: persona-api 에만 존재 (`src/__tests__/`, LLM/VectorStore 모킹)
- **Integration Tests**: 없음
- **E2E Tests**: 없음 (dwkim CLI 는 수동 검증)

## Code Quality Indicators
- **Linting**: 구성됨 (Biome, root `biome.json`, pre-commit 훅)
- **Code Style**: 일관됨 (lint-staged 가 staged 파일 자동 포맷)
- **Type Safety**: strict TS 전 패키지
- **Documentation**: Good (루트 `CLAUDE.md`, 각 패키지 README 존재)

## Technical Debt

### 🔴 배포 관련 (이 작업 주요 관심사)
1. **`packages/blog/scripts/deploy-blog.sh`** — `pnpm sync-cogni` 명령 사용 중이나 모노레포는 Bun 으로 이행. 실행 시 실패 가능.
2. **`packages/persona-api/Dockerfile.fly`** — pnpm 기반 레거시 Dockerfile, `fly.toml` 은 `Dockerfile` (Bun) 참조 → `.fly` 변형은 혼선 유발, 제거 또는 명시 필요.
3. **Fly.io cold start** — `min_machines_running = 0` + `auto_stop_machines = "stop"` → 첫 요청 ~4-5s. CLI UX 관점 첫 health 체크 시점에 skeleton UI 필요 여부 재검토 대상.
4. **persona-api 수동 배포** — CI 자동화 부재. `fly deploy` 휴먼 오퍼레이션 의존 → 문서화 필수 / GH Action 전환 고려 가능.
5. **Secrets 관리 분산** — `fly secrets`, GitHub Secrets, Vercel Env 세 곳. 단일 명세 없음.

### 🟡 일반
6. **semantic-release workflow `fetch-depth: 0`** 필요 — 현재 설정됨. `id-token: write` 권한도 OK (OIDC provenance).
7. **Dockerfile.dev / docker-compose.dev.yml** — 로컬 개발용 스택, 문서 부재.
8. **persona-api env 검증 시점** — Zod 스키마 있으나 런타임 에러 메시지 개선 여지.
9. **블로그 postbuild `check-links.ts`** — CI 에서 실행되지 않음(Vercel 빌드에서만). 로컬 pre-push 훅 부재.

## Patterns

### Good Patterns
- **Discriminated union SSE events** (dwkim CLI) — 타입 안전 파싱
- **Pure state machine** (dwkim) — 부수효과 분리, 테스트 용이
- **Singleton init/get** (persona-api) — 초기화 순서 강제
- **Multi-stage Docker build** — 이미지 슬림화
- **Conventional commits + semantic-release** — 수동 버전 관리 제거
- **Local BM25 fallback** — 외부 벡터 DB 장애 시에도 동작
- **In-memory Redis fallback** — 부팅 안정성

### Anti-patterns / Risks
- **Mixed package manager 잔재** — blog deploy 스크립트 pnpm 명령
- **Dockerfile 중복** — 3종 (`Dockerfile`, `Dockerfile.fly`, `Dockerfile.dev`) 의 의도 불명확
- **Manual deploy path** — persona-api 배포가 GH Action 으로 재현 불가
- **Health check before cold start 인지 부재** — 문서화되지 않음
