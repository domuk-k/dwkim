---
title: "동변성으로 설명하는 TypeScript의 우위"
description: "소프트웨어 아키텍처 교과서의 동변성(connascence) 개념으로 TypeScript vs Python 논쟁을 재해석. '취향'이라고 말해왔던 것에 아키텍처 언어를 붙여본다."
pubDate: "2026-02-01"
---

나는 TypeScript를 좋아하고 Python이 별로다. 이전에도 [그렇게 썼다](anthropic-typescript-bet).

그런데 "왜?"라고 물으면 항상 좀 궁색했다. "타입이 있으니까", "IDE 지원이 좋으니까" — 틀린 말은 아닌데, 설득력이 약하다. Python도 타입 힌트가 있고, pyright도 있다.

최근에 소프트웨어 아키텍처 교과서를 읽다가, 드디어 이 감각에 이름을 붙일 수 있게 됐다.

**동변성(Connascence).**

---

## 동변성이 뭔데

Meilir Page-Jones가 1990년대에 제안한 개념이다. 핵심은 간단하다:

> 두 컴포넌트 중 하나를 바꾸면, 다른 것도 바꿔야 시스템이 유지되는 관계.

"결합(coupling)"이랑 비슷하지 않냐고? 맞다. 결합의 **정밀한 분류 체계**다. 결합이 "의존이 있다/없다"의 이분법이라면, 동변성은 "어떤 종류의 의존인가"를 구분한다.

크게 두 갈래:

- **정적 동변성** — 코드를 읽으면 보인다. IDE와 컴파일러가 잡아준다.
- **동적 동변성** — 런타임에서만 드러난다. 실행해봐야 안다.

---

## 동변성을 다루는 규칙들

페이지-존스는 모듈성을 개선하기 위한 세 가지 가이드라인을 제시했다.

1. **시스템을 캡슐화된 요소들로 분해해서, 전체적인 동변성을 최소화하라.**
2. **캡슐화 경계에 걸쳐 있는 동변성을 최소화하라.**
3. **캡슐화 경계 안의 동변성을 최대화하라.**

1번과 2번은 직관적이다. 모듈 간 의존을 줄여라. 3번이 재밌다. 경계 *안*에서는 동변성이 높아야 한다. 관련된 것끼리 강하게 묶여야 한다는 뜻이다. 이건 결국 **응집도(cohesion)를 높여라**와 같은 말이다.

이 개념을 실무자의 언어로 되살린 사람은 짐 웨이리치(Jim Weirich)다. Ruby 커뮤니티의 전설적인 개발자였던 그는 2009년 ["The Grand Unified Theory of Software Design"](https://github.com/jimweirich/presentation_connascence)이라는 발표에서 동변성을 "소프트웨어 설계의 대통일 이론"이라고 불렀다. 웨이리치는 동변성의 세 가지 속성을 강조한다:

**강도(Strength)** — 동변성에는 약한 것과 강한 것이 있다. 이름 동변성(Name)이 가장 약하고, 동일성 동변성(Identity)이 가장 강하다. **강한 동변성을 약한 동변성으로 전환하라.**

**정도(Degree)** — 동변성에 관여하는 엔티티의 수다. 매직 넘버 `1`을 2곳에서 쓰면 degree 2, 20곳에서 쓰면 degree 20이다. 같은 종류의 동변성이라도 degree가 높으면 위험하다. **관여하는 엔티티 수를 줄여라.**

**지역성(Locality)** — 소프트웨어 요소 간 거리가 멀수록, 더 약한 동변성만 허용해야 한다. 같은 파일 안에서의 강한 동변성은 괜찮다. 하지만 **모듈 경계를 넘는 순간? 가장 약한 형태만 써라.**

웨이리치는 이 프레임으로 "상속보다 위임을 선호하라", "디미터 법칙" 같은 설계 원칙들이 결국 **동변성을 약화시키라는 같은 말**이라고 설명했다. 개별 원칙을 외우는 대신, 동변성 하나로 통일적으로 판단할 수 있다는 거다.

여기까지가 이론이다. 이제 코드로 보자.

---

## Any는 동적 동변성을 만든다

이 개념을 알고 나니, 이전에 [타입은 문서다](types-are-documentation)에서 썼던 경험이 다시 보였다.

```python
structured_model: Any = None
```

이 한 줄이 만든 결과:

```python
if isinstance(structured_model, BaseModel):
    normalized_response_format = structured_model.model_dump()
elif isinstance(structured_model, dict):
    normalized_response_format = structured_model
elif isinstance(structured_model, (str, int, float, list)):
    ...
else:
    ...  # pyright: ignore
```

30줄의 방어 코드. 그때는 "Any는 해상도가 낮다는 신호"라고 표현했다. 지금은 더 정확하게 말할 수 있다.

**`Any`는 동적 동변성을 만드는 선언이다.**

`Any`를 쓰는 순간, 이 변수의 타입은 런타임에 가서야 알 수 있다. 값의 의미도, 호환되는 연산도, 전부 실행 시점에 해석해야 한다. 이건 의미 동변성(Connascence of Meaning)이고, 동적이다. 웨이리치의 Locality 규칙으로 보면 — `Any`는 모듈 경계를 넘어서까지 강한 동변성을 퍼뜨리는 셈이다.

---

## 타입 시스템은 동변성을 전환한다

TypeScript에서 같은 상황을 보자.

```typescript
// 결제 처리 모듈의 공개 인터페이스
interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: "KRW" | "USD";
}

function processPayment(request: PaymentRequest): Promise<PaymentResult>;
```

이 모듈을 쓰는 외부 코드는 `PaymentRequest`라는 **이름**과 그 필드 **이름**만 알면 된다. 내부에서 Stripe를 쓰든 토스를 쓰든 상관없다. 이름 동변성(Connascence of Name) — 스펙트럼에서 **가장 약한 형태**.

그리고 `currency`에 `"EUR"`를 넣으면? 런타임까지 갈 것도 없이, 에디터에서 빨간 줄이 뜬다. 의미 동변성(어떤 값이 유효한가)이 정적 동변성(타입 선언)으로 전환된 것이다.

컴파일러가 해주는 일을 동변성 언어로 다시 쓰면:

> **타입 시스템은 동적 동변성(런타임 타입 확인)을 정적 동변성(컴파일타임 이름 일치)으로 전환하는 도구다.**

이게 "타입이 있으니까 좋다"의 아키텍처적 번역이다.

---

## 위치 동변성: 함수 인자의 함정

동변성 관점에서 재밌는 게 하나 더 있다.

```python
def create_order(user_id, product_id, quantity, price):
    ...

create_order("prod_123", "user_456", 100, 9900)  # 뒤바뀜 — 런타임까지 모름
```

이건 **위치 동변성(Connascence of Position)**. 인자 순서가 맞아야 한다. 실수하면? 타입이 다 `str`이니 Python은 조용히 통과시킨다.

물론 Python도 keyword argument가 있다. `create_order(user_id="user_456", product_id="prod_123")`처럼 쓸 수 있다. 하지만 **강제가 아니다.** 팀원 10명 중 한 명이 positional로 쓰면 그만이다.

```typescript
function createOrder(params: {
  userId: string;
  productId: string;
  quantity: number;
  price: number;
}): Order;

createOrder({ productId: "prod_123", userId: "user_456", quantity: 100, price: 9900 });
// 순서 상관없음 — 이름만 맞으면 된다
// 그리고 userId에 "prod_123"을 넣으면? 타입이 같아도 이름이 다르니 의도가 드러난다
```

위치 동변성 → 이름 동변성으로 약화. TypeScript의 객체 패턴이 자연스럽게 해주는 일이다. 그리고 중요한 건, 이게 **관용적 패턴**이라는 점이다. TypeScript 커뮤니티에서는 인자가 2개 이상이면 객체로 묶는 게 일반적이다. 언어가 문화를 만들고, 문화가 동변성을 약화시킨다.

---

## 그래서 언어 선택은 아키텍처 결정이다

| | Python (타입 없이) | Python + pyright | TypeScript |
|---|---|---|---|
| 타입 동변성 | 동적 | 정적 | 정적 |
| 의미 동변성 | 동적 (`Any` 남용) | 전환 가능 | 정적 (타입 강제) |
| 위치 동변성 | 동적 (순서 의존) | 동일 | 정적 (객체 패턴) |
| 버그 발견 시점 | 런타임 | 에디터 | 에디터 |

Python도 pyright을 켜면 많이 좋아진다. 실제로 pyright 도입 후 -89줄의 방어 코드를 지웠다. 하지만 **언어 레벨에서 강제하느냐, 도구로 보완하느냐**는 다른 문제다. TypeScript는 타입 없이 코드를 쓸 수 없다. Python은 `Any`를 쓰면 조용히 넘어간다.

문화가 다르다. 그리고 아키텍처에서 문화는 구조만큼 중요하다.

---

## 취향에 이름을 붙이면

"TypeScript가 좋다"는 취향이었다. 이제는 이렇게 말할 수 있다:

**TypeScript는 언어 레벨에서 동적 동변성을 정적 동변성으로 전환하도록 강제하는 시스템이다.**

페이지-존스의 가이드라인 — 경계 밖의 동변성을 최소화하라. 웨이리치의 Locality 규칙 — 거리가 멀수록 약한 동변성만 허용하라. TypeScript의 타입 시스템은 이 원칙들을 코드에 구워 넣는다.

아키텍처 교과서를 읽으면서, 언어 취향을 설계 원칙으로 번역할 수 있게 됐다. 이게 "취향"과 "근거 있는 선택"의 차이인 것 같다.

---


- [anthropic-typescript-bet](/anthropic-typescript-bet/) - Anthropic의 TypeScript 올인 전략. Boris Cherny가 "검증 피드백 루프"를 강조한 것 = 정적 동변성의 이점
- [types-are-documentation](/types-are-documentation/) - "Any는 해상도가 낮다"의 아키텍처적 재해석: Any = 동적 동변성

## Source

- Mark Richards & Neal Ford, *Fundamentals of Software Architecture*, Chapter 3: Modularity
- Meilir Page-Jones, *What Every Programmer Should Know About Object-Oriented Design* (1996)
- Jim Weirich, ["The Grand Unified Theory of Software Design"](https://github.com/jimweirich/presentation_connascence) (2009)
- Jim Weirich, ["Connascence Examined"](https://github.com/jimweirich/presentation-connascence-examined) (2012, YOW)
- [connascence.io](https://connascence.io) — 동변성 레퍼런스 사이트
- [Practicing Ruby: Connascence as a Software Design Metric](https://practicingruby.com/articles/connascence)
