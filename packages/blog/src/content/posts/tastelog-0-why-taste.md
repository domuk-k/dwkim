---
title: "Taste Log #0: 왜 Taste인가"
description: "AI가 코드를 짜주는 시대에, 남는 건 판단이다. 기술 판단의 결을 기록하는 시리즈의 시작."
pubDate: "2026-03-17"
series: "tastelog"
---

# 코드를 안 짜는데 더 피곤한 이유

> 판단은 위임할 수 없다.

⸻

## 타이핑을 멈추니 머리가 더 아프다

요즘 나는 코드를 거의 직접 타이핑하지 않는다.

Claude Code와 페어 프로그래밍하듯 일하면서, 구현의 대부분을 AI에게 맡긴다. 보일러플레이트, 라우팅 설정, 타입 정의, 테스트 작성. 예전에는 타이핑하면서 머리를 쉴 수 있었다. 손이 움직이는 동안 다음 설계를 느긋하게 생각했다.

그런데 이제 타이핑이 사라지니까, 고수준 의사결정만 연속으로 내려야 한다.

"이 모듈은 쪼갤까 뭉칠까." "여기서 추상화할까 아직 이를까." "이벤트 드리븐으로 갈까 폴링으로 갈까." 쉬는 시간 없이 판단, 판단, 판단.

정신적으로 훨씬 피곤해졌다. 그런데 동시에, 이상하게도 더 즐겁다.

⸻

## AI가 준 것, AI가 가져간 것

AI가 준 건 속도다. 예전에 이틀 걸리던 구현이 반나절이면 끝난다. 언어 문법을 몰라도 새로운 스택에 뛰어들 수 있다. Kotlin/Spring 백엔드도, C++ Chromium 코드베이스도, 예전 같으면 시도조차 안 했을 영역에 손을 뻗게 됐다.

AI가 가져간 건 핑계다.

"아직 그 언어를 잘 몰라서요." "프레임워크를 공부하고 나서 할게요." 이런 말을 더 이상 할 수 없다. 도구의 제약이 사라지니, 남은 건 순수하게 — 뭘 만들지, 어떻게 만들지, 왜 이렇게 만들지.

Addy Osmani의 말이 자꾸 떠오른다.

> "Agents can implement, but they cannot judge whether what they are implementing is the right design."

결국 그거다. 구현은 해주는데, 그게 맞는 설계인지는 알아서 안 봐준다.

⸻

## 같은 도구를 쓰는데 결과가 다른 이유

얼마 전 흥미로운 경험을 했다.

같은 Claude Code를 쓰고, 같은 프롬프트를 쓰는데, 시니어와 주니어의 결과물이 확연히 달랐다. 차이는 "AI에게 뭘 시키느냐"가 아니라, "AI가 준 결과를 보고 뭘 고치느냐"에 있었다.

주니어는 돌아가면 넘어갔다. 시니어는 돌아가는 코드를 받고 나서 리팩토링을 시작했다. 네이밍을 다듬고, 불필요한 추상화를 걷어내고, 에러 핸들링의 granularity를 조정했다.

Vivian Qu가 쓴 글에 이런 표현이 있다:

> "Junior developers often hit a wall at 70% of a project due to accumulated technical debt from AI-generated code."

70%의 벽. AI가 만든 기술 부채가 누적되면서 프로젝트가 멈추는 지점. 그 벽을 넘는 건 더 좋은 프롬프트가 아니라, 더 좋은 판단이다.

⸻

## 근데 "좋은 판단"이 대체 뭔데?

여기서 솔직해지자.

나도 모른다. 적어도 한 문장으로 정의하지 못한다.

하지만 몇 가지는 안다. AI가 생성한 코드를 리뷰할 때, "이건 돌아가지만 좋은 코드는 아니다"라는 감각이 있다. 이걸 설명하려고 하면 이런 기준들이 나온다:

- 읽기 편한가? — 표현력
- 역할 분리가 네이밍으로 드러나는가? — 의도 명확성
- 수정하기 쉬운가? — 변경 용이성
- 지우기 쉬운가? — 결합도

스스로 설명할 수 없는 코드는, 고민이 부족한 코드다.

이런 기준은 4년간 코드를 짜면서 쌓였다. AI가 이걸 대체하진 못한다. 오히려 아웃풋이 많아지니까, 필터링하는 눈이 더 중요해졌다.

⸻

## Linus Torvalds의 linked list

2016년, Linus Torvalds가 TED 무대에서 "good taste"를 설명했다. Linked list에서 노드를 삭제하는 코드 두 개를 보여줬다.

첫 번째는 특수 케이스가 있다. head 노드인지 아닌지 분기하는 if문.

두 번째는 특수 케이스가 없다. 포인터의 포인터를 써서, head든 아니든 같은 로직으로 동작한다.

Torvalds는 이걸 "good taste"라고 불렀다.

> "Sometimes you can see a problem in a different way and rewrite it so that a special case goes away and becomes the normal case, and that's good code."

결국 **같은 문제를 다르게 봐서, 복잡성을 제거하는 눈**이다. 돌아가냐가 아니라 어떻게 돌아가느냐의 문제.

⸻

## 하지만 잠깐 — taste는 주관 아닌가?

"그건 네 취향이잖아" — 이 말을 들은 적이 있다.

맞다. 그리고 틀리다.

Paul Graham은 "Taste for Makers"에서 이렇게 말한다. 좋은 디자인은 단순하고, 시대를 초월하고, 약간 웃기다. 이건 개인 취향이 아니라 숙련된 판단이다. 연습과 노출과 실패를 통해 길러지는 것.

동시에, taste에는 분명 개인적인 결이 있다.

같은 트레이드오프 앞에서 어떤 사람은 유연성을 택하고, 어떤 사람은 단순성을 택한다. 둘 다 "좋은 판단"일 수 있다. 중요한 건 **왜 그쪽을 택했는지 설명할 수 있느냐**다.

설명할 수 없는 판단은, 판단이 아니라 습관이다.

⸻

## 판단은 기록해야 날카로워진다

1년 전 내가 쓴 코드를 본다. "왜 이렇게 했지?" 감각이 변했다는 증거다.

그런데 **어떻게** 변했는지는 기억나지 않는다.

어느 순간 "DRY를 무조건 따르자"에서 "이 중복은 의도적이다"로 넘어갔다. 어느 순간 "SRP를 지키자"에서 "이 정도 응집은 쪼개면 오히려 나빠진다"로 넘어갔다. 그 전환점들이 기록되어 있지 않다.

이 시리즈는 그 전환점을 기록하려는 시도다.

매 회 하나의 기술 트레이드오프를 잡는다. 양쪽의 논리를 공정하게 이해하고, 나의 경향을 선언하고, 그 이유를 쓴다. 그리고 "아직 모르겠는 것"도 솔직히 남긴다.

이건 정답을 알려주는 글이 아니다. 판단이 만들어지는 과정을 보여주는 글이다.

⸻

## 앞으로 다룰 것들

이 시리즈에서 탐구할 갈림길들:

**SRP vs 응집성** — 쪼개는 게 항상 좋은가? switch/case 20개가 Registry보다 나을 때가 있다.

**DRY vs WET** — Dan Abramov는 "비슷해 보이는 건 아직 문제를 이해 못한 거"라고 했다. 언제 추상화하고 언제 복붙하는가.

**Push vs Pull** — 이벤트 구동이 항상 우월한가? 폴링이 맞는 상황은 언제인가.

**병렬 에이전트의 맥락 공유** — 독립성과 공유 상태 사이. AI 에이전트 시대의 새로운 트레이드오프.

**코드 생성 vs 컴포지션** — 템플릿으로 찍어낼 것인가, 런타임에 조합할 것인가.

각 글은 같은 구조를 따른다: 갈림길 → 양쪽의 논리 → 나의 경향 → 갈고닦는 중.

⸻

## 이 글이 필요한 사람

AI와 함께 코드를 쓰면서, "이게 좋은 코드인지 어떻게 알지?"라고 한 번이라도 생각해본 사람.

혹은 기술적 결정을 내릴 때 "상황에 따라 다르다"는 말에 동의하면서도, 그 '상황'을 어떻게 구분하는지 정리해본 적 없는 사람.

그리고 솔직히, 가장 필요한 사람은 나 자신이다.

판단은 쓰면서 날카로워진다. 설명하지 못하는 감각은 성장하지 않는다. 이 시리즈는 내 taste를 갈고닦는 숫돌이다.

⸻

## 참고한 것들

### Taste는 원래 중요했다

- Linus Torvalds, ["The mind behind Linux"](https://www.ted.com/talks/linus_torvalds_the_mind_behind_linux), TED 2016 — "Good taste = 특수 케이스를 제거하는 눈"
- Paul Graham, ["Taste for Makers"](https://paulgraham.com/taste.html), 2002 — "The recipe for great work is: very exacting taste, plus the ability to gratify it."
- Sean Goedecke, ["What is 'good taste' in software engineering?"](https://www.seangoedecke.com/taste/) — "Bad taste = 맥락 무시하고 익숙한 해법 전도"

### 그리고 세상이 따라왔다 (2025-2026)

- Andrej Karpathy, 2025 — "Access to models is no longer a moat. Taste, insight, and context are king."
- Kent Beck, ["Augmented Coding & Design"](https://tidyfirst.substack.com/p/augmented-coding-and-design), 2025 — "Today's AI assistants lack taste. That giant function? The AI just added another 20 lines to it."
- Addy Osmani, ["The Factory Model"](https://addyosmani.com/blog/factory-model/), 2025 — "The era of programming as primarily a keystroke activity is over. The era of programming as primarily a thinking and judgment activity has been accelerating for decades and just shifted into a higher gear."
- John Carmack, [X post](https://x.com/ID_AA_Carmack/status/1921967025628578230), 2025 — "'Coding' was never the source of value. Problem solving is the core skill."
- Gergely Orosz, [The Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/the-future-of-software-engineering-with-ai), 2025 — "Well-developed 'systems taste' is still required upfront — LLMs, without strong guidelines, will slop-fill greedy solutions."
- Vivian Qu, ["There's no accounting for taste"](https://vivqu.com/blog/2025/06/29/no-accounting-for-taste/), 2025 — "Junior developers often hit a wall at 70% of a project due to accumulated technical debt from AI-generated code."
- Dane Knecht (Cloudflare CTO), [X post](https://x.com/dok2001/status/2006736670499233830), 2026.01 — "In 2026, taste is the engineering differentiator. Building is easy now. Knowing what to build, and what not to, is the hard part."
- Designative, ["Taste Is the New Bottleneck"](https://www.designative.info/2026/02/01/taste-is-the-new-bottleneck-design-strategy-and-judgment-in-the-age-of-agents-and-vibe-coding/), 2026.02 — "The real bottleneck was never coding — it was creativity and taste."
- Paul Graham, [X post](https://x.com/paulg/status/2022604692178522562), 2026.02 — "In the AI age, taste will become even more important. When anyone can make anything, the big differentiator is what you choose to make."
- Sam Altman, [Fortune](https://fortune.com/2026/02/27/openai-sam-altman-taste-get-jobseekers-hired-ai-jobpocalypse/), 2026.02 — "Leverage the one thing AI has so far struggled to replicate: human judgment."
