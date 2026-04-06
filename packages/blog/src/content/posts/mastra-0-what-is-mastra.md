---
title: "Mastra Deep Dive #0: 28개 패키지, 7가지 기둥 — Mastra가 풀려는 문제"
description: "TypeScript로 AI 앱을 만들 때 결국 직접 짜게 되는 것들이 있다. Mastra는 그걸 풀려고 만들어졌다. 7가지 기둥으로 해부한다."
pubDate: "2026-04-06"
series: "mastra-deep-dive"
tags: [mastra, typescript, ai-framework, agent, workflow]
---

# 결국 직접 짜게 되는 것들

> 프레임워크를 고르는 건 기술적 판단이 아니라 생태계에 대한 베팅이다.

---

## 에이전트를 만들다 보면 생기는 일

TypeScript로 AI 에이전트를 만들어 본 사람이라면 이 흐름을 알 거다.

처음엔 Vercel AI SDK로 `streamText()` 하나 호출하면 끝난다. 챗봇 하나 만드는 데 프레임워크가 필요하진 않으니까.

그런데 요구사항이 쌓인다. Step을 나눠서 순서대로 실행해야 한다. 중간에 사람 승인을 받아야 한다. 실패하면 특정 지점부터 재실행해야 한다. 실행 상태를 DB에 저장해야 한다. 여러 모델을 갈아끼울 수 있어야 한다.

한두 개는 직접 짜면 된다. 그런데 이게 다섯 개, 일곱 개가 되면 — 어느 순간 에이전트 인프라를 만들고 있는 자신을 발견한다. 제품이 아니라 프레임워크를.

Python에서는 LangGraph가 이 문제를 풀었다. StateGraph에 Node와 Edge를 선언하고, Checkpointer로 상태를 스냅샷하고, interrupt로 HITL을 건다. LangGraph.js도 있고 빠르게 발전하고 있지만, 핵심 개발이 Python에서 일어나는 구조라 TS 생태계(Zod, Vercel AI SDK, npm 플러그인)와의 결합이 느슨한 편이다.

Mastra는 이 자리를 노리고 나온 프로젝트다.

---

## "Python trains, TypeScript ships."

Mastra 랜딩 페이지에 이 문구가 있다. 도발적이지만, 나름 정확한 포지셔닝이다.

AI 연구와 학습의 중심은 Python이다. PyTorch, Jupyter, HuggingFace — 모델을 만들고 실험하는 건 Python 세상이다. 하지만 그 모델을 **제품으로 만들어서 유저에게 전달하는** 레이어에서는? 프론트엔드, API 서버, 실시간 스트리밍, 배포 파이프라인 — 여기는 TypeScript가 지배하는 영역이다.

Mastra는 이 "ships" 레이어의 프레임워크다. 모델을 학습시키는 게 아니라, 학습된 모델을 엮어서 프로덕션 AI 앱을 만드는 도구.

Gatsby 창업팀(Sam Bhagwat, Abhi Aiyer, Shane Thomas)이 Netlify 매각 후 다시 모여서 만들었다. YC W25, $13M 시드. GitHub 22.3k+ 스타, npm 주간 300k+ 다운로드, 커밋 13,730개. `@mastra/core`는 v1.23까지 올라왔고, 주 1-2회 릴리즈. Vercel AI SDK 위에 구축되었다.

Apache 2.0(core) + Enterprise(ee/). 자체 AI 제품을 만드는 건 자유.

---

## 7가지 기둥

Mastra를 이해하는 가장 빠른 방법은 7가지 기둥을 보는 것이다.

### 1. Model Routing — 문자열 하나로 모델 스위칭

40개 이상의 프로바이더, 600개 이상의 모델을 문자열 하나로 갈아끼운다.

```typescript
const agent = new Agent({
  model: "anthropic/claude-sonnet-4-5",
  // model: "openai/gpt-4o",
  // model: "google/gemini-2.5-pro",
});
```

프로바이더별 SDK를 갈아끼우는 게 아니라, 문자열만 바꾸면 된다. 프로덕션에서 모델 A/B 테스트를 돌릴 때 이 차이가 체감된다.

### 2. Agents — Processor 파이프라인이 핵심

Agent = LLM + instructions + tools + memory + **Processor pipeline**. 독립적인 엔티티다.

Processor가 재밌다. Agent의 입출력을 5단계 미들웨어로 가공한다:

```
processInput → processInputStep → processOutputStream
                                    → processOutputStep → processOutputResult
```

토큰 제한, 콘텐츠 검열, PII 탐지, 프롬프트 인젝션 방어 — 전부 Processor로 꽂힌다. Express 미들웨어를 떠올리면 된다. 빌트인 ~14개에 커스텀을 얹는 구조.

### 3. Workflows — 체이닝으로 선언하는 실행 흐름

```typescript
const workflow = createWorkflow({ name: "review-pipeline" })
  .then(classifyStep)
  .branch([
    [({ result }) => result.type === "simple", directResponse],
    [({ result }) => result.type === "complex", deepAnalysis],
  ])
  .then(generateReport);
```

`.then()`, `.branch()`, `.parallel()`, `.loop()` — 고수준 프리미티브가 내장되어 있다. 분기, 병렬, 반복을 low-level로 직접 짜지 않아도 된다. 3가지 실행 엔진(인메모리, 이벤트 드리븐, Inngest 기반 durable execution)을 선택할 수 있다.

### 4. Human-in-the-Loop — suspend/resume

워크플로우 중간에 사람 승인이 필요하면 `suspend()`로 멈추고, 나중에 `resume()`으로 재개한다.

```typescript
const reviewStep = createStep({
  id: "human-review",
  execute: async ({ context, suspend }) => {
    const draft = context.getStepResult("generate");
    await suspend({ agentOutput: draft });
    // resume되면 여기서 계속
    const feedback = context.resumePayload;
    return applyFeedback(draft, feedback);
  },
});
```

suspend metadata를 스냅샷에 같이 저장해서, 서버가 재시작되어도 중단 지점에서 정확히 재개할 수 있다. 이게 "durable" HITL이다.

### 5. Context Management — 실행 상태의 중앙 저장소

`ExecutionContext`가 워크플로우 실행 중 모든 상태를 들고 다닌다 — step 결과, tool progress, HITL 메타데이터. Storage를 통해 persist되고, 장애 복구나 재실행 시 여기서 상태를 복원한다.

### 6. MCP — 도구의 표준 프로토콜

Model Context Protocol 클라이언트와 서버를 **양쪽 다** 내장한다. 외부 MCP 서버의 도구를 가져다 쓸 수도 있고, 반대로 Mastra의 Agent/Tool/Workflow를 MCP 프로토콜로 노출할 수도 있다. 일급 시민(first-class citizen)이다.

### 7. Evals & Observability — 평가하고 관찰하기

OpenTelemetry 기반. Langfuse, Langsmith, Datadog 등 9개 이상의 벤더와 통합. LLM 스코어러와 NLP 스코어러로 에이전트 품질을 정량 평가한다. 로컬에서 돌아가는 오픈소스 DevTools인 Mastra Studio가 포함된다.

---

## LangGraph를 쓰던 사람이라면

LangGraph를 써본 사람이라면 Mastra의 개념 대부분이 익숙할 거다. 같은 문제를 다른 방식으로 풀고 있을 뿐이니까.

| 개념 | LangGraph | Mastra |
|---|---|---|
| 실행 흐름 | StateGraph + Node + Edge | `.then()` `.branch()` `.parallel()` 체이닝 |
| 상태 저장 | Checkpointer | `persistSnapshot` / `loadSnapshot` |
| 사람 개입 | `interrupt()` + `Command(resume)` | `suspend()` / `resume()` |
| 런타임 상태 | `AgentState` | `ExecutionContext` |
| 메모리 | LangMem, 커뮤니티 통합 | 내장 3계층 (Working/Observational/Semantic) |
| 도구 프로토콜 | 커뮤니티 MCP 통합 | MCP 클라이언트+서버 내장 |
| DevTools | LangSmith (SaaS, 무료 티어 있음) | Mastra Studio (로컬 OSS) |
| 성숙도 | 높음 (수년, 대규모 커뮤니티) | 성장 중 (1년+, 빠른 릴리즈) |
| 비LLM 로직 | 유연 (그래프에 아무 노드) | LLM-first 설계, 결정적 로직 혼합 시 마찰 |

두 프레임워크의 근본적인 차이는 **범위**다. LangGraph는 그래프 실행 엔진 하나를 정교하게 만들겠다는 철학. Mastra는 TS로 AI 앱을 만들 때 필요한 전체 스택을 주겠다는 철학. 풀려는 문제의 크기가 다르다.

Python 팀이라면, ML 파이프라인과 에이전트가 같은 언어에 있어야 한다면, LangGraph가 여전히 최선이다. 성숙도, 커뮤니티, 레퍼런스 — 전부 앞선다.

하지만 TS 스택에서 프로덕션 AI 앱을 만드는 팀이라면, 이제 선택지가 하나 더 생겼다는 것. 그게 Mastra의 포지션이다.

---

## 그럼 약점은?

공정하게 가려면 이것도 써야 한다.

**`@mastra/core` 강결합.** 28개 패키지 전부가 `@mastra/core`를 peer dependency로 물고 있다. memory만, 또는 MCP만 떼어 쓸 수 없다. core를 들이는 순간 Mastra의 설계 철학을 함께 사는 거다.

**LLM-first 설계의 한계.** HN에서 반복적으로 나온 비판이 있다 — "프로덕션 에이전트의 90%는 결정적 로직이고 LLM은 10%인데, Mastra는 LLM-first라 결정적 로직과 섞기가 불편하다." 맞는 말이다. 비LLM 로직이 주인 파이프라인에는 Mastra가 오히려 무거울 수 있다.

**스타트업 리스크.** YC W25, $13M 시드. 활발하지만 젊다. 같은 팀이 만든 Gatsby가 Netlify에 매각된 후 사실상 방치된 전례가 있다. Mastra Cloud(수익화)는 아직 초기고, 가격도 미정이다. 5년 뒤에도 유지되고 있을 거라는 보장은 없다.

**성숙도 격차.** LangGraph는 Python 생태계에서 수년간 쌓인 프로덕션 레퍼런스와 커뮤니티가 있다. Mastra는 아직 그 단계가 아니다. 엔터프라이즈 사례(Replit, PayPal 등)가 나오고 있지만, "검증된" 수준이라고 하기엔 이르다.

이런 리스크를 알고도 쓰고 있다. 그래서 다음 섹션이 의미가 있다.

---

## 우리는 어떻게 쓰고 있나

직접 프로덕션에서 Mastra를 쓰고 있다. 솔직한 수치를 공유하면:

- **API surface 활용률**: ~15-20%. 28개 패키지 중 5개, 47개 subpath 중 7개만 사용.
- **핵심 사용 영역**: Workflow 오케스트레이션 + suspend/resume(HITL) + Storage + Processor 파이프라인.
- **안 쓰는 80%**: 대부분 "안 써야 맞는 것" — editor, server, voice, RAG 등 우리 도메인에 불필요한 모듈.

즉, **프레임워크를 라이브러리처럼 쓰고 있다**.

필요한 계층만 가져다 쓰고, 나머지는 직접 만든다. Mastra의 Workflow 엔진 위에 우리만의 HITL 3-way 라우팅(approve/reject/execute)을 얹었고, 9개의 커스텀 Processor를 만들었고, MCP 멀티커넥션 관리는 자체 구현했다.

이게 가능한 이유가 있다. Mastra의 `@mastra/core`가 subpath exports (`"./*"` 와일드카드)로 모듈별 소비를 지원하기 때문이다. 패키지는 하나지만, 필요한 모듈만 골라서 import할 수 있다.

```typescript
// 전부 같은 @mastra/core에서 오지만, 필요한 것만 가져다 쓴다
import { createWorkflow } from "@mastra/core/workflows";
import { createStep } from "@mastra/core/workflows";
import { createTool } from "@mastra/core/tools";
import type { Processor } from "@mastra/core/agent";
```

---

## 다음 글에서

이 시리즈는 Mastra를 레벨별로 해부한다.

- **L1**: `@mastra/core` 47개 모듈이 한 패키지에 사는 이유
- **L2**: 5대 프리미티브 — createStep, Agent, createTool, Processor, Mastra
- **L3**: `run()` 한 줄이 만드는 여정 — 실행 흐름 완전 추적
- **L4**: Studio(Editor) 아키텍처 — Agent Builder의 백엔드
- **L5**: 프레임워크를 라이브러리처럼 쓰는 법 — 브릿지 감사

워크플로우 엔진의 내부가 궁금하다면 L3부터 읽어도 좋다.

---

*이 시리즈는 Mastra v1.23 기준으로 작성되었습니다. Mastra는 주 1-2회 릴리즈하는 활발한 프로젝트라, 세부 API는 바뀔 수 있습니다.*
