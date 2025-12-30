# Persona API

> RAG + Agent 기반 개인화 챗봇

## Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│  Persona Agent (deepagents)     │
│  ├─ Gemini 2.0 Flash            │
│  ├─ LangGraph Checkpointer      │
│  └─ Tools:                      │
│      ├─ search_documents (RAG)  │
│      └─ collect_contact (HITL)  │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  Vector Store (Qdrant)          │
│  ├─ MMR 다양성 검색             │
│  ├─ OpenAI Embeddings           │
│  └─ Graceful Fallback           │
└─────────────────────────────────┘
```

### Tech Stack

| Layer | Stack |
|-------|-------|
| Agent | deepagents + LangGraph + Gemini 2.0 Flash |
| RAG | Qdrant (MMR) + OpenAI Embeddings |
| Server | Fastify + TypeScript |
| Rate Limit | Redis (fallback: memory) |
| Deploy | Fly.io |

## 핵심 구현

### Discriminated Union Events

```typescript
type AgentStreamEvent =
  | { type: 'status'; tool: string; message: string }
  | { type: 'sources'; sources: Document[] }
  | { type: 'content'; content: string }
  | { type: 'done'; metadata: { processingTime: number } }
  | { type: 'error'; error: string };
```

### MMR 다양성 검색

```typescript
// 관련성 + 다양성 동시 최적화
const results = await vectorStore.searchDiverse(query, 5);
// Qdrant 네이티브 MMR → similarity fallback
```

## 빠른 시작

```bash
pnpm install && cp .env.example .env
pnpm dev  # http://localhost:3000
```

## API

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/chat` | 채팅 (streaming SSE) |
| `GET /health` | 상태 |
| `GET /documentation` | Swagger |

## 배포

```bash
fly deploy
```

---

MIT
