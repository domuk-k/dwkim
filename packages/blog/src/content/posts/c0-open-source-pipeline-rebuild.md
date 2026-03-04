---
title: "블랙박스를 오픈소스로: C0 파이프라인 재구현기"
description: ""
pubDate: "2026-02-28"
series: "자동화의 패러다임 전환"
seriesOrder: 4
---

# 블랙박스를 오픈소스로: C0 파이프라인 재구현기

---

앞 글에서 C1의 내부 — XML-DSL 프로토콜, 3-Layer 스트리밍, SSE 이벤트 6종 — 를 해부했다. 이제 그 결과를 가지고 밑바닥부터 다시 만든다.

프로젝트 이름은 C0. "The Zero before One." Thesys가 C1을 만들었다면, 우리는 C0를 만든다. 같은 파이프라인, 완전 오픈소스, BYOK(Bring Your Own Key).

---

## C0라는 이름

C0는 Gen UI 파이프라인의 Zod를 꿈꾼다. Zod가 TypeScript 런타임 검증의 기본 프리미티브가 됐듯, C0는 Gen UI 스트리밍의 기본 프리미티브가 되려 한다. C1이 $49/월 블랙박스라면, C0는 같은 파이프라인을 MIT 라이선스로 열어놓는다.

왜 다시 만드는가? 가장 큰 이유는 **투명성**이다. C1은 블랙박스다. LLM 라우팅, 컴포넌트 선택 프롬프트, 품질 필터링 로직이 서버 사이드에 숨겨져 있어서 프로덕션에서 문제가 생기면 디버깅할 수 없다. C0는 파이프라인 전체가 공개되어 있다.

거기에 **자유도**가 더해진다. C1은 React 전용이고 지원 LLM이 제한되며 자체 API 호출이 필수다. C0는 어떤 OpenAI 호환 LLM이든, React부터 시작하되 Vue/Svelte로 확장할 수 있는 구조다. 그리고 코드 자체보다 "왜 이렇게 만들었는가"가 기록되는 것이 진짜 가치다 — 이 글 자체가 그 기록의 일부다.

---

## 3개 패키지, 하나의 파이프라인

C0는 세 개의 패키지로 구성된다.

| 패키지 | 역할 | C1 대응 |
|--------|------|---------|
| `@c0-ui/protocol` | XML-DSL 스트리밍 파서, 시리얼라이저, JSON repair | `@thesysai/genui-sdk`의 XML 파서 |
| `@c0-ui/server` | 시스템 프롬프트, OpenAI 스트림 어댑터, 응답 빌더 | C1 API 서버 (블랙박스) |
| `@c0-ui/react` | React 컴포넌트 렌더러, hooks, 채팅 UI | `@crayonai/react-core` + `@crayonai/react-ui` |

아키텍처 흐름은 이렇다.

```
LLM (XML-DSL output)
  ↓ stream
@c0-ui/server (transformOpenAIStream)
  ↓ ReadableStream<string>
@c0-ui/protocol (createStreamParser)
  ↓ ParsedResponse
@c0-ui/react (C0Chat → ArtifactRenderer)
  ↓
Browser UI
```

C1의 4개 패키지를 3개로 압축한 것은 의도적이다. C1은 `stream`과 `react-core`를 분리했지만, C0에서는 `protocol`이 프레임워크 무관한 코어 로직을 모두 담고, `react`가 React 바인딩을 담는다. 이렇게 하면 나중에 `@c0-ui/vue`나 `@c0-ui/svelte`를 만들 때 `protocol`을 그대로 재사용할 수 있다.

---

## XML 파서 재구현 — createStreamParser()

C0의 심장은 `createStreamParser()`다. C1 SDK의 `xmlParser-B5C8tiiX.js`를 리버스엔지니어링하여 재구현한 것이다. 핵심 코드를 걸어가 보자.

```typescript
export function createStreamParser(options?: StreamParserOptions): StreamParser {
  let state = initialState();

  const parser = new Parser(
    {
      onopentag(name, attrs) {
        state = produce(state, (draft) => {
          handleOpenTag(draft, name, attrs);
        });
      },
      ontext(text) {
        state = produce(state, (draft) => {
          handleText(draft, text);
        });
      },
      onclosetag() {
        let closingTag: TagName | undefined;
        state = produce(state, (draft) => {
          closingTag = handleCloseTag(draft);
        });

        // JSON repair on artifact close
        if (options?.repairJson && closingTag === 'artifact') {
          // ... repair logic
        }

        // Fire callbacks after produce()
        if (options && closingTag) {
          switch (closingTag) {
            case 'content':
              options.onContent?.(/* ... */);
              break;
            case 'artifact':
              options.onArtifact?.(/* ... */);
              break;
            case 'thinkitemcontent':
              options.onThink?.(/* ... */);
              break;
          }
        }
      },
    },
    { xmlMode: true, decodeEntities: true },
  );

  return {
    write(chunk: string) { parser.write(chunk); },
    getResult() { return toResponse(state); },
    reset() { state = initialState(); },
  };
}
```

세 가지 설계 결정이 이 코드에 담겨 있다.

**htmlparser2 + immer 조합.** htmlparser2가 XML을 점진 파싱하고, immer의 `produce()`가 매 이벤트마다 새로운 immutable 상태를 생성한다. `produce()`가 새 객체를 반환하므로 React의 리렌더링과 자연스럽게 연결된다.

**콜백 타이밍.** `options.onArtifact?.()`같은 콜백은 `produce()` 이후에 호출된다. `produce()` 안에서 호출하면 draft 상태(프록시 객체)가 콜백에 전달되어 버그가 생긴다. 콜백이 받는 것은 항상 확정된 immutable 상태여야 한다.

**repairJson 옵션.** C1과의 차별점이다. C1은 GPT-5 같은 강력한 모델을 기본으로 쓰지만, C0는 어떤 LLM이든 지원해야 한다. 소형 모델이 XML 안의 JSON을 깨뜨릴 수 있으므로, `repairJson` 옵션으로 자동 복구를 제공한다.

---

## Response Builder — makeC0Response()

서버 사이드의 핵심은 `makeC0Response()`다. C1의 `makeC1Response()`를 재구현한 것이다.

```typescript
export function makeC0Response(): C0ResponseWriter {
  const { readable, writable } = new TransformStream<string>();
  const writer = writable.getWriter();
  let accumulated = '';

  return {
    stream: readable,

    async writeThink({ title, content, ephemeral = true }) {
      const xml = wrapThinkItem(title, content, ephemeral);
      if (!ephemeral) accumulated += xml;
      await writer.write(xml);
    },

    async writeContent(content: string) {
      accumulated += content;
      await writer.write(content);
    },

    async writeArtifact(data: string, meta: ArtifactMeta) {
      const xml = wrapArtifact(data, meta);
      accumulated += xml;
      await writer.write(xml);
    },

    async writeCustomMarkdown(content: string) {
      const xml = wrapCustomMarkdown(content);
      accumulated += xml;
      await writer.write(xml);
    },

    async close() { await writer.close(); },

    getAccumulated() {
      return { role: 'assistant', content: accumulated };
    },
  };
}
```

C1의 `makeC1Response()`와 1:1 대응하되, 두 가지를 추가했다.

**`getAccumulated()` 메서드.** 스트리밍이 끝난 후 전체 응답을 대화 히스토리에 저장하기 위한 것이다. C1에서는 이 부분이 서버 사이드에 숨겨져 있지만, C0에서는 개발자가 직접 관리해야 한다. `TransformStream` 위에 축적(accumulated) 로직을 얹는 단순한 패턴.

**ephemeral think의 비축적.** `ephemeral: true`인 reasoning 항목은 `accumulated`에 포함되지 않는다. 사용자에게는 보여주되, 대화 히스토리에는 남기지 않는다. 이것은 C1의 동작을 그대로 따른 것이다 — reasoning은 그 순간의 투명성을 위한 것이지, 영속적 기록이 아니다.

---

## 21개 기본 렌더러 — DEFAULT_RENDERERS

클라이언트 사이드의 렌더러 레지스트리다.

```typescript
export const DEFAULT_RENDERERS: C0ComponentLibrary = {
  Table: DefaultTable,
  EditableTable: DefaultTable,
  StatusBoard: DefaultStatusBoard,
  Document: DefaultDocument,
  DocumentCollection: DefaultDocumentCollection,
  Markdown: DefaultMarkdown,
  Report: DefaultReport,
  FileDownload: DefaultFileDownload,
  FileUpload: DefaultFileUpload,
  Image: DefaultImage,
  Comparison: DefaultComparison,
  KeyValue: DefaultKeyValue,
  Summary: DefaultSummary,
  Chart: DefaultChart,
  Diff: DefaultDiff,
  Form: DefaultForm,
  ApprovalCard: DefaultApprovalCard,
  Notification: DefaultNotification,
  Timeline: DefaultTimeline,
  ProgressBar: DefaultProgressBar,
  Composed: DefaultComposed,
};
```

21개 타입이 등록되어 있다. C1의 47개와 비교하면 절반 이하지만, 이것은 의도적이다. C1의 47개는 `Input`, `Select`, `Button` 같은 로우레벨 컴포넌트를 포함하지만, C0의 21개는 `Table`, `Chart`, `Form` 같은 하이레벨 artifact 타입이다. 추상화 수준이 다르다.

오버라이드 패턴은 스프레드 연산자 하나로 해결된다.

```tsx
const myComponents = { ...DEFAULT_RENDERERS, Table: MyFancyTable };
<C0Chat components={myComponents} />
```

이 패턴이 shadcn/ui의 copy-paste 철학과 닿아 있다. 프레임워크가 컴포넌트를 소유하는 것이 아니라, 개발자가 소유한다. 기본 렌더러가 마음에 들지 않으면 통째로 교체하면 된다.

---

## Vinext 교훈: 구현은 싸졌다, 의사결정의 맥락이 moat

2026년 2월 24일, Cloudflare가 Vinext를 발표했다[^1]. Next.js를 Claude로 1주일, $1,100에 재구현한 것이다. HN에서 Sebastien Lorber가 남긴 코멘트가 인상적이었다[^2].

> "TDD users have always known that the value is in the spec, test suite, and API design. Not in the actual implementation."

C0와의 구조적 유사성이 보인다.

- Vinext: Next.js 테스트 스위트 = 스펙 → 재구현
- C0: Thesys C1 API 패턴 = 스펙 → 재구현

C0의 `createStreamParser()`는 349줄이다. `makeC0Response()`는 119줄이다. 코드 양으로 보면 대단한 것이 아니다. AI 코딩 도구가 발전하면서, "구현"의 비용은 급격히 떨어지고 있다.

그래서 뭐가 남나?

"왜 htmlparser2인가." "왜 immer인가." "왜 repairJson을 옵션으로 넣었는가." "왜 21개 타입이지 47개가 아닌가." "왜 ephemeral think는 축적하지 않는가." 이런 질문들의 답 — 의사결정의 맥락 — 이 코드 60줄보다 가치가 있다. Vinext가 "구현은 싸졌다"를 증명했다면, C0가 증명하려는 것은 "의사결정의 기록이 코드보다 오래 살아남는다"이다.

이 시리즈 자체가 그 기록이다.

---

## 출처

[^1]: Cloudflare, ["How we rebuilt Next.js with AI in one week"](https://blog.cloudflare.com/vinext/), 2026-02-24. GitHub: [cloudflare/vinext](https://github.com/cloudflare/vinext).
[^2]: Sebastien Lorber, Hacker News 코멘트, Vinext 토론 스레드, 2026-02-24.


- [c1-anatomy-xml-dsl-streaming](/c1-anatomy-xml-dsl-streaming/)
- [generative-ui-conversation-output](/generative-ui-conversation-output/)
- [competitor-code-xray-learnings](/competitor-code-xray-learnings/)
