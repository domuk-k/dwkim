# Persona API 리팩토링 계획

## 현재 구조 요약

### 디렉토리 구조
```
persona-api/
├── src/
│   ├── index.ts              # 엔트리 포인트
│   ├── server.ts             # Fastify 서버 설정
│   ├── routes/
│   │   ├── chat.ts           # 채팅 API (주요 엔드포인트)
│   │   ├── health.ts         # 헬스체크
│   │   └── sync.ts           # Cogni 노트 동기화
│   ├── services/
│   │   ├── personaAgent.ts   # DeepAgents 기반 에이전트
│   │   ├── ragEngine.ts      # RAG 엔진 (폴백)
│   │   ├── llmService.ts     # LLM 추상화 (OpenRouter/Gemini)
│   │   ├── vectorStore.ts    # Qdrant 벡터 스토어
│   │   ├── voyageEmbeddings.ts # Voyage AI 임베딩
│   │   ├── conversationStore.ts # 대화 히스토리
│   │   ├── conversationLimiter.ts # 대화 제한
│   │   ├── contactService.ts  # 연락처 수집
│   │   └── chatLogger.ts     # 채팅 로깅
│   ├── middleware/
│   │   ├── rateLimit.ts      # Rate Limiting (Redis)
│   │   └── abuseDetection.ts # 악용 탐지 (Redis)
│   └── schemas/
│       └── chat.ts           # Zod 스키마 (미사용)
└── scripts/                  # 초기화 스크립트
```

## 우선순위별 리팩토링

### Phase 1: 즉시 개선 (간단)

| 작업 | 예상 시간 |
|------|----------|
| 테스트 디렉토리 정리 (`tests/` → `__tests__/`) | 30분 |
| 미사용 스키마 정리 | 30분 |
| 환경변수 검증 모듈 (`src/config/env.ts`) | 1시간 |

### Phase 2: 타입 안전성 (중간)

| 작업 | 예상 시간 |
|------|----------|
| PersonaAgent `any` 타입 제거 | 2일 |
| Redis 클라이언트 추상화 (IRedisClient) | 1일 |
| 서비스 DI 컨테이너 도입 | 2일 |

### Phase 3: 아키텍처 개선 (복잡)

| 작업 | 예상 시간 |
|------|----------|
| VectorStore 싱글턴화 | 1일 |
| chat.ts 핸들러 → ChatService 분리 | 2-3일 |
| RAGEngine/PersonaAgent 통합 검토 | 3-5일 |

### Phase 4: 테스트 (복잡)

| 작업 | 예상 시간 |
|------|----------|
| 서비스 유닛 테스트 (llm, vectorStore, conversation) | 1주 |
| Docker Compose 통합 테스트 환경 | 3일 |

## 주요 문제점

1. **`any` 타입 남용** - 6곳 이상 eslint-disable 사용
2. **VectorStore 중복 인스턴스** - personaAgent, ragEngine, sync에서 각각 생성
3. **chat.ts 비대화** - 700줄, 핸들러 로직 분리 필요
4. **테스트 부족** - chat.test.ts만 존재 (4개 테스트)

## Critical Files

1. `src/server.ts` - Redis 초기화 및 DI 개선
2. `src/services/personaAgent.ts` - 타입 안전성 개선
3. `src/services/vectorStore.ts` - 싱글턴화
4. `src/routes/chat.ts` - 핸들러 분리
