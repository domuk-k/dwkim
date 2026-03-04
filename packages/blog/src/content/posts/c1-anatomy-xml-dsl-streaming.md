---
title: "C1을 열어보다: XML-DSL과 스트리밍 아키텍처의 해부"
description: ""
pubDate: "2026-02-28"
series: "자동화의 패러다임 전환"
seriesOrder: 3
---

# C1을 열어보다: XML-DSL과 스트리밍 아키텍처의 해부

---

"사용할 수 없다면 배울 수 있는가."

앞선 두 편에서 Generative UI의 시대적 맥락과 에이전트 출력의 형태를 다뤘다. 이제 가장 구체적인 질문 — 실체는 어떻게 생겼는가.

Thesys C1을 직접 제품에 도입하려는 시도는 실패했다. 블랙박스 API, React 전용, LLM 선택 제한. 그런데 "사용 불가"라는 결론에서 멈추지 않고 "그럼 뭘 배울 수 있나"로 전환한 순간, SDK 바이너리를 열었다. 여기에 적는 것은 그 안에서 발견한 것들이다.

---

## 4개 패키지 생태계

C1은 단일 라이브러리가 아니다. 네 개의 npm 패키지가 각자의 역할을 분담한다.

| 패키지 | 버전 | 역할 | 핵심 의존성 |
|--------|------|------|------------|
| `@thesysai/genui-sdk` | 0.8.3 | 메인 진입점. `C1Chat`, `C1Component`, XML 파서, artifact 시스템 | htmlparser2 |
| `@crayonai/stream` | 0.6.4 | SSE 스트림 변환, JSON→SSE 인코딩, Zod→JSON Schema 변환 | best-effort-json-parser, eventsource-parser |
| `@crayonai/react-core` | 0.7.7 | 스레드 관리, 메시지 타입 정의, `processStreamedMessage()` | zustand, immer |
| `@crayonai/react-ui` | 0.9.16 | 47개 빌트인 UI 컴포넌트 | Recharts, Radix UI, TipTap |

386KB짜리 `genui-sdk`가 중심이고, 나머지 세 패키지가 Crayon이라는 이름으로 묶여 있다. Crayon은 Thesys가 오픈소스로 공개한 C1의 클라이언트 레이어다. 서버 사이드(C1 API 자체)는 블랙박스지만, 클라이언트 사이드의 전체 구조가 여기 드러나 있다.

눈에 띄는 의존성 스택이 있다.

- **htmlparser2** (v10) — XML을 바이트 단위로 점진 파싱. 이것이 "왜 XML인가"의 기술적 답이다.
- **best-effort-json-parser** — 불완전한 JSON을 최선의 노력으로 파싱. 스트리밍 중에 아직 닫히지 않은 JSON도 읽는다.
- **immer** — 파서 상태를 immutable하게 업데이트. `produce(state, draft => {...})`로 매 청크마다 상태 갱신.
- **eventsource-parser/encoder** — SSE의 양방향 처리.
- **Recharts** (v2.15) — 14종 차트.
- **TipTap** (v3.16) — artifact의 리치텍스트 편집.

---

## 왜 XML인가

이 질문이 리버스엔지니어링에서 가장 먼저 든 의문이었다. 2026년에 XML이라니. JSON이 표준인 시대에 왜 하필 XML을 택했을까.

답은 스트리밍에 있다.

```
JSON: { "type": "table", "data": [...] }  → 완전한 문자열이 와야 파싱 가능
XML:  <artifact type="table">             → 태그 열리는 순간 타입 파악 + 렌더러 마운트 가능
```

JSON은 태생적으로 "완성된 후에 파싱"되는 포맷이다. `best-effort-json-parser` 같은 라이브러리가 있지만, 중첩된 객체 안에 아직 닫히지 않은 배열이 있는 상태에서 타입을 판별하는 것은 본질적으로 불안정하다.

반면 XML은 태그가 열리는 순간 의미가 확정된다. `<artifact type="table">`이 도착하면, 아직 데이터가 하나도 오지 않았지만 "이것은 테이블이다"를 알 수 있다. 빈 테이블 스켈레톤을 즉시 마운트하고, JSON 데이터가 한 줄씩 스트리밍되면서 채워진다. C1은 이것을 **skeleton-first rendering**이라 부른다. htmlparser2의 `write(chunk)` 메서드가 이 바이트 단위 incremental parsing을 가능케 한다.

---

## 3-Layer 스트리밍 아키텍처

C1의 데이터 흐름은 세 개의 층으로 나뉜다.

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: Server — makeC1Response()                           │
│   writeThinkItem() → writeContent() → writeCustomMarkdown()  │
│   → XML 태그로 시맨틱 마크업 생성                               │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: Stream Transform — CrayonDataStreamTransformer      │
│   best-effort-json-parser로 JSON 경계 감지                    │
│   → SSE 이벤트 타입 분류 (tpl, tpl_props_chunk, text)         │
│   → eventsource-encoder로 SSE 포맷팅                         │
├──────────────────────────────────────────────────────────────┤
│ Layer 3: Client — processStreamedMessage()                   │
│   eventsource-parser로 SSE 이벤트 파싱                        │
│   → createMessage() / updateMessage() 디스패치                │
│   → C1Component가 XML 파싱 → 렌더러 매핑                      │
└──────────────────────────────────────────────────────────────┘
```

**Layer 1 (서버)** 은 XML-DSL을 생성한다. `makeC1Response()`라는 빌더 패턴이 핵심인데, 개발자가 `writeThinkItem()`, `writeContent()`, `writeArtifact()` 같은 메서드를 호출하면 내부에서 XML 태그로 래핑한다. LLM의 출력을 시맨틱하게 구조화하는 첫 단계.

**Layer 2 (변환)** 는 `CrayonDataStreamTransformer`다. 이 트랜스포머의 알고리즘은 독특하다:

1. Raw content 청크를 누적한다.
2. `best-effort-json-parser`로 `{ response: [{...}] }` 형태의 파싱을 시도한다.
3. 마지막 요소의 타입을 감지한다 — text면 즉시 emit, template이면 플래그를 세운다.
4. 다음 비-text 요소가 도착하면 이전 template을 emit한다.

"이전 것은 완성됐으니 보내도 된다"라는 휴리스틱이다. 다음 요소가 올 때까지 현재 요소의 완전성을 보장할 수 없으니, 다음 요소의 도착 자체를 현재 요소의 완료 시그널로 사용하는 것이다.

**Layer 3 (클라이언트)** 은 `processStreamedMessage()`다. SSE 이벤트를 받아서 zustand 스토어의 메시지를 생성하거나 업데이트한다. `C1Component`는 XML 파서를 내장하고 있어서, 스트리밍되는 XML을 점진적으로 파싱하면서 적절한 렌더러에 매핑한다.

---

## SSE 이벤트 6종

Layer 2에서 Layer 3으로 전달되는 SSE 이벤트는 정확히 6종이다.

```typescript
SSEType.TextDelta                    = "text"              // 텍스트 청크
SSEType.ResponseTemplate             = "tpl"               // 컴포넌트 스켈레톤
SSEType.ResponseTemplatePropsChunk   = "tpl_props_chunk"   // props 점진 도착
SSEType.ContextAppend                = "context_append"    // 컨텍스트 추가
SSEType.MessageUpdate                = "message_update"    // 메시지 ID 재할당
SSEType.Error                        = "error"             // 에러
```

이 중 `tpl`과 `tpl_props_chunk`의 분리가 C1 스트리밍의 핵심 메커니즘이다.

`tpl` 이벤트가 도착하면 컴포넌트의 타입과 레이아웃 정보만 담겨 있다. 이 순간 빈 스켈레톤이 화면에 마운트된다. 이후 `tpl_props_chunk` 이벤트가 연속으로 도착하면서 데이터(props)가 점진적으로 채워진다. 사용자는 테이블의 헤더가 먼저 나타나고, 행이 하나씩 추가되는 것을 본다. 차트의 축이 먼저 그려지고, 데이터 포인트가 하나씩 찍히는 것을 본다.

이것이 왜 중요한가. LLM이 100행짜리 테이블을 생성하는 데 15초가 걸린다면, 전통적인 접근에서 사용자는 15초 동안 빈 화면(또는 로딩 스피너)을 보고, 한꺼번에 완성된 테이블을 본다. skeleton-first에서는 1초 만에 빈 테이블이 나타나고, 14초 동안 행이 하나씩 채워지는 것을 지켜본다. 체감 지연시간이 15초에서 1초로 줄어든다.

---

## C1 XML-DSL 응답 포맷

LLM이 생성하는 XML-DSL의 실제 모습이다.

```xml
<content>분석 중입니다...</content>

<artifact type="slides" id="uuid-1" version="1">
  {"slides": [{"title": "결과", "content": "..."}]}
</artifact>

<artifact_diff>
  {"op": "replace", "id": "slide-1", "value": {"title": "수정된 결과"}}
  {"op": "append", "value": {"title": "새 슬라이드"}, "before_id": "slide-2"}
  {"op": "remove", "id": "slide-3"}
</artifact_diff>

<thinkitem ephemeral="true">
  <thinkitemtitle>데이터 분석</thinkitemtitle>
  <thinkitemcontent>BL 번호 매칭률 98.2%...</thinkitemcontent>
</thinkitem>

<custommarkdown># 요약 보고서\n...</custommarkdown>

<context>{"source": "BL대사", "confidence": 0.95}</context>
```

여섯 가지 태그가 각각의 의미를 가진다:

| 태그 | 역할 |
|------|------|
| `<content>` | 주 텍스트 응답 |
| `<artifact type="...">` | 리치 UI 컴포넌트 — 테이블, 차트, 폼, 슬라이드 등 |
| `<artifact_diff>` | 마운트된 artifact의 점진 업데이트 (replace/append/remove) |
| `<thinkitem ephemeral="true">` | 에이전트의 사고 과정(reasoning) 시각화 |
| `<custommarkdown>` | 별도 영역의 마크다운 렌더링 |
| `<context>` | 메타데이터 — 신뢰도, 출처 등 |

`<artifact>`와 `<artifact_diff>`의 분리가 깔끔하다 — 생성과 수정의 관심사가 완전히 나뉜다. 처음 artifact를 생성할 때는 `<artifact>` 안에 전체 JSON을 담고, 이미 화면에 마운트된 artifact를 수정할 때는 `<artifact_diff>`로 패치만 보낸다. 전체를 다시 보내지 않아도 슬라이드 한 장을 교체하거나 테이블에 행을 추가할 수 있다.

---

## XML 파서 상태 머신

이 XML을 클라이언트에서 어떻게 파싱하는가. htmlparser2의 `write(chunk)` 패턴이 핵심이다.

```typescript
// 파서 내부 상태
{
  parts: [{type, data, diff?, artifactType?, version?, id?}],
  think: [{title, content, ephemeral}],
  context: string,
  currentTag?: string,
  isContentClosed: boolean
}
```

`currentTag`가 상태 머신의 포인터다. XML 파서가 태그를 열면 `currentTag`가 그 태그 이름으로 설정되고, 이후 도착하는 모든 텍스트는 `currentTag`에 따라 적절한 필드에 누적된다. 태그가 닫히면 `currentTag`가 해제된다.

태그별 라우팅은 이렇다:
- `<content>` 열림 → `parts` 배열에 content 항목 생성, 텍스트 누적
- `<artifact type="...">` 열림 → UUID 할당, 새 artifact 항목 생성, JSON 데이터 누적
- `<artifact_diff>` 열림 → 마지막 artifact의 `.diff` 필드에 패치 JSON 누적
- `<thinkitem>` 열림 → reasoning 스택에 push
- `<thinkitemtitle>` / `<thinkitemcontent>` → 현재 thinkitem의 해당 필드에 누적

이 상태 머신이 `htmlparser2`의 `write(chunk)` 위에서 동작하므로, 한 번에 전체 XML을 받을 필요가 없다. 네트워크에서 청크가 도착할 때마다 `write(chunk)`를 호출하면, 파서가 점진적으로 상태를 갱신한다. `immer`의 `produce()`가 매 갱신마다 새로운 immutable 상태를 생성하여, React의 렌더 사이클과 자연스럽게 연결된다.

---

## C1 API 호출 — 실제 코드

실제로 C1을 사용하는 코드는 단순하다.

```typescript
// 실제 c1-playground API 라우트
const client = new OpenAI({
  baseURL: "https://api.thesys.dev/v1/embed/",
  apiKey: process.env.THESYS_API_KEY,
});

const llmStream = await client.chat.completions.create({
  model: "c1/openai/gpt-5/v-20251130",
  messages: messagesWithSystem,
  stream: true,
});
```

OpenAI SDK를 그대로 쓴다. `baseURL`만 Thesys 엔드포인트로 바꾸면, 텍스트 대신 XML-DSL이 스트리밍된다. 이 단순함이 C1의 가장 큰 무기이자, 동시에 한계다. 무기인 이유는 기존 코드에서 두 줄만 바꾸면 되니까. 한계인 이유는 그 뒤에서 무슨 일이 벌어지는지 개발자가 볼 수 없으니까.

이 블랙박스를 열어보니, 안에는 XML 파서, SSE 이벤트 라우터, skeleton-first 렌더링 엔진이 정교하게 맞물려 돌아가고 있었다. 다음 글에서는 이 파이프라인을 밑바닥부터 다시 만드는 이야기를 한다. SDK 바이너리에서 추출한 패턴을 60줄의 코드로 재구현하기까지, 결정의 맥락이 코드보다 중요했던 이유.

---

## 출처

- [Thesys 공식 사이트](https://www.thesys.dev/) / [C1 아키텍처 블로그](https://www.thesys.dev/blogs/generative-ui-architecture)
- [Crayon GitHub (오픈소스 클라이언트)](https://github.com/thesysdev/crayon)
- [htmlparser2 — 점진적 XML/HTML 파서](https://github.com/fb55/htmlparser2)
- [immer — Immutable state via structural sharing](https://github.com/immerjs/immer)
- [Thesys 문서](https://docs.thesys.dev/)


- [generative-ui-era-agent-face](/generative-ui-era-agent-face/)
- [generative-ui-conversation-output](/generative-ui-conversation-output/)
- [c0-open-source-pipeline-rebuild](/c0-open-source-pipeline-rebuild/)
