# persona-api — Secrets Manifest

> 값은 절대 여기 기록 금지. 키 이름, 출처, 저장 위치만.

## GitHub Secrets (CI 배포용)

| Key | 저장 | 사용처 | 획득 | 로테이션 |
|-----|------|--------|------|----------|
| `FLY_API_TOKEN` | GitHub repo Secrets | `.github/workflows/deploy-persona-api.yml` | `fly tokens create deploy --app persona-api --expiry 8760h` (1년) | 만료 임박 시 `gh secret set FLY_API_TOKEN` 재업로드 |

## Runtime Secrets (Fly.io)

저장: `fly secrets set KEY=value` → Fly.io encrypted vault (플랫폼 레벨 암호화).

### 필수

| Key | 출처 | 획득 | 로테이션 |
|-----|------|------|----------|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | 계정 → API Keys → Create | 만료 없음, 의심 시 즉시 revoke |
| `ADMIN_API_KEY` | 자체 생성 | `openssl rand -hex 32` | 분기별 권장 |

### 선택 (기능별)

| Key | 출처 | 기능 | 미설정 시 |
|-----|------|------|-----------|
| `REDIS_URL` | [upstash.com](https://upstash.com) → Create Database → REST/Redis URL (TLS) | 대화 히스토리, 분산 rate limit | in-memory fallback (재시작 시 유실) |
| `LOGTAIL_TOKEN` | [betterstack.com](https://betterstack.com/logs) → Sources → HTTP source token | 중앙 로깅 | stdout 만 (`fly logs`) |
| `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` | [cloud.langfuse.com](https://cloud.langfuse.com) → Project Settings → API Keys | LLM trace | trace 비활성 |
| `LANGFUSE_BASE_URL` | 위와 동일 (self-host 시 변경) | Langfuse endpoint | `https://cloud.langfuse.com` |
| `DISCORD_WEBHOOK_URL` | Discord 서버 → Integrations → Webhooks → Copy URL | 에러 알림 | 알림 없음 |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY` | 각 프로바이더 콘솔 | OpenRouter 미사용 시 직접 호출 | OpenRouter 로 대체 |

### Conventional Defaults (fly.toml 에 평문)
이미 `packages/persona-api/fly.toml` 에 비-비밀 env 로 포함:
- `PORT=8080`
- `NODE_ENV=production`
- `RATE_LIMIT_MAX=100`
- `RATE_LIMIT_WINDOW_MS=60000`
- `OPENROUTER_MODEL=google/gemini-2.5-flash`
- `QDRANT_URL=https://persona-qdrant.fly.dev`
- `CONTEXT_WINDOW=10000`
- `MAX_SEARCH_RESULTS=10`

## Secret Operations

### 주입
```bash
# 개별
fly secrets set OPENROUTER_API_KEY=sk-or-v1-...

# 배치 (권장, 단일 재시작)
fly secrets set \
  OPENROUTER_API_KEY=... \
  REDIS_URL=rediss://... \
  ADMIN_API_KEY=$(openssl rand -hex 32)
```

### 조회 (값은 표시 안 됨 — 해시만)
```bash
fly secrets list -a persona-api
```

### 삭제
```bash
fly secrets unset KEY -a persona-api
```

### import (한 번에)
```bash
fly secrets import < secrets.txt    # KEY=VALUE 줄 단위. secrets.txt 는 절대 커밋 금지!
```

## Verification

```bash
# 머신 env 에 시크릿 도달 확인 (내부 엔드포인트 활용)
curl -s -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://persona-api.fly.dev/api/logs | jq '.status'
# ADMIN_API_KEY 설정 안 됐으면 401 — 시크릿 미주입 신호
```

## Leak Response
1. **즉시**: 해당 서비스에서 키 revoke (OpenRouter dashboard, Upstash, etc.)
2. **교체**: `fly secrets set KEY=newvalue` → 머신 자동 재시작
3. **감사**: `git log -p | /usr/bin/grep -iE "sk-or-|sk-lf-|pk-lf-|webhook"` — 혹시 커밋된 자취 없는지
4. **의심 시**: `git log --all --full-history -- '**/.env*'` 로 .env 커밋 이력 검색
