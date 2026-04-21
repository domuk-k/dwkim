# persona-api — Deployment Runbook

> Fly.io 호스팅. Region `nrt` (Tokyo). 512MB/shared-cpu, auto-stop.
> **기본 경로**: GitHub Actions 자동 배포 (`deploy-persona-api.yml`). 수동 `fly deploy` 는 fallback.

## 1. Overview

- **Target**: [Fly.io](https://fly.io) app `persona-api`
- **URL**: https://persona-api.fly.dev
- **Region**: `nrt` (Tokyo) — 한국 사용자 레이턴시 최소
- **Machine**: `shared-cpu-1x`, 512MB RAM
- **Trigger**: `main` 브랜치에 `packages/persona-api/**` 변경 포함된 푸시 → `.github/workflows/deploy-persona-api.yml` 자동 실행. `workflow_dispatch` 로 수동 트리거도 가능. 수동 `fly deploy` 는 비상시 fallback.
- **Scaling**: `auto_stop_machines = "stop"`, `auto_start_machines = true`, `min_machines_running = 0` (비용 최적)
- **Sister app**: `persona-qdrant` (`packages/persona-api/qdrant/fly.toml`) — `min_machines_running = 1` (벡터 DB, always-on)

## 2. Prerequisites

### 최초 1회 (이미 완료)
- [ ] Fly.io 계정 + `fly auth login`
- [ ] 앱 생성: `fly apps create persona-api --org personal`
- [ ] 시크릿 1회 주입 (아래 Section 3)
- [ ] (sister app) `persona-qdrant` 도 동일 절차로 생성

### 매 배포 전 (로컬)
- [ ] `flyctl` 설치 + `fly auth whoami` 성공
- [ ] `cd packages/persona-api`
- [ ] `git status` clean, `main` 동기화됨
- [ ] `bun install && bun run type-check` 성공
- [ ] `bun test` 통과 (선택, 권장)
- [ ] (BM25 인덱스 변경 시) `bun run build:index` 로 `data/` 갱신 후 커밋

## 3. Secrets & Environment

**값은 절대 커밋 금지.** `.env` 파일은 gitignore (이미 `packages/persona-api/.gitignore` 에 `.env.*` + `!.env.example` 규칙 존재).

- **로컬 개발**: `cp .env.example .env` 후 값 채우기
- **프로덕션**: `fly secrets set KEY=value` — Fly.io 에만 저장

자세히: [`secrets-manifest.md`](./secrets-manifest.md) · 템플릿: [`.env.example`](./.env.example)

### 필수 시크릿 최소 세트
```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  ADMIN_API_KEY=$(openssl rand -hex 32)
```

### 전체 세트 (권장)
```bash
fly secrets set \
  OPENROUTER_API_KEY=sk-or-... \
  ADMIN_API_KEY=$(openssl rand -hex 32) \
  REDIS_URL=rediss://... \
  LOGTAIL_TOKEN=... \
  LANGFUSE_PUBLIC_KEY=pk-lf-... \
  LANGFUSE_SECRET_KEY=sk-lf-... \
  DISCORD_WEBHOOK_URL=https://discord.com/...
```

> **SECURITY-01**: `REDIS_URL` 은 `rediss://` (TLS) 스킴 사용. Upstash 기본값. 일반 `redis://` 금지.
> **SECURITY-05**: 시크릿은 `fly secrets` 에만 저장. `.env` 파일 커밋 절대 금지.

## 4. Deploy Procedure

### 4.1 기본 배포 (CI 자동)
```bash
# conventional commit + push to main
cd <workspace-root>
git commit -m "feat(persona-api): ..."
git push origin main
# → deploy-persona-api.yml 자동 실행: typecheck → flyctl deploy --remote-only → /health 검증
gh run watch $(gh run list -w deploy-persona-api.yml -L 1 --json databaseId -q '.[0].databaseId')
```

### 4.1b 수동 트리거 (CI)
```bash
gh workflow run deploy-persona-api.yml
```

### 4.1c 수동 배포 (fallback, CI 장애 시)
```bash
cd packages/persona-api
fly deploy
# ~2-4분 소요: Docker 빌드 → 레지스트리 푸시 → 머신 교체
```

### 4.2 변경 없는 재시작
```bash
fly machine restart <machine-id>
# 또는 전체
fly apps restart persona-api
```

### 4.3 Dry-run / 검증만
```bash
fly deploy --build-only      # 이미지 빌드만, 배포 안 함
fly config validate          # fly.toml 문법 검증
```

## 5. Post-Deploy Verification

```bash
# 1. 배포 상태
fly status -a persona-api
fly logs -a persona-api --since 5m

# 2. Health check (cold start 지연 가능 — 첫 요청은 4-5초)
time curl -s https://persona-api.fly.dev/health | jq
# 예상: {"status":"ok","timestamp":"...","uptime":<seconds>}

# 3. 실제 SSE 스트림 smoke test
curl -N -X POST https://persona-api.fly.dev/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"안녕"}]}' | head -20
```

**체크리스트**:
- [ ] `fly status` 에 최소 1 머신 `started`
- [ ] `/health` 200 응답
- [ ] 첫 요청 후 uptime 리셋 확인 (cold start 정상 동작)
- [ ] `/api/v2/chat/stream` 이벤트 수신
- [ ] `fly logs` 에 에러 없음
- [ ] Langfuse trace 도달 (설정된 경우)

## 6. Rollback

Fly.io 는 이전 이미지 배포 히스토리 보존.

```bash
# 릴리즈 목록
fly releases -a persona-api

# 특정 버전으로 되돌리기
fly deploy -a persona-api --image registry.fly.io/persona-api:deployment-<old-hash>

# 혹은 이전 릴리즈로
fly releases rollback <version> -a persona-api
```

## 7. Monitoring & Observability

| 신호 | 위치 |
|------|------|
| 머신 상태 | `fly status -a persona-api`, [Fly dashboard](https://fly.io/apps/persona-api) |
| 실시간 로그 | `fly logs -a persona-api` |
| 구조화 로그 | [BetterStack Logtail](https://betterstack.com/logs) (Pino 경유, `LOGTAIL_TOKEN` 설정 시) |
| LLM trace | [Langfuse](https://langfuse.com) (`LANGFUSE_*` 설정 시) |
| Health | `/health` endpoint, `[[http_service.checks]]` 30s 간격 |
| Metrics | Fly 내장 (CPU/memory/req-rate) — dashboard |

> **SECURITY-02**: Fly proxy access log 는 `fly logs` 로 조회 가능 (별도 설정 불요).
> **SECURITY-03**: Pino 구조화 로깅 + Logtail 중앙 집계. 로그에 `OPENROUTER_API_KEY`, `ADMIN_API_KEY`, `DISCORD_WEBHOOK_URL`, 사용자 이메일 출력 금지 — 현재 `chatLogger.ts` 가 필터링 담당.

## 8. Incident Response

| 증상 | 진단 | 해결 |
|------|------|------|
| "서버 죽은 듯" (첫 요청 ~5초) | `curl -w "%{time_total}" .../health` 측정 | **cold start 정상 동작**. 아래 9번 참조 |
| `/health` 타임아웃 (>30s) | `fly status`, `fly logs --since 10m` | 머신 crash → `fly machine restart` |
| 429 rate limit | `RATE_LIMIT_MAX` 확인 | `fly secrets set RATE_LIMIT_MAX=200` 후 redeploy |
| 503 / OpenRouter 에러 | `fly logs | /usr/bin/grep OpenRouter` | API 키 확인, OpenRouter 상태페이지 확인, fallback model 설정 |
| Redis 연결 실패 | 로그에 `Redis connect ECONNREFUSED` | in-memory fallback 자동 활성화 (UX 영향 있음). `REDIS_URL` 재확인 |
| 벡터 검색 결과 없음 | `data/search-index.json` 존재 확인 | 이미지에 포함 안 됨 → `bun run build:index` 후 `.dockerignore` 확인하여 재배포 |
| 메모리 OOM | `fly status` 에서 메모리 점유율 | `fly scale memory 1024` (주의: 비용↑) |
| Qdrant 연결 실패 (사용 시) | `QDRANT_URL` 확인 | sister app 상태 `fly status -a persona-qdrant` |

## 9. Known Quirks

### Cold Start (중요)
**증상**: 유휴 몇 분 후 첫 요청이 4-5초 지연. 사용자/CLI 입장에서 "서버 다운" 으로 오인.

**원인**:
- `fly.toml` 설정: `auto_stop_machines = "stop"`, `min_machines_running = 0`
- 유휴 → 머신 완전 정지 → 새 요청 시 부팅 (이미지 로드, 프로세스 시작, `PersonaEngine.initialize()`)

**트레이드오프**:
| 옵션 | 비용 | Cold start | 비고 |
|------|------|-----------|------|
| `min=0` + `auto_stop="stop"` (**현재**) | 최저 (사실상 $0) | 4-5초 | 개인 프로젝트 적합 |
| `min=1` + `auto_stop="stop"` | `shared-cpu-1x × 24h × 30일 = 약 $1-2/월` | 0초 | 개인 써도 수용 가능 |
| `min=1` + auto_stop 끔 | 위와 유사 | 0초 | 완전 always-on |
| `min=2+` | 선형 증가 | 0초, 고가용 | 프로덕션급 |

**warming 대안** (낮은 비용 유지하면서 UX 개선):
- **정기 health ping**: cron 또는 [betterstack-uptime](https://betterstack.com/uptime) 이 1분 간격 `/health` 호출 → 유휴 회피. 단, 본 의도인 "유휴 시 비용 0" 도 상쇄됨.
- **CLI skeleton UI**: dwkim CLI 가 첫 health 호출 시 "connecting..." 스피너 4-5초 허용. 이미 구현됨 (`state/machine.ts` 의 `connecting` 모드).
- **서버리스 대안**: 단, Elysia + LangGraph 에 서버리스 cold start 도 유사함 → 이득 적음.

**현재 채택**: `min=0` + CLI 에서 `connecting` 모드로 UX 흡수. 사용자 경험 허용 범위.

### Dockerfile 3종
- `Dockerfile` — **현행** (Bun 공식 이미지, multi-stage). `fly.toml` 이 이걸 참조.
- `Dockerfile.dev` — **로컬 `docker-compose.dev.yml` 전용**. Fly.io 에서는 사용 안 함.
- (`Dockerfile.fly`) — 제거됨 (pnpm 기반 레거시).

### BM25 인덱스
- `scripts/buildSearchIndex.ts` 가 `~/.cogni/notes/**` 중 `tags: [persona]` 파일을 JSON 인덱스로 빌드
- **컨테이너 빌드 시 `~/.cogni` 없음** → 로컬에서 `bun run build:index` 로 `data/search-index.json` 생성 후 커밋해야 이미지에 포함
- `.dockerignore` 에서 `data/` 가 제외되지 않는지 확인 필요

### 환경변수 이중화
- `LLM_GENERATION_MODEL` / `LLM_UTILITY_MODEL` — user-facing vs 내부 처리용 분리
- `OPENROUTER_MODEL` 는 단일 모델 override (legacy)
- 동시 설정 시 우선순위는 `models.ts` 참조

## 10. Agent Cheat Sheet

```bash
# 에이전트가 순차 실행할 최소 명령

# 1) Preflight
cd <workspace-root>/packages/persona-api
fly auth whoami || exit 1
git status --porcelain || exit 1

# 2) Local build validation
bun install
bun run type-check
bun test 2>/dev/null || echo "tests skipped"

# 3) Deploy
fly deploy

# 4) Post-deploy verification
for i in {1..5}; do
  RESULT=$(curl -sf https://persona-api.fly.dev/health && echo "OK" || echo "FAIL")
  echo "attempt $i: $RESULT"
  sleep 2
  [ "$RESULT" = "OK" ] && break
done

# 5) Smoke SSE
curl -N -X POST https://persona-api.fly.dev/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"ping"}]}' | timeout 10 head -5
```

### Agent Guardrails
- **절대**: `fly secrets set` 에 실제 값 포함한 채로 커밋/로깅 금지
- **절대**: 프로덕션 앱 `fly destroy`
- **반드시**: 배포 전 로컬 `type-check` 성공
- **반드시**: 배포 후 health + smoke SSE 검증
- **주의**: sister app (`persona-qdrant`) 배포는 `cd qdrant && fly deploy` — 다른 디렉토리

---
*Last updated: 2026-04-21*
