# Ink 졸업: TUI 마이그레이션 플랜

## 리서치 요약

### 업계 동향 (2025-2026)
- **Anthropic(Claude Code)**: Ink를 버리지 않고 **React를 유지**한 채 커스텀 렌더러("ink2")를 만들어 differential rendering 적용. DEC mode 2026(synchronized output) 지원으로 flickering 제거.
- **pi-tui (@mariozechner/pi-tui)**: Mario Zechner가 만든 **React 없는 imperative TUI 프레임워크**. Peter Steinberger가 "differential rendering의 gold standard"로 평가. 코딩 에이전트 pi의 TUI.
- **핵심 교훈**: React 자체가 문제가 아니라 **Ink의 전체 화면 재렌더링 방식**이 문제. 해결책은 (A) React 유지 + 커스텀 렌더러 또는 (B) React 없는 event-driven 프레임워크.

## 추천: Option B — pi-tui 기반 마이그레이션

### 왜 pi-tui인가

| 기준 | 자체 구현 (raw stdout) | pi-tui | Ink 유지 + 커스텀 렌더러 |
|------|------------------------|--------|--------------------------|
| 개발 비용 | 높음 (모든 것 직접 구현) | 낮음 (빌트인 컴포넌트) | 중간 (렌더러만 교체) |
| 번들 크기 | 최소 | 작음 (React 없음) | 큼 (React + yoga 유지) |
| Flickering | 직접 해결 필요 | CSI 2026 동기화 출력 | Anthropic처럼 해결 가능 |
| 내장 컴포넌트 | 없음 | Text, Input, Editor, Markdown, Loader, SelectList, Overlay | Ink 컴포넌트 그대로 |
| CJK(한국어) IME | 직접 구현 필요 | IME 지원 내장 (CURSOR_MARKER + Focusable) | Ink 기본 지원 |
| 스트리밍 | stdout.write 직접 | setText() + requestRender() | setStreamContent re-render |
| Overlay(모달) | 직접 구현 | showOverlay() 내장 | 조건부 렌더링 |
| 테스트 용이성 | 높음 | 중간 | 낮음 (ink-testing-library) |

**pi-tui의 결정적 장점:**
1. **한국어 IME 지원** — CJK 입력 메서드 에디터 지원이 내장. raw readline로 직접 구현하면 IME 처리가 매우 어려움.
2. **Overlay 시스템** — 이메일 수집, 피드백 프롬프트 등 HITL UI를 overlay로 깔끔하게 구현 가능.
3. **Markdown 컴포넌트** — 별도 렌더링 없이 빌트인 지원.
4. **Differential rendering** — 변경된 줄만 업데이트. CSI 2026 동기화 출력으로 flickering 제거.
5. **실전 검증** — pi 코딩 에이전트에서 이미 사용 중이며, gold standard으로 평가받음.

### 아키텍처

```
src/
  index.ts                     # 진입점 (TUI 초기화)
  app.ts                       # 메인 앱: TUI 셋업 + 이벤트 루프
  state/
    types.ts                   # AppState discriminated union + AppEvent
    machine.ts                 # transition(state, event) → state 순수 함수
  components/
    chatHistory.ts             # pi-tui Text 기반 메시지 히스토리
    streamingView.ts           # 스트리밍 응답 표시 (setText 활용)
    welcomeView.ts             # 환영 화면 + 스타터 질문 (SelectList 활용)
    statusBar.ts               # 상태 표시 (Loader 활용)
    progressPipeline.ts        # RAG 파이프라인 진행률
    suggestedQuestions.ts      # A2UI 추천 질문 (SelectList 활용)
  overlays/
    emailCollector.ts          # HITL 이메일 수집 (Overlay + Input)
    feedbackPrompt.ts          # 응답 피드백 (Overlay)
    exitFeedback.ts            # 종료 피드백 (Overlay)
    sourcesPanel.ts            # 소스 상세 패널 (Overlay)
  ui/
    data.ts                    # 아이콘, 프로필 데이터 (변경 없음)
    theme.ts                   # chalk 기반 Catppuccin 테마
  utils/
    personaApiClient.ts        # 변경 없음
    deviceId.ts                # 변경 없음
```

**핵심 설계 유지: State Machine**
- pi-tui의 imperative 모델과 state machine은 자연스럽게 결합
- `transition(state, event) → state` 순수 함수는 그대로
- pi-tui의 `handleInput()` → state machine event 발행 → 상태 전이 → UI 업데이트

### State Machine (변경 없음)

```typescript
type AppMode =
  | { mode: 'connecting' }
  | { mode: 'welcome'; selectedStarterIdx: number }
  | { mode: 'idle'; input: string }
  | { mode: 'loading'; loadingState: LoadingState; streamContent: string; progressItems: ProgressItem[] }
  | { mode: 'emailInput'; input: string; escalation: { show: boolean; reason: string } }
  | { mode: 'feedback' }
  | { mode: 'exitFeedback' }
  | { mode: 'error'; message: string }
```

### 컴포넌트 매핑

| 현재 (Ink/React) | 새 (pi-tui) | pi-tui 기능 활용 |
|-------------------|-------------|-------------------|
| `<Static>` 메시지 히스토리 | `tui.addChild(new Text(...))` | append-only, differential rendering |
| `<MarkdownText>` | `new Markdown(content)` 또는 marked-terminal 유지 | 빌트인 Markdown 컴포넌트 |
| `<TextInput>` | `new Input(tui)` 또는 `new Editor(tui)` | IME 지원, autocomplete |
| `<Spinner>` + StatusIndicator | `new Loader()` | 빌트인 로더 |
| `<WelcomeView>` + 스타터 질문 | `new SelectList(items)` | 키보드 네비게이션 내장 |
| `<SuggestedQuestions>` | `new SelectList(questions)` | 키보드 네비게이션 내장 |
| `<EmailCollector>` (Box border) | `tui.showOverlay(emailComponent, { anchor: 'bottom' })` | Overlay 시스템 |
| `<FeedbackPrompt>` | `tui.showOverlay(feedbackComponent)` | Overlay 시스템 |
| `<ExitFeedback>` | `tui.showOverlay(exitFeedback)` | Overlay 시스템 |
| `<SourcesPanel>` | `tui.showOverlay(sourcesPanel)` | Overlay 시스템 |
| `useInput()` 58줄 | `handleInput()` per component + state machine | 이벤트 기반 |

## 마이그레이션 단계

### Phase 1: 기반 구축

| 단계 | 작업 | 파일 |
|------|------|------|
| 1.1 | pi-tui 설치 및 기본 TUI 셋업 | `package.json`, `src/index.ts`, `src/app.ts` |
| 1.2 | State 타입 정의 (discriminated union) | `src/state/types.ts` |
| 1.3 | 순수 전이 함수 구현 | `src/state/machine.ts` |
| 1.4 | theme.ts chalk 전환 | `src/ui/theme.ts` |
| 1.5 | Phase 1 테스트 | `src/__tests__/state/` |

### Phase 2: 핵심 컴포넌트

| 단계 | 작업 | 파일 |
|------|------|------|
| 2.1 | 메시지 히스토리 (Text 기반) | `src/components/chatHistory.ts` |
| 2.2 | 스트리밍 뷰 (setText 기반) | `src/components/streamingView.ts` |
| 2.3 | 입력 컴포넌트 (Input/Editor) | app.ts 내 통합 |
| 2.4 | 환영 화면 (SelectList) | `src/components/welcomeView.ts` |
| 2.5 | 상태/로더/진행률 | `src/components/statusBar.ts`, `progressPipeline.ts` |

### Phase 3: HITL Overlay

| 단계 | 작업 | 파일 |
|------|------|------|
| 3.1 | 이메일 수집 overlay | `src/overlays/emailCollector.ts` |
| 3.2 | 피드백 overlay | `src/overlays/feedbackPrompt.ts` |
| 3.3 | 종료 피드백 overlay | `src/overlays/exitFeedback.ts` |
| 3.4 | 소스 패널 overlay | `src/overlays/sourcesPanel.ts` |
| 3.5 | 추천 질문 (SelectList) | `src/components/suggestedQuestions.ts` |

### Phase 4: 전환 및 정리

| 단계 | 작업 | 파일 |
|------|------|------|
| 4.1 | 빌드 스크립트 업데이트 | `script/build.js` |
| 4.2 | 기존 .tsx 파일 삭제 | `src/ui/*.tsx`, `src/index.tsx` |
| 4.3 | 의존성 정리 | `package.json` |
| 4.4 | tsconfig JSX 설정 제거 | `tsconfig.json` |
| 4.5 | CLAUDE.md 업데이트 | 프로젝트 문서 |
| 4.6 | 테스트 및 수동 검증 | 전체 기능 테스트 |

## 의존성 변경

### 제거
- `react`, `ink`, `ink-spinner`, `ink-text-input`
- `@types/react`, `ink-testing-library` (devDeps)

### 추가
- `@mariozechner/pi-tui` — TUI 프레임워크

### 유지
- `chalk` — 색상 (pi-tui도 chalk 사용)
- `marked`, `marked-terminal` — 마크다운 (pi-tui Markdown 컴포넌트와 비교 후 결정)
- `@catppuccin/palette` — 테마

### 빌드 스크립트 변경
- `entryPoints`: `src/index.tsx` → `src/index.ts`
- `jsx: 'automatic'` 제거
- `emptyModulePlugin` 제거

## 검증 방법

1. `bun run build` 성공
2. `bun run type-check` 에러 없음
3. `bun test` 전체 통과
4. 수동 검증:
   - health check → 환영 화면
   - 스타터 질문 네비게이션 (↑↓, 숫자키, Enter)
   - 질문 입력 → 스트리밍 응답 (flickering 없음)
   - `/help`, `/status`, `/clear`
   - ESC 스트리밍 취소
   - `s` 소스 패널 overlay
   - Ctrl+C → exit feedback overlay
   - A2UI 추천 질문
   - 한국어 입력 IME 정상 동작
5. `bun run lint` 통과

## 리서치 출처

- [The Signature Flicker — Peter Steinberger](https://steipete.me/posts/2025/signature-flicker)
- [pi-tui on npm](https://www.npmjs.com/package/@mariozechner/pi-tui)
- [pi-mono GitHub](https://github.com/badlogic/pi-mono/tree/main/packages/tui)
- [What I learned building a minimal coding agent — Mario Zechner](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)
- [Claude Code Internals: Terminal UI — Medium](https://kotrotsos.medium.com/claude-code-internals-part-11-terminal-ui-542fe17db016)
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/)
- [@clack/prompts](https://www.clack.cc/)
