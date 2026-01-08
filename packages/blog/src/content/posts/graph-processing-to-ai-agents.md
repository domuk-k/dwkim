---
title: "왜 대규모 그래프 처리 시스템이 AI 에이전트가 되었을까"
description: "Google Pregel(2010)과 LangGraph의 연결고리. 그래프 처리와 AI 에이전트가 공유하는 설계 원칙을 코드 증거와 함께 살펴본다."
pubDate: "2026-01-04"
---

# 왜 대규모 그래프 처리 시스템이 AI 에이전트가 되었을까

> 시리즈: BSP에서 AI 에이전트까지 (2/N)
> 이전 글: [DeepAgents는 왜 이렇게 생겼을까?](/posts/bsp-parallel-model/)

---

## 질문에서 시작했다

LangGraph 코드를 읽다가 이상한 이름을 발견했다.

```
Pregel
```

검색했다. 2010년 Google 논문이 나왔다. **"Pregel: A System for Large-Scale Graph Processing"**. 수십억 개의 노드와 수조 개의 엣지를 처리하기 위한 시스템이었다.

질문이 생겼다.

> "왜 AI 에이전트 프레임워크가 14년 전 그래프 처리 시스템의 이름을 쓰고 있지?"

파고들었다. 답은 예상보다 명확했다.

---

## 공통점: 둘 다 같은 문제를 푼다

표면적으로 그래프 처리 시스템과 AI 에이전트 시스템은 전혀 달라 보인다. 하나는 PageRank를 계산하고, 다른 하나는 LLM이 도구를 호출한다.

하지만 본질적인 문제는 동일하다.

| 문제 | Google Pregel | LangGraph |
|------|---------------|-----------|
| **노드가 독립적으로 계산** | 각 정점이 자신의 값을 계산 | 각 에이전트가 자신의 작업을 수행 |
| **메시지로 통신** | 정점 간 메시지 전달 | 에이전트 간 상태 공유 |
| **동기화가 필요** | 다음 단계 전 결과 병합 | 병렬 도구 실행 후 결과 병합 |

세 가지 문제가 같으면, 해법도 같을 수 있다.

---

## Google Pregel의 핵심 아이디어

2010년 논문의 핵심은 **BSP(Bulk Synchronous Parallel)** 모델이다. 1990년 Leslie Valiant가 제안한 병렬 컴퓨팅 패러다임.

### Superstep

Pregel은 계산을 **superstep** 단위로 나눈다.

```
Superstep 0 → Barrier → Superstep 1 → Barrier → Superstep 2 → ...
```

각 superstep에서:
1. 모든 노드가 **병렬로** 계산한다
2. 노드는 다른 노드에게 **메시지를 보낸다**
3. **Barrier**에서 모든 노드가 동기화된다
4. 다음 superstep에서 메시지를 받아 처리한다

이 모델의 장점은 **결정론적 실행**이다. 같은 입력이면 같은 결과가 나온다. 디버깅이 가능하다. 재현이 가능하다.

### 왜 MapReduce가 아닌가

Google에는 MapReduce가 있었다. 왜 Pregel을 만들었을까?

논문의 답은 명확하다:

> "MapReduce는 본질적으로 함수형이라, 그래프 알고리즘을 표현하려면 전체 그래프 상태를 단계마다 전달해야 한다."

그래프는 **상태가 있다**. 노드는 이전 단계의 결과를 기억해야 한다. MapReduce의 stateless 모델과 맞지 않았다.

---

## LangGraph가 Pregel을 선택한 이유

AI 에이전트도 같은 문제를 가진다.

### 1. 에이전트는 그래프다

```
[사용자 입력] → [계획 노드] → [도구 A] → [결과 병합] → [응답]
                          ↘ [도구 B] ↗
```

노드는 에이전트나 도구다. 엣지는 실행 흐름이다. 구조가 그래프다.

### 2. 병렬 실행 후 동기화

여러 도구를 동시에 호출하면? 결과를 모아서 다음 단계로 넘겨야 한다. 정확히 Pregel의 superstep-barrier 패턴이다.

### 3. 디버깅과 재현성

AI 에이전트의 가장 큰 문제 중 하나는 디버깅이다. "왜 이런 결과가 나왔지?"

Pregel의 결정론적 실행 모델은 이 문제를 완화한다:
- 각 superstep의 상태를 저장할 수 있다
- 특정 시점으로 돌아가 재실행할 수 있다
- 실패한 superstep만 복구할 수 있다

---

## 코드 증거

### 문서에서

LangGraph 공식 문서:

> "Pregel organizes the execution of the application into multiple steps, following the Pregel Algorithm/Bulk Synchronous Parallel model."

API 레퍼런스:

> "The Pregel class is the core runtime engine of LangGraph, implementing a message-passing graph computation model inspired by Google's Pregel system."

### 소스코드에서

LangGraph 소스코드를 열어보면 BSP 용어가 그대로 살아있다.

```typescript
// langgraph-core/src/pregel/loop.ts:703
if (Object.values(this.tasks).every((task) => task.writes.length > 0)) {
  // finish superstep
  const writes = Object.values(this.tasks).flatMap((t) => t.writes);
  this.updatedChannels = _applyWrites(/* ... */);
}
```

`// finish superstep` — 주석에 BSP 용어가 그대로 있다.

```typescript
// langgraph-core/src/pregel/runner.ts:31
function createPromiseBarrier() {
  const barrier = {
    next: () => void 0,
    wait: Promise.resolve(PROMISE_ADDED_SYMBOL),
  };
}
```

`createPromiseBarrier()` — Barrier 개념을 JavaScript Promise로 구현했다.

우연이 아니다. 의도적인 설계다.

---

## Superstep의 트랜잭션 특성

LangGraph의 superstep은 **트랜잭션**이다.

> "If any node within a parallel branch raises an exception, none of the updates from that super-step are applied to the state."

All-or-nothing. 병렬 브랜치 중 하나가 실패하면, 해당 superstep의 모든 변경이 롤백된다. 상태 일관성이 보장된다.

이것이 AI 에이전트에서 중요한 이유:
- 도구 A는 성공했는데 도구 B가 실패한 경우
- 부분적으로 적용된 상태는 예측 불가능한 동작을 만든다
- 트랜잭션이 이를 방지한다

---

## 결론: 좋은 추상화는 도메인을 넘는다

14년 전 그래프 처리를 위해 만들어진 모델이 AI 에이전트에 적용되었다.

이유는 간단하다. **문제의 구조가 같기 때문이다.**

- 독립적인 계산 단위
- 메시지 기반 통신
- 동기화 지점

이 세 가지 특성을 가진 모든 시스템은 BSP 모델의 후보다.

LangGraph 팀은 이를 알아봤다. 바퀴를 재발명하지 않았다. 검증된 패턴을 가져왔다.

---

## 다음 글에서

- BSP 모델의 상세 구현: Barrier와 Channel
- LangGraph에서 superstep이 실제로 어떻게 동작하는지
- Checkpoint와 Time Travel 디버깅

---

## 참고

- [Google Pregel 논문 (2010)](https://research.google/pubs/pregel-a-system-for-large-scale-graph-processing/)
- [LangGraph Pregel API Reference](https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.Pregel.html)
- [LangGraph Runtime 문서](https://docs.langchain.com/oss/python/langgraph/pregel)
- [From Pregel to LangGraph - Colin McNamara](https://colinmcnamara.com/blog/langgraph-conceptual-study-guide)
