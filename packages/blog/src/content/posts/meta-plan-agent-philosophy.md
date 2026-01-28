---
title: "Plan을 위한 Plan: 메타인지 에이전트의 철학"
description: "왜 AI 에이전트에게 '계획에 대한 계획'이 필요한가? Bratman의 Planning Theory와 Hofstadter의 Strange Loops로 풀어보는 메타플래닝의 철학과 구현 패턴"
pubDate: "2026-01-20"
---

# Plan을 위한 Plan

송길영 작가는 ["그냥 하지 말라"](https://product.kyobobook.co.kr/detail/S000001949228)고 말한다. "왜 하는지를 빼먹지 말라"는 뜻이다. 생각 없는 근면이 아닌, **궁리하는 성실함**이 필요하다고.

AI 에이전트에게도 같은 말을 해야 할 때가 됐다.

최근 에이전트 시스템을 설계하면서 반복적으로 마주치는 문제가 있다. 에이전트가 "무엇을 할지"는 잘 판단하는데, "이 계획이 좋은 계획인지"는 판단하지 못한다. 실행은 빠른데 방향이 틀리면 빠르게 잘못된 곳으로 간다.

결국 **"계획에 대한 계획"**이 필요하다는 결론에 도달했다. 메타플래닝(Meta-planning)이다.

---

## 철학적 배경: 왜 "Plan을 위한 Plan"인가?

### Bratman의 Planning Theory

철학자 Michael Bratman은 인간의 행동을 이해하는 핵심으로 **의도(Intention)**를 제시한다. 의도는 단순한 바람(desire)이 아니라, 시간을 넘어 행동을 조직화하는 심적 상태다.

Bratman의 핵심 통찰:

1. **부분 계획(Partial Plans)**: 완전한 계획이 없어도 행동할 수 있다. 대략적인 방향만 있으면 세부사항은 실행하면서 채워진다.

2. **계획의 안정성과 수정 가능성의 균형**: 너무 쉽게 바뀌면 일관성이 없고, 너무 고정되면 적응을 못 한다. 좋은 계획은 이 둘 사이의 긴장을 유지한다.

3. **수단-목적 추론**: 목표가 정해지면 그 목표를 달성할 수단을 찾고, 그 수단이 다시 하위 목표가 된다.

AI 에이전트도 마찬가지다. 완벽한 계획을 세우고 실행하는 게 아니라, 부분적인 계획을 세우고 실행하면서 계획을 정교화한다. 문제는 이 정교화 과정을 **의식적으로** 할 수 있느냐다.

### 메타인지의 이중 구조

인지과학에서 메타인지(Metacognition)는 두 가지 기능으로 구성된다:

- **모니터링(Monitoring)**: "지금 내가 뭘 하고 있지?", "이게 잘 되고 있나?"
- **조절(Control)**: "전략을 바꿔야 하나?", "리소스를 더 투입해야 하나?"

최근 SOFAI-LM 아키텍처 연구에서는 LLM 시스템에 이 메타인지 계층을 명시적으로 추가했다. System 1 (직관적 추론) + System 2 (분석적 추론) + Metacognition (전략 선택과 자원 할당). 결과는 유의미했다. 특히 복잡하고 모호한 문제에서 성능이 올랐다.

### Strange Loops와 자기참조

[[strange-loops](/strange-loops)] 글에서 호프스타터의 "이상한 고리" 개념을 다뤘다. 핵심은 이거다:

> 시스템이 추상화의 여러 층을 거쳐 자기 자신을 참조할 때, 놀라운 창발이 일어난다.

그때는 **정체성**에 적용했다:
> "정체성은 고정된 실체가 아니라 **자기를 참조하며 생성되는 패턴**이다"

같은 논리를 **계획**에 적용할 수 있다:
> **계획도 고정된 것이 아니라, 실행 결과를 참조하며 지속적으로 생성되는 패턴이다**

메타플래닝은 바로 이 자기참조 구조다. 계획이 실행을 낳고, 실행 결과가 계획을 수정하고, 수정된 계획이 다시 실행을 낳는다. 무한 재귀가 아니라, **의미 있는 추상화 수준의 점프**다.

---

## 기술적 패턴: 어떻게 구현할 수 있는가?

### 핵심 패턴 5가지

| 패턴 | 핵심 아이디어 | 참고 |
|------|--------------|------|
| **GoalAct** | 전역 목표 유지 + 계층적 실행 | NCIIP 2025 Best Paper |
| **Gödel Agent** | 자기참조적 루프, 자기 수정 | arXiv 2024 |
| **Tree-of-Thought** | 다중 경로 탐색 + 최적 선택 | Yao et al. |
| **Self-Refine** | 생성 → 비판 → 개선 루프 | Madaan et al. |
| **Reflexion** | 실패 기반 자기 반성 | Shinn et al. |

### Gödel Agent의 자기참조 루프

Gödel Agent는 이름에서 알 수 있듯 괴델의 자기참조에서 영감을 받았다. 핵심 수식:

```
π_{t+1}, I_{t+1} = I_t(π_t, I_t, r_t, g)

where:
  π = policy (계획 전략)
  I = improvement algorithm (개선 알고리즘)
  r = feedback (실행 결과)
  g = goals (목표)
```

읽는 법: **현재의 개선 알고리즘 I_t가 현재 정책 π_t, 자기 자신 I_t, 피드백 r_t, 목표 g를 입력받아 다음 버전의 정책과 개선 알고리즘을 출력한다.**

개선 알고리즘이 자기 자신을 수정한다. 이게 자기참조다. 단순한 계획 수정이 아니라, **계획을 수정하는 방법** 자체를 수정한다.

### 권장 아키텍처

실제 구현에서 고려할 3계층 구조:

```
┌────────────────────────────────────────┐
│ PLANNING LAYER (메타 레벨)              │
│ - Problem Decomposition                │
│ - Multi-Path Exploration               │
│ - Plan Critique & Refinement           │
└──────────────┬─────────────────────────┘
               ↓
┌────────────────────────────────────────┐
│ EXECUTION LAYER (실행 레벨)             │
│ - Hierarchical Execution               │
│ - ReAct Loop per Task                  │
│ - Feedback & Monitoring                │
└──────────────┬─────────────────────────┘
               ↓
┌────────────────────────────────────────┐
│ SELF-EVOLUTION LAYER (메타-메타)        │
│ - Reflexion: 성공/실패 분석             │
│ - Policy Update (Gödel-style)          │
│ - Knowledge Base Update                │
└────────────────────────────────────────┘
```

**Planning Layer**는 "무엇을 할 것인가"를 결정한다. 문제를 분해하고, 여러 접근법을 탐색하고, 계획을 비판적으로 검토한다.

**Execution Layer**는 "어떻게 할 것인가"를 실행한다. 계층적으로 태스크를 수행하고, 각 태스크마다 ReAct 루프를 돌린다.

**Self-Evolution Layer**는 "다음에 어떻게 더 잘할 것인가"를 학습한다. 실패와 성공을 분석하고, 정책을 업데이트한다.

### Manus: 프로덕션에서의 메타플래닝

이론이 아닌 실제 작동하는 사례가 있다. 2025년 3월 출시된 [Manus](https://manus.im)는 메타플래닝을 프로덕션에 적용한 대표적 에이전트다.

Manus의 멀티 에이전트 구조:
- **Planner Agent**: 사용자 요청을 받아 하위 태스크로 분해
- **Execution Agent**: 태스크 실행 (코드, 브라우저, 파일시스템)
- **Verification Agent**: 결과 검증

여기에 [Context Engineering](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)이라는 실용적 인사이트가 더해진다:

1. **KV-cache 히트율 최적화**: 캐시 vs 미캐시 = 10배 비용 차이. 프로덕션 에이전트에서 가장 중요한 지표.
2. **파일시스템을 컨텍스트로**: 긴 작업은 `todo.md` 파일에 진행 상황을 기록. "lost-in-the-middle" 문제 완화.
3. **오류 보존**: 실패한 시도와 스택 트레이스를 컨텍스트에 유지. 같은 실수 반복 방지.

Manus 팀은 이 과정을 [**"Stochastic Graduate Descent"**](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)라고 부른다. Gradient가 아니라 Graduate. 에이전트 프레임워크를 네 번이나 갈아엎었다고 한다.

[[능선 위에서](/local-maxima)] 글에서 로컬 미니마 탈출 전략을 다뤘다. Random Restart, Simulated Annealing 같은 것들. Manus의 SGD도 결국 같은 이야기다. **완벽한 아키텍처를 한 번에 찾으려 하지 말고, 여러 시작점에서 실험하며 더 나은 봉우리를 찾아가는 것.**

흥미로운 점: Manus는 Planning + Execution + Verification 구조를 갖췄지만, **Self-Evolution 계층은 없다**. 개선은 인간 엔지니어가 수동으로 한다. Gödel Agent가 제안하는 "자기 수정"은 아직 연구 단계고, 프로덕션에서는 인간이 그 역할을 맡는다.

이건 현실적인 선택이다. 자기 수정 에이전트는 강력하지만 위험하다. 지금은 **인간이 메타-메타 레벨을 담당**하는 게 맞다.

---

## 실용적 가치: AI Native 개발자에게 왜 중요한가?

### Anthropic의 실용적 지혜

Anthropic의 "Building Effective Agents" 가이드에서 반복되는 원칙이 있다:

> "Start simple and add complexity only when demonstrably necessary."

메타-플래너도 마찬가지다. **최소한의 개입이 기본값**이어야 한다. 단순한 태스크에 3계층 아키텍처를 적용하면 오버헤드만 늘어난다. 복잡한 조율은 증명된 필요시에만.

언제 메타플래닝이 필요한가?

1. **태스크가 모호할 때**: "성능을 개선해줘"처럼 여러 해석이 가능한 경우
2. **다단계 의존성이 있을 때**: A의 결과가 B에 영향을 주고, B가 C에 영향을 주는 경우
3. **실패 비용이 클 때**: 잘못된 방향으로 오래 가면 되돌리기 어려운 경우
4. **불확실성이 높을 때**: 정보가 부족해서 탐색이 필요한 경우

### Claude Code Plan Mode의 교훈

매일 쓰는 Claude Code에 이미 이 패턴이 있다. `/plan` 모드로 진입하면:

1. **Research**: 코드베이스 탐색, 기존 패턴 파악
2. **Plan**: 구현 계획 수립, 파일 단위로 변경사항 명시
3. **Execute**: 사용자 승인 후 실행

이게 바로 메타플래닝이다. 계획을 명시적으로 작성하고, 검토하고, 승인받은 후 실행한다. "그냥 하지 않는다."

[[ai-native-mindset](/ai-native-mindset)] 글에서 "계획-리뷰 핑퐁"을 언급했다. 에이전트에게 계획을 먼저 세우게 하고, 계획에 대해 리뷰/리서치 핑퐁을 두세 차례 하는 것. 이미 우리가 하고 있는 것의 구조화다.

### 팀에 메타플래닝이 주는 가치

개인 프로젝트에서도 유용하지만, 팀에서 더 빛난다:

1. **방향 착오 방지**: 잘못된 계획에 시간 낭비 X. 에이전트가 엉뚱한 방향으로 달리는 것 방지.
2. **팀 얼라인먼트**: 계획을 명시적으로 공유하면 팀원 간 이해가 맞춰진다.
3. **비용 효율**: 모든 작업에 메타플래닝하면 비효율. 복잡한 작업만 선별 적용.

---

## 맺음: 계획도 "발견"이 아닌 "창조"

[[strange-loops](/strange-loops)] 글의 결론을 다시 가져온다:

> "'나'는 발견의 대상이 아니라 **창작의 과정**이다"

계획에도 같은 논리가 적용된다:

> **좋은 계획은 발견하는 것이 아니라, 실행하며 창조하는 것이다**

완벽한 계획을 미리 세우려는 시도는 실패한다. 세상은 복잡하고, 정보는 불완전하고, 상황은 변한다. 대신 **부분적인 계획**으로 시작해서, **실행 결과를 참조**하며, **지속적으로 정교화**해나가야 한다.

"그냥 하지 말라"는 이 창조 과정에 **의식적으로 참여하라**는 뜻이다.

AI 에이전트도 마찬가지다. 무작정 실행시키지 말고, 계획을 세우게 하고, 계획을 검토하고, 필요하면 계획을 수정하게 하라. 이 메타 레이어가 있어야 에이전트가 "그냥 하지 않게" 된다.

그리고 이건 에이전트만의 이야기가 아니다. [[working-with-agents](/working-with-agents)] 글에서 말했듯, 우리는 이미 에이전트와 일하고 있다. 매니저가 팀원에게 위임하듯, 개발자가 AI에게 위임한다. 그 위임의 품질은 **메타 레벨의 사고**에 달려 있다.

결국 [[building-with-ai-agent](/building-with-ai-agent)] 글의 결론과 같다:

> "기술은 빠르게 변하지만, 결국 사람이 원하는 경험을 만드는 것이 핵심이다."

메타플래닝은 그 경험을 만드는 하나의 도구다.

---

## Related

- [[Strange Loops와 미래의 자아](/strange-loops)] - 자기참조의 철학적 기초
- [[AI Native Mindset](/ai-native-mindset)] - 계획-리뷰 핑퐁과 시스템 사고
- [[에이전트와 자연어로 소통하며 만드는 블로그](/building-with-ai-agent)] - AI와 함께 만들기
- [[우리는 이미 에이전트와 일하고 있다](/working-with-agents)] - Agency의 철학적 의미
- [[능선 위에서](/local-maxima)] - 로컬 미니마와 Stochastic Graduate Descent

---

## 참고문헌

### 철학
- Bratman, M. (2024). *Planning and Its Function in Our Lives*. 의도, 자율성, 시간적 확장성
- Hofstadter, D. R. (1979). *Gödel, Escher, Bach: An Eternal Golden Braid*. 자기참조와 창발

### 기술 논문
- [GoalAct: A General Multi-Step Web Agent Framework](https://arxiv.org/abs/2504.16563) - NCIIP 2025 Best Paper
- [Gödel Agent: A Self-Referential Agent Framework](https://arxiv.org/abs/2410.04444) - 자기참조적 에이전트
- [SOFAI-LM: Metacognition in Large Language Models](https://arxiv.org/html/2508.17959v1) - LLM 메타인지 아키텍처

### 실용 가이드
- [Anthropic - Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [LangChain - Plan-and-Execute Agents](https://blog.langchain.dev/planning-agents/)
- [Manus - Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) - 프로덕션 메타플래닝 사례
