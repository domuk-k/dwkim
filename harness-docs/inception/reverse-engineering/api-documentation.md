# API Documentation

## REST APIs (persona-api)

Base URL: `https://persona-api.fly.dev`

### GET /health
- **Purpose**: Fly.io health check (30s interval), CLI 연결 확인
- **Response**: `{ status: "ok", timestamp: ISO, uptime: number }`
- **Cold start**: Fly auto-stop 후 첫 요청 시 ~4-5s 지연

### POST /api/v2/chat/stream
- **Purpose**: AI SDK Data Stream Protocol 호환 채팅 스트리밍
- **Request**: `{ messages: [...], deviceId?: string, sessionId?: string }`
- **Response**: text/event-stream (AI SDK 포맷)
- **Events**: session / status / content / sources / clarification / progress / done / error

### POST /api/v1/chat (legacy)
- **Purpose**: 기존 단일 응답 엔드포인트
- **Status**: 유지 (dwkim CLI 는 v2 스트림 사용)

### POST /api/feedback
- **Purpose**: 사용자 피드백 수집 (HITL)

### POST /api/correction
- **Purpose**: 응답 교정 제보

### POST /api/sync
- **Purpose**: Cogni 노트 동기화 트리거 (ADMIN_API_KEY 필요)
- **Auth**: Bearer `ADMIN_API_KEY`

### GET /api/logs
- **Purpose**: 최근 UX 로그 조회 (관리자용)

## Internal APIs

### `streamChat()` (dwkim CLI)
- **Location**: `packages/dwkim/src/utils/personaApiClient.ts`
- **Signature**: `async function* streamChat(messages, deviceId): AsyncGenerator<SSEEvent>`
- **Returns**: 이벤트 스트림 (discriminated union)

### `PersonaEngine` (persona-api)
- **Location**: `packages/persona-api/src/services/personaAgent.ts`
- **Methods**:
  - `initialize(): Promise<void>` — 1회 초기화 (idempotent)
  - `chat(input: ChatInput): AsyncGenerator<AgentEvent>` — LangGraph 실행

## Data Models

### SSE Event (discriminated union)
- **Fields**:
  - `type: 'session' | 'status' | 'content' | 'sources' | 'clarification' | 'progress' | 'done' | 'error'`
  - payload 타입별 분기

### PersonaNote (vector store)
- **Fields**: `id`, `title`, `content`, `tags[]`, `mtime`
- **Source**: `~/.cogni/notes/**` 중 `tags: [persona]`

### Env Schema (Zod)
- **Required (prod)**: `OPENROUTER_API_KEY` (또는 provider별)
- **Optional**: `REDIS_URL`, `LOGTAIL_TOKEN`, `LANGFUSE_*`, `ADMIN_API_KEY`, `DISCORD_WEBHOOK_URL`
- **Defaults**: `PORT=3000`, `HOST=0.0.0.0`, `RATE_LIMIT_MAX=50`, `CONTEXT_WINDOW=4000`
