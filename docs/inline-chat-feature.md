# Inline Chat Feature

> npx dwkim 인터랙티브 채팅 기능 설계 문서

## 개요

블로그 홈페이지의 `npx dwkim` 스니펫을 클릭하면 인라인으로 채팅 UI가 펼쳐지는 기능.
persona-api와 연동하여 방문자가 dwkim에 대해 질문할 수 있다.

## UX 설계 (2025 트렌드 기반)

### 핵심 원칙

- **Text-First Design**: 복잡한 UI 대신 단순한 입력창
- **Progressive Disclosure**: 점진적 노출
- **Smart Context Retention**: 대화 히스토리 유지
- **Minimalism**: leerob 스타일 유지

### 인터랙션 흐름

```
[npx dwkim]  ← hover 시 subtle한 "▶" 또는 cursor 변화
     ↓ 클릭
[npx dwkim]  ✕
┌─────────────────────────────────┐
│ [무엇이든 물어보세요...]    [→] │
└─────────────────────────────────┘
     ↓ 입력 후
[npx dwkim]  ✕
│ Q: 어떤 기술 스택을 쓰나요?
│ A: 주로 TypeScript, React...
│
│ [추가 질문...]              [→] │
```

## 기술 스택

| 영역 | 기술 |
|-----|------|
| 프론트엔드 | Preact Island (Astro) |
| 상태관리 | Preact Signals 또는 useState |
| API | persona-api (Fly.io) |
| 저장소 | localStorage (대화 히스토리) |

## 컴포넌트 구조

```
src/components/
├── ui/
│   ├── Snippet.astro          # 기존 (트리거 추가)
│   └── InlineChat/
│       ├── InlineChat.tsx     # Preact Island
│       ├── ChatInput.tsx      # 입력 컴포넌트
│       ├── ChatMessage.tsx    # 메시지 컴포넌트
│       └── chatStore.ts       # 상태 관리
```

## API 연동

### Endpoint

```
POST https://persona-api.fly.dev/chat
```

### Request

```typescript
interface ChatRequest {
  message: string
  conversationHistory?: {
    role: 'user' | 'assistant'
    content: string
  }[]
  options?: {
    maxSearchResults?: number
    includeSources?: boolean
  }
}
```

### Response

```typescript
interface ChatResponse {
  success: boolean
  data: {
    answer: string
    sources?: {
      id: string
      content: string
      metadata: {
        type: string
        title?: string
      }
    }[]
    usage: {
      promptTokens: number
      completionTokens: number
    }
  }
}
```

## 구현 단계

### Phase 1: 기본 기능
- [ ] InlineChat 컴포넌트 생성
- [ ] Snippet에 클릭 트리거 추가
- [ ] persona-api 연동
- [ ] 기본 에러 핸들링

### Phase 2: UX 개선
- [ ] 로딩 상태 (typing indicator)
- [ ] localStorage 대화 히스토리
- [ ] 스트리밍 응답 (선택)
- [ ] 모바일 최적화

### Phase 3: 모니터링
- [ ] 로깅 구현
- [ ] Rate limit 처리
- [ ] 에러 리포팅

## 고려사항

### 접근성
- 키보드 네비게이션
- 스크린 리더 지원 (aria-live)
- 포커스 관리

### 성능
- Preact Island로 JS 번들 최소화
- 지연 로딩 (클릭 시에만 로드)

### 에러 처리
- Rate limit 초과 시 친절한 메시지
- 네트워크 오류 시 재시도 옵션
- API 다운 시 fallback 메시지

---

작성일: 2025-12-22
