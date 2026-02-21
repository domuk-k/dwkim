---
title: "워크플로우를 설계하면 웹앱이 나온다 — 5가지 설계 결정으로 본 Workflow Studio 개발기"
description: ""
pubDate: "2026-02-03"
---

# 워크플로우를 설계하면 웹앱이 나온다

**5가지 설계 결정으로 본 Workflow Studio 개발기**

---

## 들어가며

로우코드 플랫폼을 써본 적이 있다면, 이런 경험이 있을 것이다. 시각적 편집기로 워크플로우를 그리면 그럴듯하게 실행되는데, 그 결과물을 들여다보면 플랫폼에 종속된 런타임 위에서만 돌아간다. 코드를 꺼내 수정하고 싶어도 할 수 없거나, 꺼낼 수 있더라도 읽을 수 없는 수준이다.

Workflow Studio는 이 문제에 대한 하나의 실험이다. **시각적으로 워크플로우를 설계하면, UI + API + DB를 포함하는 독립 배포 가능한 풀스택 웹앱이 코드로 생성된다.** 생성된 코드는 Cloudflare Workers, Deno, Bun, Node.js 중 원하는 타겟에 배포할 수 있고, 이후에는 직접 수정할 수도 있다.

이 글은 특정 기술을 소개하는 글이 아니다. 프로젝트를 만들면서 맞닥뜨린 **5가지 설계 결정**에 대한 기록이다. 왜 그 선택을 했고, 어떤 대안을 버렸고, 결과적으로 어떤 trade-off를 안게 되었는지를 정리했다.

---

## 결정 1: 스키마 하나로 앱 전체를 표현한다

### AppSpec v2 — data / logic / ui 3축 모델

초기 버전(V1)의 타입 시스템은 `Workflow`, `WorkflowNode`, `WorkflowEdge`로 구성되어 있었다. 실행 로직을 표현하는 데는 충분했지만, 문제가 드러났다. 데이터 소스를 어디서 가져오는지, UI가 어떻게 보여야 하는지, 어떤 런타임에 배포하는지를 표현할 방법이 없었다. 로직만 있고 나머지는 하드코딩이었다.

코드 생성기를 만들려면 **앱의 전체 정의를 담은 단일 스키마**가 필요했다. 동시에 LLM이 생성할 수 있을 만큼 구조화되어 있어야 하고, 사람이 수정할 수 있을 만큼 읽기 쉬워야 했다.

대안으로 GraphQL Schema를 검토했지만, 런타임 의존성이 추가되는 것이 과했다. V1을 확장하는 방법도 있었지만, 로직 중심 구조에 데이터/UI를 끼워 넣으면 계층이 불분명해졌다.

결과적으로 AppSpec v2를 3개 축으로 분리했다:

```typescript
AppSpec {
  data:   { sources, schemas, mockData }     // 어떤 데이터를 쓰는가
  logic:  { nodes, edges, settings }         // 어떤 순서로 실행하는가
  ui:     { layout, steps, theme }           // 어떻게 보여주는가
  deploy: { target, runtimeMode, envVars }   // 어디에 배포하는가
}
```

이 구조 덕분에 **하나의 JSON으로 코드 생성, 프리뷰, 배포까지 전체 파이프라인이 동작**한다. LLM에게 "인보이스 3-Way Matching 워크플로우를 만들어줘"라고 요청하면, 이 스키마에 맞는 JSON이 나오고, 그대로 코드가 생성된다.

대가도 있다. 타입 정의가 크게 복잡해졌다. `DataSource`, `UIStep`, `GuardrailSpec` 등 관리해야 할 타입이 많아졌고, logic의 `nodeId`와 ui의 `steps`를 매핑해야 하는 연결 지점도 생겼다. 하지만 하나의 스키마로 앱 전체를 표현할 수 있다는 것은, 그 복잡도를 감수할 만큼 강력했다.

---

## 결정 2: 엔진은 어디서든 돌아야 한다

### 포터블 워커 런타임 — Web Standards Only

워크플로우 엔진이 동작해야 하는 환경이 두 곳이다. **Studio API**(Bun 런타임)에서는 빌더가 실행하고, **생성된 앱**(CF Workers, Deno, Node 등)에서는 배포 후 독립 실행된다. 문제는, 이 두 환경의 런타임 API가 다르다는 것이다. `Bun.file()`은 CF Workers에 없고, `Deno.readTextFile()`은 Node에 없다.

엔진을 두 벌 만드는 건 유지보수의 악몽이다. Node.js polyfill을 CF Workers에 넣는 것도 128MB 메모리 제한에 걸린다.

해결책은 **Web Standards API만 사용하는 포터블 엔진**을 분리하는 것이었다. `packages/worker-runtime` 패키지를 만들고, 이 안에서는 `fetch`, `Request`, `Response`, `crypto`, `structuredClone`만 쓸 수 있다. `setTimeout`, `process`, `Bun.*` 같은 런타임 특화 API는 금지다.

그러면 파일 읽기나 DB 조회는 어떻게 하는가? **Executor를 외부에서 주입한다:**

```typescript
const engine = new WorkflowEngine({
  executors: EXECUTOR_REGISTRY,  // 런타임별 구현체 주입
  hitlTypes: HITL_NODE_TYPES,
});
```

Studio에서는 Bun의 파일 I/O와 SQLite를 쓰는 executor를 주입하고, CF Workers에서는 KV/R2 바인딩을 쓰는 executor를 주입한다. 엔진 코어는 동일하고, 런타임 차이는 주입 지점에서 흡수된다.

이 구조의 trade-off는 명확하다. 엔진 내부에서 직접 파일을 읽거나 DB에 접근할 수 없다. 모든 외부 작업은 executor를 통해야 한다. 추상화 비용이 있지만, 코드 하나로 4개 런타임을 지원할 수 있다는 것은 그만한 가치가 있었다.

---

## 결정 3: 사람이 끼어들 수 있어야 한다

### HITL pause/resume — Fire-and-Forget 실행 모델

B/L 대사 워크플로우를 생각해보자. PDF를 업로드하고, OCR로 텍스트를 추출하고, AI가 필드를 파싱하고, DB와 대조한다. 여기까지는 자동이다. 그런데 마지막에 **사람이 결과를 확인하고 승인해야** 한다. 이 승인은 30분 뒤에 올 수도 있고, 다음 날 올 수도 있다.

11개 노드 타입 중 3개가 이런 **Human-in-the-Loop(HITL)** 노드다: 파일 업로드, 승인 게이트, AI 에이전트 채팅. DAG 실행 중 이 노드에 도달하면 실행이 일시정지되고, 외부 입력이 들어오면 이어서 실행해야 한다.

HTTP 요청으로 워크플로우를 트리거한 뒤, 승인이 올 때까지 연결을 유지하는 건 불가능하다. 대신 **fire-and-forget** 패턴을 택했다:

```typescript
// 실행 시작 — 의도적으로 await하지 않음
void this.executeWorkflow(ctx);
return toRunState(ctx);  // 즉시 응답
```

클라이언트는 800ms 간격으로 상태를 폴링한다. HITL 노드에서 멈추면 상태가 `paused`로 바뀌고, 프론트엔드는 승인 버튼이나 파일 업로드 UI를 띄운다. 사용자가 입력하면 `POST /api/runs/:id/resume`을 호출하고, 엔진은 다음 노드부터 이어서 실행한다.

WebSocket이나 SSE를 쓰면 실시간성은 올라가지만, CF Workers 환경에서의 호환성이 떨어진다. 800ms 폴링은 사용자 체감상 충분히 빠르고, 구현이 단순하다. 포터블 엔진의 원칙(Web Standards only)과도 일치한다.

---

## 결정 4: 생성된 앱은 4개 런타임에서 돌아야 한다

### Hono 멀티타겟 배포

Workflow Studio가 생성하는 앱은 고객사 인프라에 배포된다. 어떤 곳은 Cloudflare Workers를 쓰고, 어떤 곳은 온프레미스 Node.js 서버를 쓴다. 하나의 코드베이스에서 4개 타겟을 지원해야 했다.

후보는 넷이었다:

| 프레임워크 | 문제 |
|-----------|------|
| Express/Fastify | Node.js 전용, Workers 미지원 |
| Next.js | Vercel 종속, Workers에서 128MB 초과 |
| 직접 구현 (fetch handler) | 라우팅/미들웨어를 매번 생성해야 함 |
| **Hono** | Web Standards 네이티브, 멀티 런타임 지원 |

Hono는 `Request`/`Response` Web Standards API 위에서 동작하므로, 엔트리포인트만 바꾸면 된다:

```typescript
// CF Workers
export default app;

// Deno
Deno.serve({ port: 3000 }, app.fetch);

// Bun
export default { port: 3000, fetch: app.fetch };
```

14KB minified. Workers의 128MB 제한에도 여유가 있다. Express 미들웨어 생태계를 포기해야 하지만, 생성되는 앱은 라우팅과 SSR 정도만 필요하므로 Hono의 내장 기능으로 충분했다.

---

## 결정 5: Nginx 없이 단일 프로세스로 서빙한다

### Bun.serve() 직접 라우팅

Studio 자체를 배포할 때, API와 프론트엔드 SPA를 어떻게 서빙할지가 문제였다. 가장 먼저 시도한 건 `@elysiajs/static` 플러그인이었는데, 내부 빌드 에러로 500을 반환했다. Elysia의 `app.fetch` 래퍼를 시도하니 Response body가 0바이트였다. 와일드카드 `/*` 라우트는 루트 `/` 경로를 매칭하지 못했다.

Nginx를 앞에 두면 간단하지만, Docker 이미지에 Nginx를 추가하면 포터블리티가 떨어진다. `bun install && bun run start` 한 줄로 어디서든 실행할 수 있어야 했다.

결국 **Bun.serve()를 직접 사용**하고, 라우팅을 수동으로 처리했다:

```typescript
Bun.serve({
  async fetch(request) {
    const url = new URL(request.url);

    // 1. API → Elysia
    if (url.pathname.startsWith("/api/")) return app.handle(request);

    // 2. 정적 파일 (확장자 있음) → Bun.file()
    if (hasExtension(url.pathname)) return serveStatic(url.pathname);

    // 3. SPA fallback → index.html
    return new Response(await Bun.file(indexHtml).text(), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
```

여기서 발견한 Bun의 미묘한 버그가 있다. SPA fallback에서 `new Response(Bun.file(path), { headers })`로 커스텀 헤더를 넣으면 body가 비어서 온다. `.text()`로 먼저 읽은 뒤 Response를 만들어야 동작한다. 문서화되지 않은 quirk지만, 이걸 발견하는 데 반나절이 걸렸다.

결과적으로 Studio는 **Bun 프로세스 하나로 API + SPA + 정적 파일을 모두 서빙**한다. Docker 이미지가 단순하고, 배포도 한 줄이다. Bun에 종속된다는 trade-off가 있지만, Studio 자체는 배포 타겟이 정해져 있으므로 수용할 수 있었다. 생성되는 앱은 Hono 기반이라 Bun 종속이 아니다.

---

## 공통 원칙

5가지 결정을 돌아보면, 반복되는 우선순위가 있다:

- **포터블 > 편의** — 런타임 특화 API 대신 Web Standards. 편하지만 종속되는 것보다, 불편하지만 어디서든 도는 것을 택했다.
- **표준 > 프레임워크** — Hono를 택한 이유도, AppSpec을 JSON으로 설계한 이유도 같다. 표준에 가까울수록 수명이 길다.
- **단순 > 추상화** — Bun.serve()를 직접 쓰고, HITL을 폴링으로 처리한 것. 추상화 레이어를 쌓기보다 단순한 구현을 먼저 택했다.

이 결정들은 ADR(Architecture Decision Record)로 기록했다. 5개의 ADR을 쓰면서 느낀 건, **"왜 이렇게 했는가"를 기록하면 6개월 후의 나를 구한다**는 것이다. 코드는 "무엇"을 말하지만, "왜"는 말하지 않는다. ADR이 그 "왜"를 남겨준다.

---

## 현재 상태

Workflow Studio는 EC2(t3.medium)에 Docker Compose로 배포되어 있고, CloudFront를 통해 HTTPS로 접근 가능하다. Activepieces 워크플로우 엔진과 JWT 인증으로 연동되어 있으며, OpenRouter를 통해 AI 기능(워크플로우 자동 생성, 데이터 추출, 에이전트 채팅)이 동작한다.

---

## 부록: 기술 스택

| 레이어 | 기술 |
|--------|------|
| 런타임 | Bun (Studio), Hono (생성 앱) |
| 백엔드 | Elysia, SQLite (WAL mode) |
| 프론트엔드 | React 19, Vite, TanStack Query |
| AI | OpenRouter (Claude Sonnet, Gemini 2.0 Flash) |
| 인프라 | EC2, CloudFront, Docker Compose |
| 워크플로우 엔진 | 자체 DAG 엔진 + Activepieces 0.77.6 |
| 검증 | Zod, TypeScript strict mode |
| 문서화 | ADR 5개, Mermaid 다이어그램 |

```
┌─────────────────────────────────────────────┐
│            Workflow Studio                   │
├─────────────────┬───────────────────────────┤
│  React 19 (SPA) │  Elysia API (Bun)        │
│  - Dashboard    │  - Engine Facade          │
│  - App Editor   │  - Builder (Codegen)      │
│  - Preview      │  - AI Integration         │
├─────────────────┴───────────────────────────┤
│           packages/shared (Types)           │
├─────────────────────────────────────────────┤
│     packages/worker-runtime (Portable DAG)  │
└─────────────────────────────────────────────┘
          ↓ codegen
┌─────────────────────────────────────────────┐
│         Generated App (Hono + React SSR)    │
│  → CF Workers / Deno / Bun / Node           │
└─────────────────────────────────────────────┘
```
