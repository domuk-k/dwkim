---
title: "LLM 에이전트의 기본기: Planning, Memory, Tool"
description: "Lilian Weng의 이론적 프레임워크부터 Anthropic의 실전 패턴, deepagents 구현까지 — 에이전트 기술의 핵심 흐름"
pubDate: "2026-01-08"
---

# LLM 에이전트의 기본기: Planning, Memory, Tool

> 2023년에 정립된 프레임워크가 왜 아직도 유효한가

---

## 들어가며: LLM은 뇌일 뿐이다

ChatGPT가 나왔을 때 우리는 "AI가 모든 걸 할 수 있다"고 생각했다. 하지만 실제로 LLM에게 복잡한 작업을 시키면 금방 한계에 부딪힌다.

```
사용자: "우리 회사 코드베이스에서 보안 취약점을 찾아서 고쳐줘"
LLM: "네, 코드를 보여주시면 분석해드리겠습니다..."
```

문제는 명확하다:
- **계획을 못 세운다**: 한 번에 다 풀려고 하다가 실패
- **기억을 못 한다**: 컨텍스트 윈도우가 끝이다
- **행동을 못 한다**: 텍스트만 생성할 뿐, 실제로 뭘 "하지" 못함

LLM은 **뇌**일 뿐이다. 뇌만 있는 존재가 세상에서 일을 할 수 있을까?

---

## 프레임워크: Planning / Memory / Tool Use

Lilian Weng(OpenAI 연구원)의 [LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) 글은 이 문제에 대한 체계적인 프레임워크를 제시한다.

```
┌─────────────────────────────────────────────┐
│              Agent System                   │
│  ┌───────────────────────────────────────┐  │
│  │            LLM (Brain)                │  │
│  └───────────────────────────────────────┘  │
│        ↓            ↓            ↓          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │Planning │  │ Memory  │  │Tool Use │     │
│  └─────────┘  └─────────┘  └─────────┘     │
└─────────────────────────────────────────────┘
```

### 1. Planning: 큰 문제를 작은 단계로

인간도 복잡한 문제를 한 번에 풀지 않는다. 단계로 쪼갠다.

| 기법 | 핵심 아이디어 | 한 줄 설명 |
|------|-------------|-----------|
| **Chain-of-Thought (CoT)** | "단계별로 생각해보자" | 중간 추론 과정을 명시적으로 출력하며 답에 도달 |
| **Tree-of-Thoughts** | 여러 경로를 트리로 탐색 | 하나의 경로가 아닌 여러 가능성을 병렬로 탐색 |
| **ReAct** | 생각 ↔ 행동 반복 | "생각 → 도구 호출 → 결과 관찰 → 다시 생각" 루프 |
| **Reflexion** | 실패에서 배우기 | 이전 시도의 실패 원인을 분석하고 전략 수정 |

### 2. Memory: 단기 기억을 넘어서

LLM의 컨텍스트 윈도우는 "단기 기억"에 불과하다. 진짜 일을 하려면 "장기 기억"이 필요하다.

| 인간 메모리 | 에이전트 대응 | 설명 |
|------------|-------------|------|
| 단기 기억 | 컨텍스트 윈도우 | 현재 대화에서 볼 수 있는 범위 |
| 장기 기억 | 외부 벡터 DB | 대화 밖의 지식을 저장하고 검색 |

**RAG (Retrieval-Augmented Generation)**: 질문이 들어오면 관련 문서를 검색해서 컨텍스트에 주입하는 방식. "모르면 찾아보기"의 구현.

### 3. Tool Use: 세상과 상호작용

텍스트 생성만으로는 세상에 영향을 줄 수 없다. 도구가 필요하다.

```
LLM 혼자: "파일을 읽어야 합니다" (텍스트만 출력)
LLM + Tool: read_file("/src/main.ts") → 실제 파일 내용 반환
```

---

## 프레임워크의 진화: 2023 → 2025

2023년 에이전트 글 이후, Lilian Weng은 각 컴포넌트를 더 깊이 파고들었다. 이 프레임워크가 "정적인 이론"이 아니라 **계속 발전하는 연구**임을 보여준다.

```
2023.06 [Agent]          → 프레임워크 제시 (뭐가 필요한가)
           ↓
2024.07 [Hallucination]  → Memory/Tool의 한계 (어떻게 망가지는가)
           ↓
2025.05 [Why We Think]   → Planning의 심화 (어떻게 제대로 하는가)
```

### Memory/Tool의 한계 — Hallucination (2024)

[Extrinsic Hallucinations in LLMs](https://lilianweng.github.io/posts/2024-07-07-hallucination/)에서 외부 지식 접근의 근본적 문제를 다룬다.

> "모델은 새로운 지식 학습 시 hallucinate하는 경향이 증가한다"

RAG를 붙인다고 끝이 아니다:
- 검색 결과를 **검증**해야 함
- 모델이 **자기 지식의 한계**를 인식해야 함

### Planning의 심화 — Why We Think (2025)

[Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/)에서는 "생각한다는 것"의 본질을 파고든다.

**테스트 타임 컴퓨트**: 같은 모델이라도 추론 시점에 더 많이 "생각"하면 성능이 향상된다.

| 2023 Agent 글 | 2025 Thinking 글 |
|--------------|-----------------|
| 행동 경로(action trajectory) 계획 | 인지 경로(reasoning trajectory) 계획 |
| "무엇을 할지" 분해 | "어떻게 생각할지" 분해 |

**중요한 경고**:
> "단순히 '더 길게 생각하기'는 해결책이 아니다. **어떻게 올바르게 생각하는가**가 진정한 과제다."

---

## Anthropic의 실전 패턴: Workflow vs Agent

Weng의 글이 "무엇이 필요한가"를 정의했다면, Anthropic의 [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)는 "어떻게 조합하는가"를 다룬다.

### 핵심 구분: Workflow vs Agent

Anthropic은 두 가지를 명확히 구분한다:

| 구분 | Workflow | Agent |
|------|----------|-------|
| 정의 | LLM과 도구가 **미리 정해진 코드 경로**로 조율됨 | LLM이 **동적으로** 프로세스와 도구 사용을 지시 |
| 제어 | 개발자가 흐름을 설계 | LLM이 흐름을 결정 |
| 적합한 경우 | 예측 가능한 단계의 작업 | 예측 불가능한 개방형 문제 |

**중요한 철학**:
> "성공은 가장 정교한 시스템을 구축하는 것이 아니라, 필요에 맞는 올바른 시스템을 만드는 것이다."

### 5가지 Workflow 패턴

Anthropic이 제안하는 패턴들을 Weng 프레임워크와 매핑하면:

```
┌────────────────────┬─────────────────┬────────────────────────────┐
│ 패턴               │ 주요 컴포넌트    │ 사용 시나리오              │
├────────────────────┼─────────────────┼────────────────────────────┤
│ Prompt Chaining    │ Planning        │ 순차적 단계 (작성→번역)     │
│ Routing            │ Planning        │ 입력 분류 (고객문의 분류)   │
│ Parallelization    │ Planning+Tool   │ 독립 작업 동시 실행        │
│ Orchestrator-Worker│ Planning+Tool   │ 복잡한 작업 동적 분해       │
│ Evaluator-Optimizer│ Memory+Planning │ 피드백 루프 반복 개선       │
└────────────────────┴─────────────────┴────────────────────────────┘
```

### ACI: Agent-Computer Interface

Anthropic의 또 다른 핵심 인사이트:

> "도구 설계에 HCI(Human-Computer Interface)만큼의 노력을 투자하라"

**ACI 설계 원칙**:
1. 모델이 "생각할" 충분한 토큰 제공
2. 인터넷에서 자연스럽게 나타나는 포맷 사용
3. 포맷 오버헤드 제거 (라인 수 계산, 문자열 이스케이핑 등)
4. 실수를 어렵게 하도록 인자 설계 (Poka-yoke 원칙)

이건 Tool Use의 **품질**에 관한 이야기다. 도구가 있다고 끝이 아니라, 도구가 **LLM 친화적**이어야 한다.

### 단순성의 원칙

Anthropic이 반복해서 강조하는 것:

> "복잡성을 추가할 때는 오직 명확히 결과를 개선할 때만"

```
시작점: 단일 LLM + 기본 프롬프트
    ↓ (부족하면)
1단계: 프롬프트 체이닝
    ↓ (부족하면)
2단계: 라우팅/병렬화
    ↓ (부족하면)
3단계: 오케스트레이터-워커
    ↓ (정말 필요하면)
최종: 자율 에이전트
```

---

## 이론에서 구현으로: 지식의 흐름

여기까지의 내용을 정리하면:

```
Lilian Weng (2023)
"무엇이 필요한가" — 이론적 프레임워크
Planning / Memory / Tool Use
                ↓
Anthropic (2024)
"어떻게 조합하는가" — 실전 패턴
Workflow vs Agent, 5가지 패턴, ACI
                ↓
LangChain deepagents (2025)
"실제 코드로" — 구현체
Middleware, Tools, Sub-agents
```

이 흐름을 이해하면 새로운 에이전트 기술이 나와도 **어디에 해당하는지** 바로 파악할 수 있다.

---

## 구현: deepagents가 프레임워크를 코드로 옮긴 방법

[deepagents](https://github.com/langchain-ai/deepagents)는 LangChain 팀이 만든 오픈소스 에이전트 하네스다. Claude Code의 성공 패턴을 분석해서 만들었다.

이 프레임워크가 코드로 어떻게 구현되는지 보자.

### 에이전트 생성: 미들웨어 스택

```typescript
// deepagentsjs/src/agent.ts
export function createDeepAgent(params) {
  const middleware = [
    // Planning: 작업 계획 및 추적
    todoListMiddleware(),

    // Tool Use: 파일시스템 접근
    createFilesystemMiddleware({ backend: filesystemBackend }),

    // Planning + Tool: 서브에이전트 위임
    createSubAgentMiddleware({
      defaultModel: model,
      subagents,
      generalPurposeAgent: true,
    }),

    // Memory: 컨텍스트 관리
    summarizationMiddleware({
      model,
      trigger: { tokens: 170_000 },  // 토큰 한계 접근 시
      keep: { messages: 6 },          // 최근 6개 메시지 유지
    }),

    // 성능 최적화
    anthropicPromptCachingMiddleware(),
  ];

  return createAgent({ model, tools, middleware });
}
```

### Planning 구현: Todo List Middleware

```typescript
// 에이전트가 사용할 수 있는 도구
write_todos(todos)  // 작업 계획 작성
read_todos()        // 현재 작업 목록 확인
```

ReAct 패턴의 구현이다:
1. 목표를 받으면 → `write_todos`로 계획 작성
2. 각 단계 실행 → 완료되면 체크
3. 막히면 → 계획 수정

### Memory 구현: Summarization Middleware

```typescript
summarizationMiddleware({
  model,
  trigger: { tokens: 170_000 },  // 170K 토큰 접근 시 발동
  keep: { messages: 6 },          // 최근 6개는 원본 유지
})
```

컨텍스트가 너무 커지면:
1. 오래된 대화를 **요약**
2. 요약본 + 최근 메시지만 유지
3. → 장기 작업도 가능해짐

### Tool Use 구현: Filesystem Middleware

```typescript
// deepagentsjs/src/middleware/fs.ts
const tools = [
  createLsTool(backend),       // 디렉토리 목록
  createReadFileTool(backend), // 파일 읽기
  createWriteFileTool(backend),// 파일 쓰기
  createEditFileTool(backend), // 파일 수정
  createGlobTool(backend),     // 패턴 검색
  createGrepTool(backend),     // 내용 검색
];
```

Pluggable Backend 패턴:
- `StateBackend`: 메모리에 저장 (테스트용)
- `FilesystemBackend`: 실제 파일시스템
- `StoreBackend`: LangGraph Store (영속성)
- `CompositeBackend`: 여러 백엔드 조합

### 서브에이전트: Orchestrator-Worker 패턴의 구현

```typescript
// 복잡한 작업을 서브에이전트에게 위임
task({
  description: "React 컴포넌트에서 보안 취약점 분석",
  subagent_type: "security-reviewer"
})
```

왜 서브에이전트인가?
- **컨텍스트 격리**: 각 서브에이전트는 자기 작업에만 집중
- **병렬 실행**: 독립적인 작업은 동시에 실행
- **토큰 효율**: 메인 에이전트는 결과 요약만 받음

이건 Anthropic이 말한 **Orchestrator-Worker 패턴**의 직접적인 구현이다.

---

## 실제 동작: "보안 취약점 찾기" 시나리오

도입부의 예제로 돌아가보자. 에이전트가 실제로 어떻게 동작하는가?

```
사용자: "우리 회사 코드베이스에서 보안 취약점을 찾아서 고쳐줘"
```

### Step 1: Planning — 작업 분해

```typescript
// todoListMiddleware 동작
write_todos([
  "1. 코드베이스 구조 파악 (ls, glob)",
  "2. 보안 관련 파일 식별 (auth, api, input 처리)",
  "3. 각 영역별 취약점 분석",
  "4. 발견된 취약점 수정",
  "5. 수정 사항 검증"
])
```

에이전트는 한 번에 다 하려 하지 않는다. **먼저 계획을 세운다.**

### Step 2: Tool Use — 코드베이스 탐색

```typescript
// createFilesystemMiddleware 동작
ls("/src")                          // 디렉토리 구조 확인
glob("**/*.ts")                     // 모든 TypeScript 파일 찾기
grep("password|token|secret", "/src") // 민감한 키워드 검색
read_file("/src/auth/login.ts")     // 의심 파일 내용 확인
```

LLM이 "파일을 봐야겠다"고 생각하면 → **실제로 파일을 읽는다.**

### Step 3: Memory — 컨텍스트 관리

```typescript
// summarizationMiddleware 동작
// 토큰이 170K에 접근하면...
"auth 폴더 분석 완료: SQL injection 취약점 2건 발견 (login.ts:45, user.ts:112)"
// 상세 분석 내용은 요약되고, 핵심만 유지
```

수십 개 파일을 분석해도 **컨텍스트가 폭발하지 않는다.**

### Step 4: 서브에이전트 — 병렬 분석

```typescript
// createSubAgentMiddleware 동작
// 독립적인 분석을 병렬로 위임
task({ description: "auth 폴더 SQL injection 분석", subagent_type: "security-reviewer" })
task({ description: "api 폴더 XSS 취약점 분석", subagent_type: "security-reviewer" })
task({ description: "input validation 검토", subagent_type: "security-reviewer" })
```

각 서브에이전트는 **자기 영역만 깊이 분석**하고 결과를 반환한다.

### Step 5: 수정 및 완료

```typescript
edit_file("/src/auth/login.ts",
  "db.query(`SELECT * FROM users WHERE id = ${userId}`)",  // 취약한 코드
  "db.query('SELECT * FROM users WHERE id = ?', [userId])" // 수정된 코드
)
// todo 완료 체크
```

### 전체 흐름

```
┌─────────────────────────────────────────────────────────────┐
│  "보안 취약점 찾아서 고쳐줘"                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Planning: 작업을 5단계로 분해                              │
│  → todoListMiddleware                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Tool: 파일 탐색 및 분석                                    │
│  → ls, glob, grep, read_file                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Memory: 분석 결과 요약, 컨텍스트 유지                      │
│  → summarizationMiddleware                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  서브에이전트: 영역별 병렬 심층 분석 (Orchestrator-Worker)  │
│  → task() 병렬 호출                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Tool: 취약점 수정                                          │
│  → edit_file                                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ✅ 작업 완료
```

이게 **Planning + Memory + Tool**이 함께 동작하는 모습이다.

---

## 시사점: 에이전트를 설계할 때 생각할 것

### 1. 진단 도구로 활용하라

에이전트가 이상하게 동작할 때:

```
"이건 Planning 문제인가? Memory 문제인가? Tool 문제인가?"
```

| 증상 | 가능한 원인 | 해결책 |
|------|-----------|-------|
| 계획 없이 무작정 시작 | Planning 부재 | Todo list, 단계 분해 |
| 예전에 한 얘기 반복 | Memory 한계 | Summarization, RAG |
| "할 수 없습니다" 반복 | Tool 부족 | 필요한 도구 추가 |
| 중간에 방향 잃음 | Self-reflection 부재 | ReAct, Reflexion 패턴 |
| 도구 호출 실패 | ACI 문제 | 도구 인터페이스 개선 |

### 2. 단순하게 시작하라

Anthropic의 조언:
> "에이전트 시스템을 구축할 때, 간단함을 유지하고 필요할 때만 복잡성을 추가하라."

처음부터 복잡한 멀티에이전트 시스템을 만들지 마라:
1. 단일 LLM + 좋은 프롬프트로 시작
2. 안 되면 → 프롬프트 체이닝
3. 그래도 안 되면 → 도구 추가
4. 서브에이전트는 정말 필요할 때만

### 3. Workflow vs Agent 구분하라

모든 문제에 자율 에이전트가 필요한 건 아니다:

| 상황 | 추천 |
|------|------|
| 단계가 예측 가능 | Workflow (Prompt Chaining) |
| 분기가 명확 | Workflow (Routing) |
| 독립 작업 여러 개 | Workflow (Parallelization) |
| 단계가 예측 불가 | Agent |
| 오류 복구 필요 | Agent |

### 4. 컴포넌트별로 개선하라

프레임워크의 힘은 **모듈화**에 있다:

```
Planning이 약하다 → CoT 프롬프트 개선, Todo 도구 추가
Memory가 부족하다 → RAG 붙이기, 요약 전략 조정
Tool이 부족하다 → MCP 서버 연결, 커스텀 도구 추가
Tool이 안 먹힌다 → ACI 개선 (인터페이스 단순화)
```

각 컴포넌트를 독립적으로 테스트하고 개선할 수 있다.

---

## 마치며

LLM 에이전트는 마법이 아니다. **뇌(LLM) + 계획(Planning) + 기억(Memory) + 행동(Tool)**의 조합이다.

이 프레임워크를 알면:
- 새로운 에이전트 기술이 나와도 "이건 어떤 컴포넌트의 혁신인가?"로 평가할 수 있다
- 에이전트가 실패할 때 "어디서 문제인가?"를 진단할 수 있다
- 자신만의 에이전트를 설계할 때 체계적으로 접근할 수 있다
- Workflow로 충분한지, Agent가 필요한지 판단할 수 있다

결국 좋은 에이전트는 좋은 시스템 설계다. 그리고 좋은 시스템은 **필요한 만큼만 복잡하다**.

---

## 참고 자료

### 핵심 레퍼런스

| 출처 | 글 | 핵심 기여 |
|------|---|----------|
| Lilian Weng (OpenAI) | [LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) (2023) | 프레임워크 정의 |
| Lilian Weng (OpenAI) | [Extrinsic Hallucinations](https://lilianweng.github.io/posts/2024-07-07-hallucination/) (2024) | Memory/Tool 한계 |
| Lilian Weng (OpenAI) | [Why We Think](https://lilianweng.github.io/posts/2025-05-01-thinking/) (2025) | Planning 심화 |
| Anthropic | [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) (2024) | 실전 패턴 |
| LangChain | [Deep Agents](https://blog.langchain.com/deep-agents/) (2025) | 구현 분석 |

### 구현체

- [deepagents (Python)](https://github.com/langchain-ai/deepagents)
- [deepagents-js (TypeScript)](https://github.com/langchain-ai/deepagentsjs)

### 추가 읽을거리

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)
- [Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
