---
title: "Generative UI의 시대: 에이전트에게 얼굴을 줄 때"
description: ""
pubDate: "2026-02-28"
series: "자동화의 패러다임 전환"
seriesOrder: 1
---

# Generative UI의 시대: 에이전트에게 얼굴을 줄 때

---

자동화의 입력이 Configuration에서 Conversation으로 바뀌었다. 입력이 바뀌었으니 출력도 바뀌어야 한다. 에이전트에게 "얼굴"을 준다는 것 — 왜 하필 지금인가.

---

## 프론트엔드의 빈자리

2025년 하반기부터 에이전트 인프라의 백엔드가 빠르게 성숙했다. MCP(Model Context Protocol)가 에이전트의 도구 접근을 표준화했고, Google의 A2A(Agent-to-Agent)가 에이전트 간 협업 프로토콜을 열었다. LangGraph, CrewAI, AWS Strands Agents 같은 오케스트레이션 프레임워크도 프로덕션 수준에 올라섰다.

그런데 사용자에게 보이는 부분 — 에이전트의 "얼굴" — 은 어떤가? 대부분의 에이전트 시스템에서 사용자가 보는 것은 여전히 텍스트다. 마크다운 테이블, 코드 블록, 줄줄이 나열되는 숫자들. `print(result)`의 세계. 에이전트가 100행의 데이터를 분석하고, 외부 API 세 개를 호출하고, 동료 에이전트와 협업해서 결론을 도출해도, 그 결과물이 사용자에게 전달되는 형태는 장문의 텍스트 한 덩어리인 경우가 대부분이다.

인프라가 먼저 성숙하고 인터페이스가 따라오는 패턴은 반복돼왔다. TCP/IP 위에 웹 브라우저가, REST API 위에 React가 올라왔다. 백엔드 인프라가 자리를 잡은 지금, 프론트엔드의 빈자리가 드러나고 있다.

---

## LLM 출력의 진화사

프론트엔드 빈자리의 맥락을 이해하려면, LLM 출력이 어떻게 진화해왔는지를 돌아봐야 한다.

초기에는 자유 텍스트(GPT-3 시절 정규식 파싱)에서 시작해, Function Calling과 Structured Outputs로 JSON 구조를 돌려받는 단계를 거쳤다. 데이터와 텍스트가 분리되기 시작한 것이다. 전환점은 그 다음부터다.

**3세대: 컴포넌트 명세.** Vercel AI SDK의 `streamUI`가 이 문을 열었다. LLM이 도구를 호출하면 그 도구가 React Server Component를 반환하는 패턴. "날씨 알려줘" → 모델이 `get_weather` 도구 호출 → 도구가 `<WeatherCard />` 컴포넌트 반환. LLM의 출력이 데이터가 아니라 인터페이스가 된 첫 번째 순간이었다. 하지만 Vercel은 이 실험의 개발을 일시 중단(paused)했다. Next.js RSC에 강하게 결합됐고, 프레임워크 종속성이 높았다.

**4세대: 완전한 UI 생성.** Thesys C1 API, CopilotKit, Google A2UI가 여기에 있다. LLM이 텍스트가 아닌 실행 가능한 인터페이스를 직접 생성하거나 명세한다. 차트, 테이블, 폼, 대시보드 — 사용자 의도에 맞는 인터랙티브 UI가 실시간으로 만들어진다. `streamUI`가 열어두고 떠난 문을 다른 플레이어들이 밀고 들어온 것이다.

LLM의 출력이 "읽는 것"에서 "사용하는 것"으로, 텍스트에서 인터페이스로 이동하고 있다.

---

## 숫자가 말하는 시장

시장 데이터가 이 방향을 뒷받침한다.

Gen AI in Software Development 시장은 2025년 $690M에서 2029년 $2.57B으로 성장이 예측되며, CAGR 38.7%라는 수치를 보인다[^1]. 이 안에서 Gen UI SDK/툴킷 세그먼트만 떼어보면, 2025년 약 $240M에서 2027년 $800M 규모로 추정된다[^1]. 벤처 자금도 몰리고 있다. Thesys는 $4M 시드를[^2], LangChain은 $125M 시리즈 B를, CopilotKit은 GitHub 28K stars를 기록했다.

Jakob Nielsen이 2026년 예측에서 인용한 Google Research 결과에 따르면, 사용자가 AI 생성 인터페이스를 상위 웹사이트보다 **90% 선호**하고, 텍스트 전용 AI 답변보다 **97% 선호**했다[^3]. 인간 전문 디자이너가 AI보다 아직 근소하게 앞서지만(56% vs 43%), Nielsen은 2026년 말이면 AI가 인간 디자이너를 추월할 것이라 예측했다[^4]. 사용자가 적극적으로 원하고 있다는 시그널이다.

한 가지 더. Vercel AI SDK의 `streamUI`가 사실상 deprecated된 이후, 대안을 찾는 개발자 수요가 폭발하고 있다[^5]. 실험적(experimental) 단계에서 멈췄고, Edge Runtime에서의 프로덕션 버그가 미해결 상태. 기존 사용자들이 대안을 필요로 하는 "공백"이 생긴 것이다.

---

## 다섯 진영의 경쟁 지형

이 공백을 메우려는 다섯 가지 접근법이 동시에 경쟁하고 있다.

| 접근법 | 핵심 아이디어 | 강점 / 약점 |
|--------|-------------|------------|
| **Thesys C1** | LLM이 직접 UI 생성 | baseURL만 변경하면 동작. 블랙박스, React 전용 |
| **CopilotKit + AG-UI** | 오픈 프로토콜로 표준화 | 16+ 이벤트 타입, LangGraph/CrewAI 등 확산. 아직 초기 |
| **Google A2UI** | UI를 코드가 아닌 데이터로 | 선언적 JSON, 크로스 플랫폼. 표현력 제한 |
| **MCP-UI** | 기존 MCP 생태계에서 확장 | 진입 장벽 낮음. 샌드박스 iframe 기반 |
| **Vercel RSC** | RSC로 UI 스트리밍 | 패러다임 대중화 공로. 개발 일시 중단 |

가장 활발한 움직임은 Thesys(LLM 직접 생성)와 CopilotKit(프로토콜 표준화) 진영이다. 전자는 단순함으로, 후자는 생태계 확장으로 승부하고 있다. 다섯 진영이 수렴할지 하나가 이길지는 모르지만, 방향은 같다 — 에이전트의 출력을 텍스트에서 인터페이스로.

---

## 빌드타임 AI vs 런타임 AI

여기서 빠지기 쉬운 혼동이 하나 있다. "AI로 UI를 만든다"는 말은 두 가지 전혀 다른 의미를 가진다.

**빌드타임 AI**는 개발자를 위한 코드 생성 도구다. v0.dev가 프롬프트 하나로 프로덕션급 React/Tailwind 컴포넌트를 만들고, bolt.new가 프론트+백엔드+DB 전체를 스캐폴딩한다. 출력은 소스 코드이고, 대상은 개발자이며, 시점은 빌드타임이다.

**런타임 AI**는 최종 사용자를 위한 실시간 UI 생성이다. Thesys C1이 사용자의 "매출 트렌드 보여줘"에 라이브 라인 차트를 생성하고, CopilotKit이 대화 중에 인터랙티브 폼을 띄운다. 출력은 실시간 인터랙티브 UI이고, 대상은 최종 사용자이며, 시점은 런타임이다.

둘 다 "AI로 UI를 만든다"이지만, 풀려는 문제가 근본적으로 다르다. v0은 개발자의 생산성을 높이고, C1은 사용자의 경험을 바꾼다. 전자는 "코드를 더 빨리 쓰는 것"이고, 후자는 "에이전트가 매 순간 맥락에 맞는 얼굴을 만드는 것"이다. Generative UI 논의의 핵심은 후자, 런타임 AI다.

---

## 에필로그: 얼굴은 누가 결정하는가

에이전트에게 얼굴을 준다는 것은, 결국 "UI의 결정권을 누가 가지느냐"라는 질문으로 귀결된다.

CopilotKit은 Generative UI를 세 가지 스펙트럼으로 분류한다[^6]. **Static** — 미리 만든 컴포넌트에 AI가 데이터만 채운다. 결제 화면, 컴플라이언스 대시보드처럼 미션 크리티컬한 영역. **Declarative** — 컴포넌트 레지스트리에서 AI가 조합을 결정한다. 대시보드, 챗 어시스턴트에 현실적. **Open-ended** — AI가 HTML/CSS를 직접 생성한다. 프로토타이핑에는 강력하지만 프로덕션에는 위험하다.

"모델에 더 많은 자유를 줄수록, 가드레일에 더 많은 투자가 필요하다." 이 스펙트럼에서 어디에 서느냐는 기술적 선택인 동시에 철학적 선택이다.

지금 벌어지고 있는 것은 단순히 "챗봇에 차트를 넣자"가 아니다. 에이전트가 무엇을 할 수 있는지(MCP), 에이전트끼리 어떻게 협업하는지(A2A)의 문제가 해결되고 나니, 이제 에이전트가 사용자에게 어떤 모습으로 나타나는지가 남은 미해결 퍼즐이 된 것이다. MCP(손) + A2A(동료) + AG-UI(얼굴) — 세 계층이 갖추어지면 에이전틱 인프라 스택이 완성된다.

다음 글에서는 이 "얼굴"의 구체적인 형태를 다룬다. 에이전트의 출력이 텍스트가 아니라 인터페이스가 되어야 할 때, 그 인터페이스는 어떤 모습이어야 하는가. Thesys라는 11명짜리 스타트업이 내놓은 답, Review Paradox를 구조적으로 해결하는 UI 패턴, 그리고 Confidence-based Routing이 왜 Generative UI를 필수로 만드는지를 이야기할 것이다.

---

## 출처

[^1]: Research and Markets / Grand View Research, "Gen AI in Software Development" 시장 분석. TAM/SAM 추정은 [C0 PRD 시장 분석](https://github.com/user/c0) 참조.
[^2]: [BusinessWire — "Thesys Introduces C1 to Launch the Era of Generative UI"](https://www.businesswire.com/news/home/20250418761213/en/Thesys-Introduces-C1-to-Launch-the-Era-of-Generative-UI), 2025.
[^3]: Jakob Nielsen, ["Generative UI from Gemini 3 Pro"](https://jakobnielsenphd.substack.com/p/generative-ui-google), Nielsen Norman Group Substack. Google Research 결과 인용.
[^4]: Jakob Nielsen, ["18 Predictions for 2026"](https://jakobnielsenphd.substack.com/p/2026-predictions), Nielsen Norman Group Substack.
[^5]: [Vercel AI SDK — RSC Overview](https://ai-sdk.dev/docs/ai-sdk-rsc/overview). streamUI는 experimental 단계에서 개발이 일시 중단됨.
[^6]: CopilotKit, ["The Three Kinds of Generative UI"](https://www.copilotkit.ai/blog/the-three-kinds-of-generative-ui), 2026.


- [generative-ui-conversation-output](/generative-ui-conversation-output/)
