# Agent UX & Architecture Research — persona-api + dwkim CLI 개선 아이디어

## Research Summary

에이전트 UX 디자인 패턴, 대화형 AI 아키텍처, RAG 개선 기법, CLI 터미널 UX에 대한 웹 리서치를 수행하고, 현재 persona-api/dwkim CLI의 구현 상태와 대조 분석함.

---

## 1. Gap Analysis: 현재 잘 되어 있는 것

| 영역 | 현재 구현 | 연구에서 말하는 Best Practice |
|------|----------|----------------------------|
| **Hybrid Search (RRF)** | Dense + Sparse + RRF fusion | Hybrid RAG는 2025 표준 |
| **SEU (Semantic Uncertainty)** | Multi-response 코사인 유사도로 모호성 감지 | Uncertainty quantification 최신 트렌드 |
| **A2UI (Ask-to-Understand)** | 명확화 질문 + 키보드 네비게이션 | Shape of AI "Wayfinders" 패턴 |
| **Progress Visualization** | 파이프라인 단계별 애니메이션 | Microsoft "Status always visible" 원칙 |
| **HITL Feedback** | 3단계 피드백 + 교정 감지 + 이메일 에스컬레이션 | 다중 레이어 Human-in-the-Loop |
| **Graceful Failure** | 모든 노드 try/catch + fallback | 연구 #1 "Failure is normal" |
| **Privacy-first** | Anonymous UUID + 90일 TTL + GDPR 삭제 | Trust Builder 패턴 |
| **Type-safe SSE** | Discriminated Union 이벤트 | 견고한 프론트-백엔드 계약 |
| **Stream Cancellation** | ESC + AbortController | Human-Agent Control Handoff |

**결론**: 핵심 아키텍처와 RAG 파이프라인은 업계 best practice에 부합. 개선 여지는 주로 **UX 레이어**와 **개인화**에 있음.

---

## 2. Gap Analysis: 부족한 부분

### persona-api (Backend) Gaps

| Gap | 리서치 근거 | 현재 상태 | 영향도 |
|-----|-----------|----------|-------|
| **온보딩/가이드 대화 없음** | Guided conversation, Gradual engagement | 빈 입력 프롬프트만 제공 | **높음** — 이탈률 |
| **Follow-up 질문 비활성** | Wayfinder 패턴 | `followupNode` 구현됐지만 그래프에서 분리됨 | 중간 |
| **크로스 세션 메모리 없음** | Context Engineering (Memory tier) | 24시간 TTL 세션만. 재방문자 기억 못함 | 중간 |
| **인라인 소스 인용 없음** | Governors: Citations | 소스 개수만 표시, 인라인 인용 없음 | 중간 |
| **신뢰도 점수 없음** | Trust Builders: Caveats | SEU 데이터 있지만 사용자에게 전달 안됨 | 낮음-중간 |
| **쿼리 복잡도 라우팅 없음** | Multi-agent decomposition | "안녕"도 전체 RAG 파이프라인 통과 | 낮음-중간 |
| **응답 검증 없음** | Guarded Generation, SYNCHECK | 생성 후 사실 확인 없음 | 낮음-중간 |

### dwkim CLI (Frontend) Gaps

| Gap | 리서치 근거 | 현재 상태 | 영향도 |
|-----|-----------|----------|-------|
| **환영/온보딩 화면 없음** | Set expectations, Nudging | `/help` 힌트만 표시 | **높음** |
| **기능 범위 공개 없음** | Trust Builders: Disclosure | 뭘 할 수 있는지 안내 없음 | 중간 |
| **소스 상세 확장 불가** | Governors: Citations | "3 documents referenced"만 표시 | 중간 |
| **ChatView 모놀리스** | Componentize reusable parts | 900+ 줄 단일 컴포넌트 | 유지보수성 |
| **키보드 단축키 발견성 부족** | CLI best practices | `/help`에서만 확인 가능 | 낮음 |

---

## 3. 개선 아이디어

### A. persona-api 개선

#### A1. 인터랙티브 온보딩 이벤트 (Must Have) ✅ 구현됨
- `messageCount === 0`일 때 `welcome` SSE 이벤트 발송
- 내용: 인사말 + 가능한 주제 3-4개 + 스타터 질문 3개
- 기존 A2UI 질문 UI 재활용

#### A2. Follow-up 질문 재활성화 (Must Have) ✅ 구현됨
- `personaAgent.ts`의 그래프 엣지 재연결
- 조건: 명확화 질문 아닐 때 + 대화 초반(1-5턴)
- 이미 구현된 `followupNode` 활용

#### A3. 쿼리 복잡도 라우터 (Should Have) ✅ 구현됨
```
START → classify → [simple: directGenerate → done]
                  → [complex: rewrite → search → analyze → ...]
```
- 패턴 매칭으로 인사/감사/작별 감지 (LLM 호출 없이)
- 단순 쿼리는 < 300ms 응답 목표
- 불확실하면 전체 파이프라인으로 fallback

#### A4. 크로스 세션 메모리 (Should Have) ✅ 구현됨
- `DeviceService.getPersonalizationHints()`는 이미 interests/visitCount 반환
- `generateNode` 시스템 프롬프트에 주입: "이 사용자는 AI/ML, Frontend에 관심이 있고 5번째 방문"
- 재방문자에게 맞춤 인사 가능

#### A5. 인라인 소스 인용 (Should Have) ✅ 구현됨
- 시스템 프롬프트에 인용 지시 추가: `[이력서]`, `[블로그: AI Native Mindset]`
- `buildContext()`에 소스 제목 포함 (일부 이미 존재)
- 클라이언트에서 파싱 후 별도 색상으로 표시

#### A6. 신뢰도 점수 (Should Have) ✅ 구현됨
- `done` 이벤트 메타데이터에 `confidence: 'high' | 'medium' | 'low'` 추가
- 산출: 소스 수 + SEU 점수 조합

#### A7. 응답 검증 노드 (Could Have)
- `generate` → `verify` → `done` 사이에 검증 노드 추가
- 유틸리티 LLM으로 "이 답변에 소스에 없는 주장이 있는가?" 확인
- YES면 caveat 접두사 추가

#### A8. 시맨틱 응답 캐시 (Could Have)
- 기존 `embeddingCache` 확장하여 전체 RAG 응답도 캐시
- 코사인 유사도 > 0.95인 쿼리는 캐시된 응답 즉시 반환
- 데모/반복 질문에 효과적

### B. dwkim CLI 개선

#### B1. 인터랙티브 환영 화면 (Must Have) ✅ 구현됨
```
Welcome to dwkim — 김동욱의 AI 프로필 에이전트

알 수 있는 것들:
  [1] 커리어 & 경험
  [2] 기술 스택 & 스킬
  [3] 프로젝트 & 오픈소스
  [4] 개발 철학 & 블로그

질문을 입력하거나 주제를 선택해주세요.
```

#### B2. 기능 범위 공개 배너 (Must Have) ✅ 구현됨
- 프로필 카드 아래에 한 줄 안내:
  "동욱의 커리어, 스킬, 글에 대해 답변합니다."

#### B3. 소스 상세 확장 (Should Have) ✅ 구현됨
- 응답 후 `s` 키로 소스 상세 토글
- 제목, 타입 표시

#### B4. 신뢰도 시각화 (Should Have) ✅ 구현됨
- 백엔드 confidence 메타데이터 기반:
  - High: 일반 텍스트
  - Medium: `"⚡ 참고 정보 기반"` (dim muted)
  - Low: `"⚠ 확인 필요"` (peach 경고색)

#### B5. 세션 요약 on Exit (Could Have)
- Ctrl+C 시 대화 요약: "5개 질문 (커리어, 기술 스택). 관련 링크: [블로그], [LinkedIn]"

#### B6. 컴팩트 파이프라인 바 (Could Have)
```
[쿼리 분석] ✓ → [검색: 5건] ✓ → [생성 중...] ⏳
```
수직 리스트 대신 수평 파이프라인 바로 공간 절약

#### B7. ChatView 컴포넌트 분해 (Must Have — 유지보수) ✅ 구현됨
- `ProgressPipeline.tsx` — 파이프라인 시각화
- `SuggestedQuestions.tsx` — A2UI 네비게이션
- `EmailCollector.tsx` — 이메일 입력 폼
- `ExitFeedback.tsx` — 종료 피드백 대화상자
- `SourcesPanel.tsx` — 소스 상세 (신규)
- `MessageBubble.tsx` — 메시지 렌더링
- `StatusIndicator.tsx` — 로딩/연결 상태
- 상태 관리는 ChatView에 유지, props로 전달

---

## 4. MoSCoW 우선순위 백로그

### Must Have — ✅ 전부 구현됨
| ID | 항목 | 대상 | 크기 | 상태 |
|----|------|------|------|------|
| M1 | 인터랙티브 온보딩 (welcome 이벤트 + CLI 화면) | Both | S | ✅ |
| M2 | 기능 범위 공개 배너 | CLI | XS | ✅ |
| M3 | Follow-up 질문 재활성화 | API | XS | ✅ |
| M4 | ChatView 컴포넌트 분해 | CLI | M | ✅ |

### Should Have — ✅ 전부 구현됨
| ID | 항목 | 대상 | 크기 | 상태 |
|----|------|------|------|------|
| S1 | 쿼리 복잡도 라우터 (fast-path) | API | M | ✅ |
| S2 | 인라인 소스 인용 | Both | M | ✅ |
| S3 | 크로스 세션 메모리 (Device 기반) | API | M | ✅ |
| S4 | 신뢰도 점수 + CLI 시각화 | Both | S | ✅ |
| S5 | 소스 상세 확장 (토글) | CLI | S | ✅ |

### Could Have — 미구현 (향후 백로그)
| ID | 항목 | 대상 | 크기 |
|----|------|------|------|
| C1 | 응답 검증 노드 (Guarded Generation) | API | L |
| C2 | 시맨틱 응답 캐시 | API | M |
| C3 | 세션 요약 on Exit | CLI | S |
| C4 | 컴팩트 파이프라인 바 | CLI | S |
| C5 | 토픽 기반 맞춤 제안 질문 | API | M |

### Won't Have (현재 범위 밖)
- Multi-agent 분해 — 도메인이 좁아서 단일 에이전트로 충분
- Graph RAG — 문서 수가 적어 지식 그래프 오버헤드 불필요
- 음성/멀티모달 — CLI는 의도적으로 텍스트 전용
- Generative UI — 터미널 환경에서 동적 UI 생성 불가
- 사용자 선호도 튜닝 (필터, 모델 선택 등) — 개인 브랜드 에이전트에 과도한 설계

---

## 5. Top 5 User Stories

### US1: 인터랙티브 온보딩 (M1) ✅
**As a** dwkim CLI를 처음 사용하는 방문자,
**I want** 에이전트가 어떤 주제에 대해 알고 있는지 보고 시작 질문을 선택할 수 있게,
**So that** 목적을 바로 이해하고 의미 있는 대화를 시작할 수 있다.

수정 파일:
- `personaAgent.ts` — `welcome` 이벤트 타입 추가
- `chatService.ts` — `messageCount === 0` 조건 처리
- `personaApiClient.ts` — `StreamEvent` union에 welcome 타입 추가
- `ChatView.tsx` → 새 `WelcomeView.tsx` 컴포넌트

### US2: Follow-up 질문 재활성화 (M3) ✅
**As a** 동욱의 커리어에 대해 답변을 받은 사용자,
**I want** 관련 후속 질문을 추천받아서,
**So that** 뭘 더 물어볼지 고민하지 않고 자연스럽게 탐색할 수 있다.

수정 파일:
- `personaAgent.ts` — 그래프 엣지 재연결

### US3: ChatView 컴포넌트 분해 (M4) ✅
**As a** dwkim CLI를 유지보수하는 개발자,
**I want** ChatView를 집중된 서브 컴포넌트로 분리해서,
**So that** 개별 기능 수정 시 관련 없는 부분에 regression이 생기지 않는다.

수정 파일:
- `ChatView.tsx` → 7개 서브 컴포넌트 추출

### US4: 쿼리 복잡도 라우터 (S1) ✅
**As a** "안녕" 또는 "고마워"라고 인사하는 사용자,
**I want** 즉시 응답을 받아서,
**So that** 간단한 인사에 1-2초를 기다리지 않아도 된다.

수정 파일:
- `personaAgent.ts` — `classifyNode` 추가 + 조건 분기

### US5: 인라인 소스 인용 (S2) ✅
**As a** 동욱의 프로필을 에이전트로 확인하는 채용 담당자,
**I want** 응답의 각 주장에 어떤 문서가 근거인지 보이게,
**So that** 정보가 정확하고 할루시네이션이 아닌지 신뢰할 수 있다.

수정 파일:
- `llmService.ts` — 시스템 프롬프트에 인용 지시 추가
- `personaAgent.ts` — `buildContext()`에 소스 제목 포함
- `MarkdownText.tsx` — `[이력서]` 등 패턴 파싱 + muted 색상

---

## 6. Research Sources

### Agent UX Design Patterns
- [Aufait UX — Top 10 Agentic AI Design Patterns](https://www.aufaitux.com/blog/agentic-ai-design-patterns-enterprise-guide/)
- [Exalt Studio — 7 UX Patterns for AI Agents](https://exalt-studio.com/blog/designing-for-ai-agents-7-ux-patterns-that-drive-engagement)
- [Microsoft Design — UX Design for Agents](https://microsoft.design/articles/ux-design-for-agents/)
- [Shape of AI — AI UX Pattern Library](https://www.shapeof.ai)
- [AI UX Patterns](https://www.aiuxpatterns.com/)
- [Mania Labs — Agentic UX & Design Patterns](https://manialabs.substack.com/p/agentic-ux-and-design-patterns)

### Conversational AI Architecture
- [WebRTC Ventures — Voice AI Agent Patterns](https://webrtc.ventures/2025/12/how-to-choose-voice-ai-agent-patterns-conversation-based-vs-turn-based-design/)
- [Azure — AI Agent Orchestration Patterns](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [Google Cloud — Agentic AI Design Patterns](https://cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
- [Databricks — Agent System Design Patterns](https://docs.databricks.com/aws/en/generative-ai/guide/agent-system-design-patterns)
- [Google Developers — Context-Aware Multi-Agent Framework](https://developers.googleblog.com/architecting-efficient-context-aware-multi-agent-framework-for-production/)

### RAG Architecture
- [RAGFlow — From RAG to Context (2025 Review)](https://ragflow.io/blog/rag-review-2025-from-rag-to-context)
- [orq.ai — RAG Architecture Guide 2025](https://orq.ai/blog/rag-architecture)
- [LeewayHertz — Advanced RAG](https://www.leewayhertz.com/advanced-rag)

### CLI & Terminal UX
- [patterns.dev — AI UI Patterns](https://www.patterns.dev/react/ai-ui-patterns/)
- [Ivan Leo — Building a Coding CLI with React Ink](https://ivanleo.com/blog/migrating-to-react-ink)
- [Ink GitHub — React for CLI](https://github.com/vadimdemedes/ink)
