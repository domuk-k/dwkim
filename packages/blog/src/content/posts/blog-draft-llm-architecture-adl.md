---
title: "LLM 시대, 아키텍처는 누가 지키는가?"
description: "LLM이 생성하는 코드가 늘어나는 시대, ADL과 ArchUnit으로 아키텍처 규칙을 테스트로 강제하는 방법."
pubDate: "2026-01-06"
---

# LLM 시대, 아키텍처는 누가 지키는가?

> Architecture as Code — 아키텍처 규칙을 테스트로 강제하기

---

## 문제: LLM은 구조를 모른다

Copilot, Cursor, Claude Code. 이제 LLM이 생성하는 코드가 직접 타이핑하는 코드보다 많다.

문제는 LLM이 **동작하는 코드**는 잘 만들지만, **프로젝트 맥락**을 모른다는 것.

```javascript
// LLM이 만든 코드 — 동작은 하지만 아키텍처 위반
import { getUserData } from '../../../core/user/repository';  // 레이어 위반
import { sendEmail } from '../infrastructure/email';           // 도메인 경계 침범
```

PR이 쌓이고 LLM 코드가 늘수록, 리뷰어도 이런 위반을 놓치기 쉽다.

---

## 기존 해법의 한계

| 방식 | 문제점 |
|------|--------|
| 코드 리뷰 | 모든 의존성을 사람이 추적하기 어려움 |
| 문서화 | 읽지 않는 문서가 됨 |
| 컨벤션 가이드 | 강제력 없음. LLM은 참고 안 함 |

아키텍처 결정은 문서에만 남고, 코드는 설계와 멀어진다.

---

## 해법: Architecture as Code

Mark Richards(소프트웨어 아키텍처 101 저자)의 접근법 **ADL(Architecture Definition Language)**:

> 아키텍처 규칙을 pseudo-code로 정의하고, 테스트 코드로 변환해 CI에서 검증한다.

### ADL 예시 — 이커머스 도메인

```
DEFINE SYSTEM EcommerceApp AS ecommerce
  DEFINE DOMAIN Order AS order
  DEFINE DOMAIN Payment AS payment
  DEFINE DOMAIN User AS user
ASSERT(Order has NO DEPENDENCY on Payment internals)
ASSERT(CLASSES are only CONTAINED within DOMAINS)
```

이 pseudo-code를 LLM이 테스트 코드로 변환한다:

```java
// ArchUnit (Java)
ArchRule rule = classes()
    .that().resideInAPackage("..order..")
    .should().onlyDependOnClassesThat()
    .resideOutsideOfPackage("..payment.internal..")
    .because("Order 도메인은 Payment 내부 구현에 의존하면 안 됨");
```

이제 아키텍처 위반은 **테스트 실패**로 잡힌다. 리뷰어가 놓쳐도 CI가 막는다.

---

## 도구 선택

| 언어 | 도구 | 비고 |
|------|------|------|
| Java/Kotlin | **ArchUnit** | 가장 성숙함. 이것부터 시작 |
| .NET | ArchUnitNET, NetArchTest | |
| Python | PyTestArch | pytest 통합 |
| TypeScript | TSArch | 프론트엔드용 |

**Java 프로젝트라면 ArchUnit**, 그 외는 언어에 맞는 도구를 선택하면 된다.

---

## 실무 적용

**1단계: 작게 시작**
전체 아키텍처가 아닌, 가장 중요한 경계 1-2개부터.
```
ASSERT(presentation layer has NO DEPENDENCY on infrastructure)
```

**2단계: 레거시 예외 처리**
기존 위반은 `@ArchIgnore`로 허용. 새 코드만 검증.

**3단계: LLM 프롬프트에 규칙 포함**
```
"다음 규칙을 준수해서 코드 작성해줘:
- Domain 레이어는 Infrastructure를 import하지 않음"
```

로컬 테스트와 CI 모두에서 검증하면, LLM이 만든 코드도 구조 안에서 동작한다.

---

## 마무리: 아키텍트의 역할 변화

| 과거 | LLM 시대 |
|------|----------|
| 직접 코드 작성/리뷰 | 규칙 정의 (ADL) |
| 문서로 가이드 | 테스트로 강제 |
| 사후 검토 | CI 자동 검증 |

**"코드는 LLM이, 구조는 사람이."**

아키텍트의 가치는 "좋은 코드 작성"에서 **"좋은 구조를 정의하고 지키는 것"**으로 이동한다. ADL과 ArchUnit은 그 다리 역할을 한다.

---

## 참고 자료

- [ArchUnit](https://www.archunit.org/)
- [PyTestArch](https://github.com/zyskarch/pytestarch)
- [TSArch](https://github.com/ts-arch/ts-arch)
- 소프트웨어 아키텍처 101 / The Hard Parts (Mark Richards, Neal Ford)
