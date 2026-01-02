# 통합 작업 계획: 리팩토링 + A2UI

## 파일별 수정 범위 분석

```
┌─────────────────────────────────────────────────────────────────┐
│                        persona-api                               │
├─────────────────────────────────────────────────────────────────┤
│ Stream A: Config & Infra (독립)                                  │
│   ├── src/config/env.ts          [NEW] 환경변수 검증             │
│   └── src/infra/redis.ts         [NEW] Redis 추상화              │
├─────────────────────────────────────────────────────────────────┤
│ Stream B: PersonaAgent (A 의존)                                  │
│   └── src/services/personaAgent.ts                               │
│       ├── [Refactor] any 타입 제거                               │
│       └── [A2UI] status 확장, tool_call 이벤트                   │
├─────────────────────────────────────────────────────────────────┤
│ Stream C: VectorStore (독립)                                     │
│   └── src/services/vectorStore.ts                                │
│       └── [Refactor] 싱글턴 패턴                                 │
├─────────────────────────────────────────────────────────────────┤
│ Stream D: Chat Handler (B 의존)                                  │
│   ├── src/routes/chat.ts                                         │
│   │   ├── [Refactor] 핸들러 로직 분리                            │
│   │   └── [A2UI] 이벤트 포워딩                                   │
│   └── src/services/chatService.ts [NEW] 분리된 서비스            │
├─────────────────────────────────────────────────────────────────┤
│ Stream E: Server DI (A, C 의존)                                  │
│   └── src/server.ts                                              │
│       └── [Refactor] DI 컨테이너                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                           dwkim                                  │
├─────────────────────────────────────────────────────────────────┤
│ Stream F: Frontend (B, D 의존)                                   │
│   ├── src/utils/personaApiClient.ts                              │
│   │   └── [A2UI] StreamEvent 타입 확장                           │
│   └── src/ui/ChatView.tsx                                        │
│       └── [A2UI] 상태 표시 UI, 도구 추적 UI                      │
└─────────────────────────────────────────────────────────────────┘
```

## 의존성 그래프

```
Stream A (Config)  ──┬──► Stream B (PersonaAgent) ──► Stream D (Chat) ──┐
                     │                                                   │
Stream C (Vector) ───┼──► Stream E (Server DI)                          ├──► Stream F (Frontend)
                     │                                                   │
                     └───────────────────────────────────────────────────┘
```

## 병렬 작업 가능 그룹

### Group 1: 기반 작업 (병렬 가능)
| Stream | 작업 | 파일 | 복잡도 |
|--------|------|------|--------|
| A | env.ts 생성 | `src/config/env.ts` | Low |
| A | Redis 추상화 | `src/infra/redis.ts` | Medium |
| C | VectorStore 싱글턴 | `src/services/vectorStore.ts` | Medium |

### Group 2: 핵심 로직 (Group 1 완료 후)
| Stream | 작업 | 파일 | 복잡도 |
|--------|------|------|--------|
| B | PersonaAgent 타입 + A2UI 이벤트 | `src/services/personaAgent.ts` | High |
| E | Server DI | `src/server.ts` | Medium |

### Group 3: 핸들러 분리 (Group 2 완료 후)
| Stream | 작업 | 파일 | 복잡도 |
|--------|------|------|--------|
| D | chat.ts → ChatService 분리 | `src/routes/chat.ts`, `src/services/chatService.ts` | High |

### Group 4: 프론트엔드 (Group 2, 3 완료 후)
| Stream | 작업 | 파일 | 복잡도 |
|--------|------|------|--------|
| F | StreamEvent 타입 확장 | `packages/dwkim/src/utils/personaApiClient.ts` | Low |
| F | ChatView UI 개선 | `packages/dwkim/src/ui/ChatView.tsx` | Medium |

---

## 상세 작업 목록

### Stream A: Config & Infra

#### A-1: 환경변수 검증 모듈
```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VOYAGE_API_KEY: z.string().min(1),
  GOOGLE_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).refine(
  (d) => d.GOOGLE_API_KEY || d.GEMINI_API_KEY || d.OPENROUTER_API_KEY,
  { message: 'At least one LLM API key required' }
);

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
```

#### A-2: Redis 추상화
```typescript
// src/infra/redis.ts
export interface IRedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class RedisClient implements IRedisClient { /* ioredis 래퍼 */ }
export class MemoryClient implements IRedisClient { /* Map 기반 폴백 */ }

export function createRedisClient(url?: string): IRedisClient {
  return url ? new RedisClient(url) : new MemoryClient();
}
```

---

### Stream B: PersonaAgent

#### B-1: 타입 안전성 개선
```typescript
// any 타입 제거를 위한 인터페이스 정의
interface DeepAgentConfig {
  model: BaseChatModel;
  tools: StructuredTool[];
  systemPrompt: string;
  checkpointer: BaseCheckpointSaver;
}

interface DeepAgent {
  invoke(input: AgentInput, config?: RunnableConfig): Promise<AgentResult>;
  stream(input: AgentInput, config?: RunnableConfig): AsyncIterable<StreamChunk>;
}
```

#### B-2: A2UI 이벤트 확장
```typescript
// AgentStreamEvent 확장
export type AgentStreamEvent =
  | {
      type: 'status';
      tool: string;
      message: string;
      icon: string;
      phase?: 'started' | 'progress' | 'completed';  // NEW
      details?: Record<string, unknown>;              // NEW
    }
  | {
      type: 'tool_call';  // NEW
      tool: 'search_documents' | 'collect_contact';
      phase: 'started' | 'executing' | 'completed' | 'error';
      metadata?: { query?: string; resultCount?: number };
    }
  | { type: 'sources'; sources: Document[] }
  | { type: 'content'; content: string }
  | { type: 'done'; metadata: AgentResponse['metadata'] }
  | { type: 'error'; error: string };
```

---

### Stream C: VectorStore

#### C-1: 싱글턴 패턴
```typescript
// src/services/vectorStore.ts
let instance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!instance) {
    instance = new VectorStore();
  }
  return instance;
}

export async function initVectorStore(): Promise<void> {
  const store = getVectorStore();
  await store.initialize();
}
```

---

### Stream D: Chat Handler

#### D-1: ChatService 분리
```typescript
// src/services/chatService.ts
export class ChatService {
  constructor(
    private personaAgent: PersonaAgentService,
    private conversationStore: ConversationStore,
    private conversationLimiter: ConversationLimiter,
    private contactService: ContactService,
  ) {}

  async *handleStreamChat(
    message: string,
    sessionId: string,
    clientIp: string
  ): AsyncGenerator<StreamEvent> {
    // chat.ts의 스트리밍 로직 이동
  }
}
```

#### D-2: chat.ts 슬림화
```typescript
// src/routes/chat.ts - 라우트만 정의
export async function chatRoutes(app: FastifyInstance) {
  const chatService = app.chatService;  // DI로 주입

  app.get('/chat/stream', async (request, reply) => {
    const { message, sessionId } = request.query;
    for await (const event of chatService.handleStreamChat(message, sessionId, request.ip)) {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  });
}
```

---

### Stream E: Server DI

#### E-1: DI 컨테이너
```typescript
// src/container.ts
export interface ServiceContainer {
  redis: IRedisClient;
  vectorStore: VectorStore;
  conversationStore: ConversationStore;
  conversationLimiter: ConversationLimiter;
  contactService: ContactService;
  chatService: ChatService;
}

export async function createContainer(): Promise<ServiceContainer> {
  const redis = createRedisClient(env.REDIS_URL);
  const vectorStore = getVectorStore();
  await vectorStore.initialize();

  // ... 의존성 조립

  return { redis, vectorStore, ... };
}
```

---

### Stream F: Frontend

#### F-1: StreamEvent 타입 확장
```typescript
// packages/dwkim/src/utils/personaApiClient.ts
export type StreamEvent =
  | { type: 'session'; sessionId: string }
  | {
      type: 'status';
      tool: string;
      message: string;
      icon: string;
      phase?: 'started' | 'progress' | 'completed';
      details?: Record<string, unknown>;
    }
  | {
      type: 'tool_call';
      tool: string;
      phase: 'started' | 'executing' | 'completed' | 'error';
      displayName: string;
      metadata?: Record<string, unknown>;
    }
  | { type: 'sources'; sources: Source[] }
  | { type: 'content'; content: string }
  | { type: 'done'; metadata: ChatMetadata }
  | { type: 'error'; error: string };
```

#### F-2: ChatView UI 개선
```typescript
// 도구 호출 추적 UI
{loadingState?.toolCalls?.map((tool) => (
  <Box key={tool.tool}>
    <Text color={theme.muted}>
      {tool.phase === 'completed' ? '✓' : '○'} {tool.displayName}
    </Text>
  </Box>
))}
```

---

## 실행 순서

```
Week 1:
├── [병렬] Stream A: env.ts + redis.ts
├── [병렬] Stream C: VectorStore 싱글턴
└── 검증: pnpm type-check && pnpm test

Week 2:
├── Stream B: PersonaAgent 타입 + A2UI
├── Stream E: Server DI (A, C 완료 후)
└── 검증: 로컬 테스트

Week 3:
├── Stream D: chat.ts → ChatService 분리
└── 검증: API 통합 테스트

Week 4:
├── Stream F: Frontend 타입 + UI
└── 검증: E2E 테스트, 배포
```

---

## 테스트 체크리스트

- [ ] Stream A: env.ts 환경변수 검증
- [ ] Stream A: Redis 폴백 (MemoryClient)
- [ ] Stream B: PersonaAgent 스트리밍
- [ ] Stream C: VectorStore 싱글턴 공유
- [ ] Stream D: ChatService 스트리밍
- [ ] Stream E: DI 컨테이너 조립
- [ ] Stream F: 새 이벤트 타입 렌더링

---

## 롤백 전략

각 Stream은 독립적으로 롤백 가능:
- Feature flag로 새 코드 비활성화
- 이전 커밋으로 개별 파일 복원
- 배포 전 staging 환경에서 검증
