---
title: "멀티 에이전트 아키텍처 패턴: 업계가 정리한 8가지 디자인 패턴"
description: "Google, OpenAI, Anthropic이 공통으로 정의한 멀티 에이전트 시스템 디자인 패턴 8가지와 실제 적용 사례"
pubDate: "2026-01-20"
---

# 멀티 에이전트 아키텍처 패턴

> 업계에서 공통적으로 정의한 8가지 멀티 에이전트 디자인 패턴 정리

⸻

## 들어가며

최근 [OpenAI 밋업](https://luma.com/23tmqe8f)에서 에이전트 아키텍처에 대한 발표를 듣다가 흥미로운 점을 발견했다. Google, OpenAI, Anthropic, Microsoft가 거의 동시에 비슷한 패턴들을 정리하고 있다는 것.

2025-2026년은 멀티 에이전트 시스템의 "패턴 정립기"라고 볼 수 있다. 각 벤더가 제각각 만들던 에이전트 아키텍처가 이제 공통된 어휘로 수렴하고 있다. 특히 Google ADK(Agent Development Kit)가 8가지 패턴을 명시적으로 정의하면서 업계 표준처럼 자리잡아가고 있다.

이 글에서는 그 8가지 패턴을 정리하고, 실제로 어떻게 적용되는지 살펴본다.

⸻

## 핵심 패턴 8가지

### 1. Sequential Pipeline (순차 파이프라인)

```
Agent A → Agent B → Agent C → Result
```

조립 라인처럼 각 에이전트가 결과를 다음으로 전달하는 가장 단순한 패턴이다. 선형적이고 결정론적이라 디버깅이 쉽다.

**사용 사례**:
- PDF 처리: 파서 → 추출기 → 요약기
- 콘텐츠 파이프라인: 작성 → 편집 → 검수

⸻

### 2. Coordinator/Dispatcher (조정자-디스패처)

```
         ┌→ Billing Agent
User → Coordinator
         └→ Tech Support Agent
```

중앙 에이전트가 의도를 분석한 후 전문 에이전트로 라우팅하는 패턴. Orchestrator-Subagents, Manager Pattern이라고도 부른다.

OpenAI의 정의:
> "In a manager/orchestrator pattern, a central manager invokes specialized sub-agents as tools and retains control of the conversation."

**사용 사례**:
- 고객 서비스봇: 청구 문의 vs 기술 지원으로 분기
- 개발 도구: 코드 작성 vs 테스트 vs 문서화 담당 분리

⸻

### 3. Parallel Fan-Out/Gather (병렬 방사형)

```
         ┌→ Security Agent  ─┐
Request → Coordinator        → Aggregator → Result
         ├→ Style Agent     ─┤
         └→ Perf Agent      ─┘
```

여러 에이전트가 동시에 작업 후 결과를 통합하는 패턴. 지연 시간을 줄이고 병렬 처리 효율을 높일 수 있다.

Anthropic의 연구 시스템이 이 패턴을 사용해 인상적인 결과를 보여줬다:
> "Lead agent coordinates while delegating to specialized subagents that operate in parallel."
> Opus 4 + Sonnet 4 조합으로 단일 에이전트 대비 **90.2% 성능 향상**

**사용 사례**:
- PR 리뷰: 보안/스타일/성능 동시 검사
- 리서치: 여러 소스 동시 조사

⸻

### 4. Hierarchical Decomposition (계층적 분해)

```
High-level Agent
    ├→ Sub-task Agent 1
    │      ├→ Worker 1.1
    │      └→ Worker 1.2
    └→ Sub-task Agent 2
```

복잡한 목표를 재귀적으로 세부 작업으로 분해하는 패턴. 대규모 리포트 작성이나 복잡한 소프트웨어 프로젝트에 적합하다.

⸻

### 5. Generator and Critic (생성-검증)

```
Generator → Output → Critic → Pass? → Done
              ↑                 ↓ No
              └─────────────────┘
```

한 에이전트가 생성하고, 다른 에이전트가 검증/비평하는 패턴. Plan-Execution-Verification의 핵심 요소이기도 하다.

Google ADK의 설명:
> "The generator agent proposes, the critic agent validates. Conditional looping continues until quality criteria are met."

**사용 사례**:
- SQL 쿼리 생성 + 구문 검증
- 코드 생성 + 테스트 검증

⸻

### 6. Iterative Refinement (반복적 개선)

```
Generator → Critic → Refiner → (반복) → Final
```

Generator-Critic의 확장으로, 품질 기준 충족까지 반복한다. 정확성보다 **정성적 개선**에 초점을 맞춘다.

**사용 사례**:
- 코드 성능 최적화
- 문서 품질 개선

⸻

### 7. Peer-to-Peer / Handoff (분산형)

```
Agent A ←→ Agent B ←→ Agent C
```

중앙 조율자 없이 에이전트들이 직접 제어권을 전달하는 패턴. 유연하지만 전역 일관성 유지가 어렵다.

OpenAI Agents SDK의 정의:
> "Handoffs are a one-way transfer that allow an agent to delegate to another agent. In the Agents SDK, a handoff is a type of tool."

⸻

### 8. Human-in-the-Loop (인간 개입)

```
Agent → High-stakes action? → Human Approval → Execute
```

중대한 결정에서 인간 검토를 대기하는 패턴. 자율성과 안전성 사이의 균형점이다.

Google의 설명:
> "Agents handle the groundwork, but a human must authorize high-stakes actions."

**사용 사례**:
- 금융 거래 승인
- 프로덕션 배포
- 민감한 데이터 접근

⸻

## 복합 패턴: 실제 시스템은 조합이다

실제 프로덕션 시스템은 단일 패턴이 아니라 여러 패턴의 조합이다:

```
┌──────────────────────────────────────────────────┐
│  Coordinator (Pattern 2)                          │
│    ├→ Parallel Research (Pattern 3)              │
│    │    ├→ Web Search Agent                      │
│    │    ├→ Code Analysis Agent                   │
│    │    └→ Doc Search Agent                      │
│    ├→ Generator-Critic Loop (Pattern 5)          │
│    │    ├→ Generator Agent                       │
│    │    └→ Critic Agent                          │
│    └→ Human Review (Pattern 8)                   │
└──────────────────────────────────────────────────┘
```

⸻

## 핵심 트레이드오프

패턴을 선택할 때 고려해야 할 축:

| 특성 | 중앙집중형 | 분산형 |
|------|-----------|--------|
| **일관성** | 높음 | 낮음 |
| **병목** | 있음 | 없음 |
| **디버깅** | 용이 | 어려움 |
| **유연성** | 낮음 | 높음 |
| **복잡성** | 낮음 | 높음 |

⸻

## 산업 사례

### Anthropic Research System

- **패턴**: Coordinator + Parallel Fan-Out
- **구조**: Opus 4 (리드) + Sonnet 4 (서브에이전트)
- **성과**: 단일 에이전트 대비 90.2% 성능 향상

### Claude Code

실제로 매일 사용하는 Claude Code는 Hierarchical + HITL 패턴의 조합이다. Task tool로 탐색이나 분석 같은 작업을 서브에이전트에게 위임하고, 민감한 작업(파일 삭제, 배포 커맨드 등)은 반드시 사용자 승인을 받는다.

이 조합이 효과적인 이유는 **탐색은 자율적으로, 변경은 신중하게**라는 원칙 때문이다. 코드베이스를 이해하는 데는 빠른 병렬 탐색이 필요하지만, 실제로 코드를 수정하는 건 사람의 판단이 필요하다.

### OpenAI Agents SDK

- **지원 패턴**: Manager (tools), Handoffs (peer-to-peer)
- **특징**: 코드 우선 접근, 동적 오케스트레이션

### Deep Agents (LangChain)

- **기반**: BSP (Bulk Synchronous Parallel) 모델
- **특징**: Superstep 기반 실행, 병렬 → Barrier → 상태 병합

⸻

## 2026 프로덕션 현실

흥미로운 건 업계의 분위기다. Cognition(Devin을 만든 회사)의 인터뷰에서 이런 언급이 있었다:

> "In 2025, running multiple agents in collaboration only results in fragile systems."

2026년 현재 권장되는 접근:
- Multi-agent → **Single-threaded agent + context compression**
- 복잡성 관리가 핵심 과제
- 57%가 이미 agent를 프로덕션에서 사용 (LangChain 조사)
- **품질**이 가장 큰 장벽 (32%)

멀티 에이전트가 만능은 아니라는 것. 오히려 단일 에이전트의 컨텍스트 관리를 잘 하는 게 더 효과적일 수 있다.

⸻

## 시사점

이 패턴들을 알면 몇 가지 이점이 있다:

**1. 새로운 프레임워크 빠르게 이해하기**
새로운 에이전트 프레임워크가 나와도 "이건 어떤 패턴의 구현인가?"로 분류할 수 있다. LangGraph, CrewAI, AutoGen 등이 결국 이 8가지의 변형이다.

**2. 디버깅 관점**
에이전트가 이상하게 동작할 때 "이 패턴의 어느 부분에서 문제가 생겼나?"로 진단할 수 있다.

**3. 설계 가이드**
자신의 에이전트를 만들 때 "어떤 패턴이 이 문제에 적합한가?"로 시작할 수 있다.

**4. 복잡성 경계 인식**
가장 중요한 건 이것이다: 패턴을 안다고 무조건 복잡하게 만들 필요는 없다. Anthropic의 조언처럼, **필요할 때만 복잡성을 추가하라**.

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

⸻

## 참고 자료

- [Google's Eight Multi-Agent Design Patterns - InfoQ](https://www.infoq.com/news/2026/01/multi-agent-design-patterns/)
- [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [OpenAI Agents SDK - Multi-Agent](https://openai.github.io/openai-agents-python/multi_agent/)
- [Anthropic Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Azure AI Agent Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [A Practical Guide to Building Agents - OpenAI](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

---

## Related

- [LLM 에이전트의 기본기: Planning, Memory, Tool](/blog-llm-agent-anatomy)
- [에이전트와 자연어로 소통하며 만드는 블로그](/building-with-ai-agent)
