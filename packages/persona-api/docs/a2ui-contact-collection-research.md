# A2UI를 활용한 연락처 수집 UX 리서치

> 작성일: 2025-12-30
> 목적: persona-api의 리드 캡처 UX를 A2UI 프로토콜로 개선할 수 있는지 검토

---

## 1. A2UI란?

[A2UI (Agent-to-User Interface)](https://a2ui.org/)는 **Google이 공개한 오픈소스 프로토콜**로, AI 에이전트가 선언적 JSON으로 리치 UI를 생성할 수 있게 해준다.

### 핵심 특징

| 특징 | 설명 |
|------|------|
| **선언적** | 실행 코드가 아닌 JSON 데이터로 UI 정의 |
| **안전** | 클라이언트가 승인한 컴포넌트 카탈로그만 렌더링 |
| **크로스플랫폼** | 같은 JSON → Web, Mobile, Desktop 모두 지원 |
| **스트리밍** | LLM이 점진적으로 UI 생성 가능 |

### 아키텍처

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│   A2UI      │────▶│   Client    │
│  (LLM/API)  │     │   JSON      │     │  Renderer   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │  "연락처 폼       │  createSurface    │  네이티브
      │   생성해줘"       │  updateComponents │  TextField,
      │                   │  updateDataModel  │  Button 렌더
      ▼                   ▼                   ▼
```

---

## 2. 표준 컴포넌트 카탈로그

A2UI는 연락처 수집에 필요한 모든 컴포넌트를 제공:

### 입력 컴포넌트

| 컴포넌트 | 용도 | 속성 |
|----------|------|------|
| `TextField` | 이메일, 이름 입력 | `label`, `text`, `usageHint` (email, text) |
| `CheckBox` | 동의 체크 | `label`, `checked` |
| `Button` | 제출 버튼 | `child`, `action` |
| `DateTimeInput` | 날짜 선택 | `label`, `dateTime` |

### 레이아웃 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| `Card` | 폼 감싸기 |
| `Column` | 수직 배치 |
| `Row` | 수평 배치 |
| `Modal` | 팝업 폼 |

---

## 3. 연락처 수집 폼 예시 (A2UI JSON)

### 기본 연락처 폼

```json
{
  "createSurface": {
    "surfaceId": "contact-form",
    "catalogId": "standard"
  }
}
```

```json
{
  "updateComponents": {
    "surfaceId": "contact-form",
    "components": [
      {
        "id": "root",
        "component": { "Card": { "children": { "explicitList": ["title", "form-col"] } } }
      },
      {
        "id": "title",
        "component": { "Text": { "text": { "literalString": "연락처를 남겨주세요 😊" } } }
      },
      {
        "id": "form-col",
        "component": { "Column": { "children": { "explicitList": ["email-field", "name-field", "message-field", "submit-btn"] } } }
      },
      {
        "id": "email-field",
        "component": {
          "TextField": {
            "label": { "literalString": "이메일 *" },
            "text": { "dataBinding": "/formData/email" },
            "usageHint": "email"
          }
        }
      },
      {
        "id": "name-field",
        "component": {
          "TextField": {
            "label": { "literalString": "이름 (선택)" },
            "text": { "dataBinding": "/formData/name" },
            "usageHint": "text"
          }
        }
      },
      {
        "id": "message-field",
        "component": {
          "TextField": {
            "label": { "literalString": "전하고 싶은 말" },
            "text": { "dataBinding": "/formData/message" },
            "usageHint": "longText"
          }
        }
      },
      {
        "id": "submit-btn",
        "component": {
          "Button": {
            "child": { "Text": { "text": { "literalString": "연락처 보내기" } } },
            "action": {
              "name": "submit_contact",
              "context": {
                "email": { "path": "/formData/email" },
                "name": { "path": "/formData/name" },
                "message": { "path": "/formData/message" }
              }
            }
          }
        }
      }
    ]
  }
}
```

### 데이터 바인딩

```json
{
  "updateDataModel": {
    "surfaceId": "contact-form",
    "updates": [
      { "op": "add", "path": "/formData", "value": { "email": "", "name": "", "message": "" } }
    ]
  }
}
```

---

## 4. Persona-API 적용 방안

### 현재 구조 vs A2UI 적용 시

| 측면 | 현재 | A2UI 적용 시 |
|------|------|-------------|
| **UI 생성** | 클라이언트 하드코딩 | 서버에서 동적 생성 |
| **폼 검증** | 클라이언트 | 서버 + 클라이언트 |
| **UX 일관성** | 클라이언트 의존 | 프로토콜 보장 |
| **A/B 테스트** | 클라이언트 배포 필요 | 서버에서 즉시 변경 |

### 적용 시나리오

#### 시나리오 1: 5회 대화 후 연락처 제안

```
User: "dwkim의 경력이 궁금해요" (5번째 질문)

Agent Response:
├── 텍스트 답변: "dwkim은 10년차 개발자로..."
└── A2UI Surface: 연락처 수집 Modal
    ├── "더 자세한 이야기가 필요하시면..."
    ├── TextField (email)
    ├── TextField (name, optional)
    └── Button (submit / skip)
```

#### 시나리오 2: 30회 도달 시 차단 + 연락처

```
Agent Response (429):
├── A2UI Surface: 친절한 차단 Modal
    ├── Text: "오늘 많은 대화를 나눴네요!"
    ├── Text: "dwkim이 직접 연락드릴게요"
    ├── TextField (email) ← HITL interrupt
    ├── Button (submit)
    └── Text: "5분 후 다시 대화할 수 있어요"
```

---

## 5. 구현 옵션 비교

### Option A: 순수 A2UI 프로토콜 채택

**장점:**
- Google 표준, 장기적으로 생태계 확장
- 크로스플랫폼 지원 (웹, 모바일, 데스크톱)
- LLM이 자연스럽게 UI 생성 가능

**단점:**
- 클라이언트에 A2UI Renderer 구현 필요
- 초기 개발 비용 높음
- 아직 v0.9 (Draft), 스펙 변경 가능성

**구현 복잡도:** ⭐⭐⭐⭐ (높음)

### Option B: A2UI 영감받은 간소화 버전

**장점:**
- 빠른 구현 가능
- 기존 프론트엔드 호환
- 필요한 컴포넌트만 정의

**단점:**
- 표준과 다름, 확장성 제한
- 자체 유지보수 필요

**구현 복잡도:** ⭐⭐ (중간)

### Option C: 현재 방식 유지 + 메타데이터 강화

**장점:**
- 변경 최소화
- 즉시 적용 가능

**단점:**
- 클라이언트 의존적
- UI 유연성 제한

**구현 복잡도:** ⭐ (낮음)

---

## 6. 추천 접근법: Option B (간소화 버전)

A2UI의 핵심 아이디어를 차용하되, 단순화된 버전 구현:

### 제안 스키마

```typescript
interface AgentUIAction {
  type: 'contact_form' | 'info_modal' | 'choice';
  surface: {
    title: string;
    fields?: {
      id: string;
      type: 'email' | 'text' | 'longText';
      label: string;
      required?: boolean;
    }[];
    buttons: {
      id: string;
      label: string;
      action: 'submit' | 'skip' | 'dismiss';
      primary?: boolean;
    }[];
  };
}
```

### API 응답 예시

```json
{
  "success": true,
  "data": {
    "answer": "dwkim은 10년차 풀스택 개발자로...",
    "sessionId": "session_xxx",
    "shouldSuggestContact": true,
    "uiAction": {
      "type": "contact_form",
      "surface": {
        "title": "더 자세한 이야기가 필요하시면",
        "fields": [
          { "id": "email", "type": "email", "label": "이메일", "required": true },
          { "id": "name", "type": "text", "label": "이름 (선택)" }
        ],
        "buttons": [
          { "id": "submit", "label": "연락받기", "action": "submit", "primary": true },
          { "id": "skip", "label": "괜찮아요", "action": "skip" }
        ]
      }
    }
  }
}
```

---

## 7. 결론 및 다음 단계

### 결론

A2UI는 **장기적으로 유망한 표준**이지만, persona-api의 현재 규모와 요구사항에는 **간소화 버전(Option B)**이 적합.

### 향후 마이그레이션 경로

```
현재                     단기                      장기
─────────────────────────────────────────────────────────
shouldSuggestContact  →  uiAction 스키마  →  Full A2UI
(boolean flag)           (간소화 버전)        (표준 프로토콜)
```

### 액션 아이템

1. [ ] `uiAction` 스키마 정의 및 API 응답에 추가
2. [ ] 프론트엔드 `uiAction` 렌더러 구현
3. [ ] 5회/30회 시점에 적절한 `uiAction` 반환
4. [ ] (장기) A2UI 생태계 성숙 시 마이그레이션 검토

---

## 참고 자료

- [A2UI 공식 문서](https://a2ui.org/)
- [A2UI GitHub](https://github.com/google/A2UI)
- [A2UI v0.9 Specification](https://a2ui.org/specification/v0.9-a2ui/)
- [Google Developers Blog - Introducing A2UI](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
