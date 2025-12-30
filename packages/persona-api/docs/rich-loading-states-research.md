# Rich Loading States 리서치: 에이전트 진행 상태 표시

> 작성일: 2025-12-30
> 목적: "검색중", "생성중" 보다 더 풍부한 에이전트 상태 표시 방법 조사

---

## 1. 현재 문제

```
현재 UX:
User: "dwkim의 경력이 궁금해요"
Bot: [로딩 스피너] "생성중..."  ← 뭘 하고 있는지 모름
Bot: "dwkim은 10년차 개발자로..."
```

**개선 목표:**
```
User: "dwkim의 경력이 궁금해요"
Bot: 🔍 "이력서에서 경력 정보 검색 중..."
Bot: 📄 "3개의 관련 문서 발견"
Bot: ✍️ "답변 작성 중..."
Bot: "dwkim은 10년차 개발자로..."
```

---

## 2. 업계 표준 프로토콜

### 2.1 AG-UI (CopilotKit)

[AG-UI](https://www.copilotkit.ai/blog/master-the-17-ag-ui-event-types-for-building-agents-the-right-way)는 17개의 표준 이벤트 타입을 정의:

#### Tool Call Events (핵심)

| 이벤트 | 용도 | 페이로드 |
|--------|------|----------|
| `TOOL_CALL_START` | 도구 실행 시작 | `tool_call_id`, `tool_name` |
| `TOOL_CALL_ARGS` | 도구 인자 스트리밍 | `delta` (부분 데이터) |
| `TOOL_CALL_END` | 도구 실행 완료 | - |
| `TOOL_CALL_RESULT` | 도구 결과 | `content` |

#### 예시 흐름

```
TOOL_CALL_START  { tool_name: "search_documents", tool_call_id: "call_1" }
TOOL_CALL_ARGS   { delta: '{"query": "경력"' }
TOOL_CALL_ARGS   { delta: '}' }
TOOL_CALL_END    { tool_call_id: "call_1" }
TOOL_CALL_RESULT { content: "[이력서] 10년차 풀스택..." }
```

### 2.2 LangGraph Streaming Modes

[LangGraph](https://dev.to/sreeni5018/langgraph-streaming-101-5-modes-to-build-responsive-ai-applications-4p3f)는 5가지 스트리밍 모드 제공:

| 모드 | 용도 | 데이터 |
|------|------|--------|
| `values` | 전체 상태 스냅샷 | 매 노드 실행 후 전체 상태 |
| `updates` | 상태 변경분 | 델타만 전송 |
| `messages` | 토큰 스트리밍 | LLM 출력 토큰 |
| `custom` | 커스텀 이벤트 | 도구 진행 상태 등 |
| `debug` | 디버그 정보 | 전체 실행 트레이스 |

#### Custom Mode 예시

```python
def search_node(state, writer: StreamWriter):
    writer.write({
        'type': 'tool_status',
        'tool': 'search_documents',
        'status': 'searching',
        'message': '이력서에서 검색 중...'
    })

    results = vector_store.search(state.query)

    writer.write({
        'type': 'tool_status',
        'tool': 'search_documents',
        'status': 'complete',
        'message': f'{len(results)}개 문서 발견'
    })

    return {"results": results}
```

---

## 3. Persona-API 적용 방안

### Option A: AG-UI 호환 이벤트

AG-UI 표준을 따르면 CopilotKit 등 기존 프론트엔드와 호환:

```typescript
// SSE 스트림 이벤트 타입
type StreamEvent =
  | { type: 'RUN_STARTED'; run_id: string }
  | { type: 'TOOL_CALL_START'; tool_name: string; tool_call_id: string }
  | { type: 'TOOL_CALL_END'; tool_call_id: string }
  | { type: 'TEXT_MESSAGE_CONTENT'; delta: string }
  | { type: 'RUN_FINISHED' };
```

**장점:** 표준 호환, 생태계 활용
**단점:** 복잡한 구현

### Option B: 간소화된 커스텀 이벤트 (추천)

```typescript
// 간단한 진행 상태 이벤트
type StreamEvent =
  | { type: 'status'; tool?: string; message: string; icon?: string }
  | { type: 'sources'; documents: Document[] }
  | { type: 'content'; delta: string }
  | { type: 'done'; metadata: ResponseMetadata };
```

**예시 구현:**

```typescript
// personaAgent.ts - queryPersonaStream 수정
export async function* queryPersonaStream(message: string, sessionId?: string) {
  yield { type: 'status', tool: 'search', message: '관련 문서 검색 중...', icon: '🔍' };

  const sources = await vectorStore.searchDiverse(message, 5);

  yield {
    type: 'status',
    tool: 'search',
    message: `${sources.length}개 문서 발견`,
    icon: '📄'
  };
  yield { type: 'sources', documents: sources };

  yield { type: 'status', tool: 'generate', message: '답변 생성 중...', icon: '✍️' };

  // LLM 스트리밍
  for await (const chunk of agent.stream(...)) {
    yield { type: 'content', delta: chunk };
  }

  yield { type: 'done', metadata: { ... } };
}
```

### Option C: 도구별 상세 상태

```typescript
interface ToolStatus {
  type: 'tool_status';
  tool: {
    name: string;
    displayName: string;  // 한글
    icon: string;
  };
  phase: 'started' | 'progress' | 'completed' | 'error';
  progress?: number;  // 0-100
  message: string;
  details?: unknown;
}

// 사용 예시
yield {
  type: 'tool_status',
  tool: { name: 'search_documents', displayName: '문서 검색', icon: '🔍' },
  phase: 'progress',
  progress: 50,
  message: '벡터 DB 쿼리 중...',
};
```

---

## 4. 프론트엔드 UX 예시

### 4.1 단계별 표시

```
┌────────────────────────────────────────┐
│ 🔍 문서 검색                      ✓    │
│    └─ 3개 관련 문서 발견              │
│                                        │
│ ✍️ 답변 생성                      ...  │
│    └─ dwkim은 10년차 개발자로...      │
└────────────────────────────────────────┘
```

### 4.2 진행 바

```
┌────────────────────────────────────────┐
│ 🤖 AI가 답변을 준비하고 있어요         │
│                                        │
│ [████████████░░░░░░░░] 60%            │
│                                        │
│ 📄 검색 완료 → ✍️ 답변 작성 중         │
└────────────────────────────────────────┘
```

### 4.3 도구 카드

```
┌────────────────────────────────────────┐
│ 🛠️ 사용 중인 도구                      │
├────────────────────────────────────────┤
│ 🔍 search_documents                    │
│    쿼리: "경력"                        │
│    결과: 3개 문서                      │
│    상태: ✅ 완료                       │
├────────────────────────────────────────┤
│ ✍️ generate_response                   │
│    상태: ⏳ 진행 중...                 │
└────────────────────────────────────────┘
```

---

## 5. 구현 우선순위

### Phase 1: 기본 상태 (즉시 적용 가능)

```typescript
// 현재 스트림에 status 이벤트 추가
yield { type: 'status', message: '🔍 검색 중...' };
yield { type: 'sources', ... };
yield { type: 'status', message: '✍️ 답변 생성 중...' };
yield { type: 'content', ... };
```

### Phase 2: 도구별 상태

```typescript
yield {
  type: 'tool_status',
  tool: 'search_documents',
  phase: 'started',
  displayName: '문서 검색'
};
```

### Phase 3: AG-UI 호환 (선택적)

프론트엔드가 CopilotKit 등 사용 시 마이그레이션.

---

## 6. 결론

| 옵션 | 복잡도 | 호환성 | 추천도 |
|------|--------|--------|--------|
| AG-UI 표준 | 높음 | 생태계 호환 | ⭐⭐⭐ |
| **간소화 커스텀** | 낮음 | 자체 정의 | ⭐⭐⭐⭐⭐ |
| 도구별 상세 | 중간 | 확장 가능 | ⭐⭐⭐⭐ |

**추천:** Option B (간소화 커스텀) 먼저 구현 → 필요시 AG-UI로 확장

---

## 참고 자료

- [AG-UI Event Types](https://www.copilotkit.ai/blog/master-the-17-ag-ui-event-types-for-building-agents-the-right-way)
- [LangGraph Streaming 101](https://dev.to/sreeni5018/langgraph-streaming-101-5-modes-to-build-responsive-ai-applications-4p3f)
- [CopilotKit AG-UI Protocol](https://www.copilotkit.ai/blog/ag-ui-protocol-bridging-agents-to-any-front-end)
- [LangGraph Custom Streaming](https://langchain-ai.github.io/langgraph/how-tos/disable-streaming/)
