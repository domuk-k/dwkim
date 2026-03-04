---
title: "Trust Ladder: 자동화는 계단이지 스위치가 아니다"
description: "0(수동)→1(보조)→2(감독)→3(위임)→4(자율) 5단계. 자동화를 한 번에 완성하려는 시도는 실패한다. 데이터 기반 점진적 승격."
pubDate: "2026-02-12"
series: "업무 위임 빌더를 만들면서"
---

# Trust Ladder: 자동화는 계단이지 스위치가 아니다

"이 업무 자동화하겠습니다" — 이 말을 들은 현장 실무자의 반응은 대개 두 가지다. 기대하거나, 두려워하거나. 둘 다 같은 오해에서 비롯된다. 자동화가 **스위치**처럼 한 번에 켜진다는 생각.

항공업계는 이 교훈을 비극으로 배웠다. 1970년대 항공사고의 80%는 "조종사 과신" 또는 "부조종사 의견 무시"였고, 그 해결책으로 나온 CRM(Crew Resource Management)은 자동화를 단계별로 적용하는 모델이다. 의료계의 Graded Autonomy도 같은 원리다. 생명이 달린 곳에서 증명된 이 방법론을 워크플로우 자동화에 가져왔다.

> "0에서 4로 점프하는 게 아니라, 매 단계마다 신뢰를 증명해야 한다."

## 한 줄로 말하면

자동화는 **5단계 Trust Ladder**로 설계되어야 한다:

| Level | 이름 | 설명 | 사람 역할 | AI 역할 |
|-------|------|------|-----------|---------|
| **0** | 수동 (Manual) | 사람이 직접 수행 | 실행자 | 없음 |
| **1** | 보조 (Assisted) | AI가 정보/옵션 제공 | 결정자 | 조언자 |
| **2** | 감독 (Supervised) | AI가 제안, 사람이 승인 | 감독자 | 실행 제안자 |
| **3** | 위임 (Delegated) | AI가 실행, 예외만 보고 | 예외 처리자 | 실행자 |
| **4** | 자율 (Autonomous) | AI가 완전 자동 실행 | 모니터링 | 자율 실행자 |

**핵심**: 각 단계는 데이터 기반으로 승격된다. "느낌"이나 "만족도"가 아니라, 측정 가능한 지표.

## Workflow Studio의 구현

모든 승격/강등은 `trust_transitions` 테이블에 기록된다. 각 전환마다 `evidence`(JSON)에 승격 근거를 저장하고, `decided_by`로 시스템 자동 판단인지 사람의 결정인지를 추적한다.

### 승격/강등 기준

```typescript
// Level 2 → 3 승격: 데이터 기반 자동 판정
const promotionCriteria = {
  minApprovalRate: 0.95,      // 승인률 95% 이상
  minExecutionCount: 50,      // 최소 50회 실행
  maxErrorRate: 0.01,         // 오류율 1% 이하
  consecutiveSuccesses: 20    // 연속 성공 20회 이상
};

// Level 3 → 2 강등: 신뢰 하락 시 자동 롤백
const rollbackTriggers = {
  errorSpike: 3,           // 최근 10회 중 3회 이상 오류
  approvalRateDrop: 0.85,  // 승인률 85% 이하로 하락
  userOverride: 5          // 최근 10회 중 5회 이상 사용자 개입
};
```

핵심은 "느낌"이 아니라 **측정 가능한 지표**로 움직인다는 것이다.

## 왜 계단인가

### 1. 리스크 관리

한 번에 Level 4로 올라가면:
- 대규모 실패 가능성
- 롤백 경로 불명확
- 사용자 신뢰 급락

단계별 승격:
- 각 단계에서 문제 조기 발견
- 빠른 롤백 (한 단계만 내려도 됨)
- 점진적 신뢰 구축

### 2. 학습 데이터 수집

각 단계는 **학습 신호 생성 기회**:
- Level 1: 사람의 선택 패턴 학습
- Level 2: 승인/거부 이유 학습
- Level 3: 예외 케이스 학습
- Level 4: 완전 자율화 가능 조건 학습

hitl-is-data-engine-not-friction에서 말한 "HITL = 데이터 엔진"의 구체적 구현.

### 3. 조직 수용성

사람들은 갑작스러운 변화를 거부한다:
- 한 번에 "이제 AI가 다 합니다" → 저항
- 단계별 "이번 단계는 AI가 제안만 합니다" → 수용

항공/의료 분야에서 차용한 이유도 이것. 생명이 달린 곳에서 증명된 방법론.

## 더 큰 그림

### 항공 CRM의 교훈

1970년대 항공사고 80%가 "조종사 과신" 또는 "부조종사 의견 무시"였다.

CRM 도입 후:
- 자동조종장치: Level 3-4 (순항 시)
- 이착륙: Level 1-2 (사람이 주도)
- 비상 상황: Level 0 (완전 수동)

**컨텍스트에 따라 동적으로 Trust Level을 조정**한다.

### 의료 Graded Autonomy

수술 로봇도 마찬가지:
- 보조 (레벨 1): 의사가 집도, 로봇이 손떨림 보정
- 감독 (레벨 2): 로봇이 봉합 제안, 의사가 승인
- 위임 (레벨 3): 정형화된 절차는 로봇이, 예외만 의사가
- 자율 (레벨 4): 단순 검사는 완전 자동

### Workflow Studio의 적용

```yaml
# 노드별로 다른 Trust Level 설정 가능
nodes:
  - id: "email_classification"
    type: "llm"
    trustLevel: 3           # 위임: AI가 분류, 예외만 알림

  - id: "customer_refund"
    type: "approval"
    trustLevel: 2           # 감독: 반드시 사람이 승인

  - id: "report_generation"
    type: "llm"
    trustLevel: 4           # 자율: 완전 자동
```

### 엔터프라이즈 거버넌스

Trust Ladder는 감사(Audit) 레이어와 자연스럽게 통합:
- 각 승격/강등이 기록됨
- 컴플라이언스 팀이 승격 근거 추적 가능
- "왜 이 노드는 자동인가?" → 증거 기반 답변 가능

governance-as-core-not-module에서 말한 "코어에 녹인 거버넌스"의 구체적 형태.


- 🔼 [delegation-requires-decomposition](/delegation-requires-decomposition/) — 이 글의 전제: 위임의 전제 조건. Trust Ladder는 위임의 실행 방법론
