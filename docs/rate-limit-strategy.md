# Rate Limit & Logging Strategy

> persona-api와 블로그 인라인 채팅 기능의 Rate Limit 및 로깅 전략

## 현재 상태

### persona-api 현재 설정

```
Rate Limit: 8 req/min (production)
배포: Fly.io (persona-api.fly.dev)
Redis: 선택적 (없으면 메모리 기반)
```

## Rate Limit 전략

### 1. 다층 Rate Limiting

```
┌─────────────────────────────────────────────────┐
│                   클라이언트                      │
│  └─ localStorage 쿨다운 (soft limit)            │
├─────────────────────────────────────────────────┤
│                   API Gateway                    │
│  └─ IP 기반 rate limit (현재 8/min)             │
├─────────────────────────────────────────────────┤
│                   Application                    │
│  └─ 토큰 사용량 기반 throttling                  │
└─────────────────────────────────────────────────┘
```

### 2. 클라이언트 측 (블로그)

```typescript
// chatStore.ts
const RATE_LIMIT = {
  maxRequests: 5,        // 분당 최대 요청
  windowMs: 60_000,      // 1분 윈도우
  cooldownMs: 10_000,    // 요청 간 최소 간격
}

interface RateLimitState {
  requestCount: number
  windowStart: number
  lastRequest: number
}

function canMakeRequest(state: RateLimitState): boolean {
  const now = Date.now()

  // 윈도우 리셋
  if (now - state.windowStart > RATE_LIMIT.windowMs) {
    return true
  }

  // 쿨다운 체크
  if (now - state.lastRequest < RATE_LIMIT.cooldownMs) {
    return false
  }

  // 요청 횟수 체크
  return state.requestCount < RATE_LIMIT.maxRequests
}
```

### 3. 서버 측 (persona-api)

#### 현재 구현 확인 필요

```typescript
// 제안: 계층별 limit
const rateLimitConfig = {
  // 일반 요청
  standard: {
    windowMs: 60_000,
    max: 8,
  },
  // 버스트 보호
  burst: {
    windowMs: 1_000,
    max: 2,
  },
  // 일일 한도 (선택)
  daily: {
    windowMs: 86_400_000,
    max: 100,
  }
}
```

### 4. Rate Limit 응답 처리

```typescript
// 클라이언트 측 에러 핸들링
async function sendMessage(message: string) {
  try {
    const response = await fetch(API_URL, { ... })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new RateLimitError(retryAfter)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof RateLimitError) {
      showMessage(`잠시 후 다시 시도해주세요 (${error.retryAfter}초)`)
    }
  }
}
```

## 로깅 전략

### 1. 클라이언트 로깅 (블로그)

```typescript
// 로깅 레벨
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 로그 이벤트 타입
type ChatEvent =
  | { type: 'chat_opened' }
  | { type: 'chat_closed' }
  | { type: 'message_sent'; messageLength: number }
  | { type: 'message_received'; responseTime: number }
  | { type: 'rate_limit_hit' }
  | { type: 'error'; code: string; message: string }

// 로깅 함수
function logChatEvent(event: ChatEvent) {
  const timestamp = new Date().toISOString()
  const logEntry = { timestamp, ...event }

  // 개발 환경: 콘솔 출력
  if (import.meta.env.DEV) {
    console.log('[InlineChat]', logEntry)
  }

  // 프로덕션: localStorage에 저장 (디버깅용)
  const logs = JSON.parse(localStorage.getItem('chat_logs') || '[]')
  logs.push(logEntry)

  // 최근 100개만 유지
  if (logs.length > 100) logs.shift()
  localStorage.setItem('chat_logs', JSON.stringify(logs))
}
```

### 2. 서버 로깅 (persona-api)

```typescript
// 요청 로깅
interface RequestLog {
  timestamp: string
  requestId: string
  ip: string
  userAgent: string
  endpoint: string
  method: string
  messageLength: number
  historyLength: number
}

// 응답 로깅
interface ResponseLog {
  timestamp: string
  requestId: string
  status: number
  responseTime: number
  tokensUsed: {
    prompt: number
    completion: number
  }
  error?: string
}

// 구조화된 로깅
function logRequest(req: FastifyRequest): RequestLog {
  return {
    timestamp: new Date().toISOString(),
    requestId: req.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    endpoint: req.url,
    method: req.method,
    messageLength: req.body?.message?.length || 0,
    historyLength: req.body?.conversationHistory?.length || 0,
  }
}
```

### 3. 메트릭 수집 (선택)

```typescript
// 수집할 메트릭
interface ChatMetrics {
  // 사용량
  totalRequests: number
  uniqueUsers: number  // IP 또는 세션 기반
  avgResponseTime: number

  // Rate Limit
  rateLimitHits: number

  // 에러
  errorRate: number
  errorsByType: Record<string, number>

  // 토큰 사용량
  totalTokensUsed: number
  avgTokensPerRequest: number
}
```

### 4. 로그 보존 정책

| 로그 타입 | 보존 기간 | 저장 위치 |
|----------|----------|----------|
| 클라이언트 이벤트 | 최근 100개 | localStorage |
| 요청/응답 로그 | 7일 | Fly.io 로그 |
| 에러 로그 | 30일 | 별도 스토리지 (선택) |
| 메트릭 | 90일 | 별도 스토리지 (선택) |

## 남용 방지

### 1. 기본 보호

- IP 기반 rate limiting
- 메시지 길이 제한 (1000자)
- 대화 히스토리 길이 제한

### 2. 추가 보호 (선택)

```typescript
// 의심스러운 패턴 감지
const abusePatterns = {
  rapidFire: (requests: Request[]) => {
    // 1초 내 3회 이상 요청
    return requests.filter(r =>
      Date.now() - r.timestamp < 1000
    ).length >= 3
  },

  repetitive: (messages: string[]) => {
    // 같은 메시지 반복
    const last5 = messages.slice(-5)
    return new Set(last5).size === 1 && last5.length === 5
  },
}
```

## 구현 우선순위

### Must Have
- [x] 서버 rate limit (현재 8/min)
- [ ] 클라이언트 쿨다운
- [ ] Rate limit 에러 UI

### Should Have
- [ ] 구조화된 로깅
- [ ] 응답 시간 측정
- [ ] 에러 분류

### Nice to Have
- [ ] 메트릭 대시보드
- [ ] 남용 패턴 감지
- [ ] 알림 시스템

---

작성일: 2025-12-22
