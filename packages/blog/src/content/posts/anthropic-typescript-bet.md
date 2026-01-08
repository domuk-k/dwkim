---
title: "Anthropic은 TypeScript 진영을 밀어준다"
description: "Programming TypeScript 저자가 Claude Code를 만들고, Bun을 인수하고. Anthropic의 TypeScript 올인 전략을 개인적인 시선으로."
pubDate: "2026-01-08"
---

나는 Python이 별로다.

이렇게 말하면 트위터에서 욕먹을 것 같지만, 솔직한 감정이다. 정이 안 간다. 연구자들의 장난감 같다는 느낌? `mypy` 쓰는 프로젝트는 드물고, `Any` 가 온갖 곳에 흩뿌려져 있다. 타입이라는 개념 자체가 커뮤니티에서 2등 시민 취급받는 느낌.

그래서 Anthropic의 최근 행보가 재밌다.

---

## 그 TypeScript 책 기억나?

2019년, O'Reilly에서 **《Programming TypeScript》**가 나왔다. 저자는 Boris Cherny. 당시엔 "TypeScript 잘 정리한 책이네" 라고 느끼고 잘 쓴 책이라고 생각하며 읽었다.

그런데 최근에 Claude Code를 쓰다가 알게 됐다.

**그 Boris Cherny가 Claude Code를 만든 사람이었다.**

2024년 9월, 사이드 프로젝트로 시작했다고 한다.[^bcherny-x] 6개월 만에 연간 $1B 런레이트. 더 웃긴 건 Claude Code의 80-90%가 Claude Code 자체로 작성됐다는 거다. 셀프 부트스트랩.

TypeScript 책 쓴 사람이 AI 시대의 가장 핫한 개발자 도구를 만들었다. 우연일까?

---

## Anthropic의 첫 인수: JavaScript 런타임

2025년 12월, Anthropic이 **Bun**을 인수했다.[^bun-blog]

AI 회사의 첫 인수가 모델 회사도, 데이터 회사도 아니고 **JavaScript 런타임**이라고?

이유는 단순하다. Claude Code가 Bun executable로 배포되기 때문이다.

> "Bun이 깨지면 Claude Code가 깨진다."[^devclass]

$26M 투자받고 매출 $0이던 Bun을 인수한 건, 그만큼 Claude Code가 TypeScript/JavaScript 생태계에 깊이 박혀 있다는 뜻이다.

---

## 왜 LLM은 TypeScript를 더 잘 다룰까

여기서 내 취향 얘기만 하면 그냥 편향된 의견이 된다. 공학적으로 생각해보자.

### 타입은 피드백이다

LLM이 코드를 생성하면, 누군가는 그게 맞는지 확인해야 한다. TypeScript에서는 컴파일러가 **즉시** 알려준다.

```typescript
function add(a: number, b: number): string {
  return a + b; // 에러: number를 string에 할당할 수 없음
}
```

Python은? 런타임에 가서야 터진다. 그것도 운이 좋으면.

Boris Cherny가 Claude Code 워크플로우에서 가장 강조한 게 "검증 피드백 루프"다.[^venturebeat] TypeScript의 타입 시스템은 이 피드백 루프를 **공짜로** 제공한다.

### 공백 하나가 로직을 바꾼다

Python의 indentation 기반 문법은 사람한테는 읽기 좋지만, LLM한테는 함정이다.

```python
if condition:
    do_something()
    do_another()  # if 안
do_another()      # if 밖 — 스페이스 4칸 차이
```

LLM이 공백 하나 잘못 생성하면? 문법 에러도 안 나고 **조용히** 로직이 바뀐다. TypeScript의 `{}`는 이런 애매함이 없다.

### 타입이 곧 문서다

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function createUser(data: Omit<User, "id" | "createdAt">): User;
```

LLM은 이 시그니처만 보고 함수가 뭘 받고 뭘 뱉는지 **정확히** 안다. Python의 `dict`? 열어보기 전까진 모른다.

---

## 그래서 뭐?

정리하면 이렇다:

- Anthropic은 TypeScript를 밀고 있다 — Boris Cherny, Bun 인수
- LLM도 TypeScript를 더 잘 다룬다 — 정적 타입, 명시적 구문, 즉시 피드백
- 나도 TypeScript를 밀고 있다 — 취향 : ~~사실 이제는 정말 취향이 중요하다~~

**AI 연구는 Python으로 하고, AI 제품은 TypeScript로 만드는 시대가 온 것 같다.**

Boris Cherny가 TypeScript 책을 쓴 게 2019년이다. 5년 후, 그는 그 언어로 Claude Code를 만들었다.

어쩌면 이게 가장 설득력 있는 TypeScript 추천일지도.

---

## Related

- [[boris-cherny-claude-code]] - Boris Cherny 상세 프로필/워크플로우
- [[ai-native-mindset]] - AI Native 개발자 마인드셋

## Sources

[^bcherny-x]: Boris Cherny, ["When I created Claude Code as a side project back in September 2024..."](https://x.com/bcherny/status/2004887829252317325), X, 2025.
[^bun-blog]: Bun Blog, ["Bun is joining Anthropic"](https://bun.com/blog/bun-joins-anthropic), 2025.
[^devclass]: DevClass, ["Bun JavaScript runtime acquired by Anthropic"](https://devclass.com/2025/12/03/bun-javascript-runtime-acquired-by-anthropic-tying-its-future-to-ai-coding/), 2025.
[^venturebeat]: VentureBeat, ["The creator of Claude Code just revealed his workflow"](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are), 2025.
