# Persona API

> 김동욱 AI 에이전트 - RAG 기반 지식 검색 + 개인화 + 대화형 UX

## 개요

`npx dwkim`으로 실행되는 CLI의 백엔드 API. 단순한 RAG 챗봇이 아닌, **Agent 시스템 + 개인화 + 대화형 UX**를 갖춘 개인 에이전트입니다.

## Architecture

```
User Query (X-Device-ID header)
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Query Rewriting                                │
│  ├─ 대명사 치환 ("그가" → "김동욱이")            │
│  ├─ 짧은 쿼리 확장 ("경력" → "김동욱 경력 회사") │
│  └─ 문맥 기반 해석 (대화 히스토리 참조)          │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Persona Agent (LangGraph)                      │
│  ├─ Gemini 2.0 Flash (LLM)                      │
│  ├─ Checkpointer (대화 상태 관리)                │
│  └─ Tools:                                      │
│      ├─ search_documents (RAG 검색)             │
│      └─ collect_contact (연락처 수집)            │
└─────────────────────────────────────────────────┘
    │
    ├─── A2UI Events ───────────────────┐
    │    (clarification suggestions)    │
    ▼                                   ▼
┌──────────────────────┐    ┌────────────────────┐
│  Vector Store        │    │  Device Service    │
│  ├─ Qdrant (MMR)     │    │  ├─ 재방문 감지     │
│  ├─ OpenAI Embed     │    │  ├─ 관심 주제 추적  │
│  └─ Fallback         │    │  └─ 이메일 연결     │
└──────────────────────┘    └────────────────────┘
```

## 핵심 기능

### 1. Query Rewriting
단순 RAG의 한계(짧은 쿼리, 대명사) 극복:

```typescript
// Input:  "그가 뭘 배웠지"
// Output: "김동욱이 무엇을 배웠는지 학력 전공"

rewriter.rewrite(query, conversationHistory);
```

### 2. Device ID 개인화
익명 사용자도 재방문 시 맞춤 경험:

```typescript
// 90일간 Device 프로필 유지
// - 메시지 수, 관심 주제, 방문 시간
// - 이메일 연결 시 기기 간 동기화
```

### 3. A2UI (Agent-to-UI) Events
모호한 쿼리 시 clarification 제안:

```typescript
type RAGStreamEvent =
  | { type: 'status'; tool: string; message: string }
  | { type: 'sources'; sources: SearchResult[] }
  | { type: 'content'; content: string }
  | { type: 'clarification'; suggestions: string[] }  // A2UI
  | { type: 'done'; metadata: ResponseMetadata }
  | { type: 'error'; error: string };
```

### 4. 대화 제한
abuse 방지 + 자연스러운 종료 유도:

```typescript
// 10턴 제한 + 연락처 수집 유도
// Redis 기반 rate limiting (fallback: memory)
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Agent | LangGraph + Gemini 2.0 Flash |
| RAG | Qdrant (MMR) + OpenAI Embeddings |
| Query | Rule-based Rewriter |
| Personalization | Redis (Device tracking) |
| Server | Fastify + TypeScript |
| Deploy | Fly.io |

## API

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/chat` | SSE 스트리밍 채팅 |
| `GET /health` | 서버 상태 |
| `GET /documentation` | Swagger UI |

### 헤더

```
X-Device-ID: <uuid-v4>  # 개인화용 (optional)
```

## 개발

```bash
# 설치 및 환경변수
pnpm install && cp .env.example .env

# Vector DB 초기화 (Qdrant)
pnpm init-qdrant:clean

# 개발 서버
pnpm dev  # http://localhost:3000

# 테스트
pnpm test
```

## 배포

```bash
fly deploy
```

## Data Source

`~/.cogni/notes/persona/` 디렉토리의 마크다운 파일들이 SSOT. `pnpm init-qdrant:clean`으로 인덱싱.

---

MIT
