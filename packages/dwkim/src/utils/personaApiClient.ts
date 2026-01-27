import { getDeviceId } from './deviceId.js'

// ─────────────────────────────────────────────────────────────
// AI SDK Data Stream Protocol Parser
// @see https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
// ─────────────────────────────────────────────────────────────

/**
 * AI SDK Data Stream Protocol 타입 ID
 * 포맷: `{type_id}:{json}\n`
 */
const DATA_STREAM_TYPES = {
  TEXT: '0', // 텍스트 청크
  DATA: '2', // 커스텀 데이터 파트
  ERROR: 'e', // 에러
  FINISH: 'd' // 완료
} as const

/**
 * Data Stream 라인을 파싱하여 이벤트로 변환
 */
function parseDataStreamLine(line: string): StreamEvent | null {
  if (!line || line.length < 2) return null

  const typeId = line[0]
  if (line[1] !== ':') return null

  const jsonStr = line.slice(2)

  try {
    switch (typeId) {
      case DATA_STREAM_TYPES.TEXT: {
        const text = JSON.parse(jsonStr) as string
        return { type: 'content', content: text }
      }

      case DATA_STREAM_TYPES.DATA: {
        // Data parts는 배열로 옴: [{ type: 'data-xxx', ... }]
        const parts = JSON.parse(jsonStr) as Array<{ type: string; [key: string]: unknown }>
        for (const part of parts) {
          return convertDataPart(part)
        }
        return null
      }

      case DATA_STREAM_TYPES.ERROR: {
        const error = JSON.parse(jsonStr) as string
        return { type: 'error', error }
      }

      case DATA_STREAM_TYPES.FINISH: {
        // finish 이벤트는 무시 (done 이벤트가 별도로 옴)
        return null
      }

      default:
        return null
    }
  } catch {
    return null
  }
}

/**
 * AI SDK 커스텀 데이터 파트를 CLI StreamEvent로 변환
 */
function convertDataPart(part: { type: string; [key: string]: unknown }): StreamEvent | null {
  switch (part.type) {
    case 'data-session':
      return { type: 'session', sessionId: part.sessionId as string }

    case 'data-sources':
      return { type: 'sources', sources: part.sources as Source[] }

    case 'data-progress':
      return { type: 'progress', items: part.items as ProgressItem[] }

    case 'data-clarification':
      return { type: 'clarification', suggestedQuestions: part.suggestedQuestions as string[] }

    case 'data-followup':
      return { type: 'followup', suggestedQuestions: part.suggestedQuestions as string[] }

    case 'data-escalation':
      return {
        type: 'escalation',
        reason: part.reason as string,
        uncertainty: part.uncertainty as number
      }

    case 'data-done':
      return {
        type: 'done',
        metadata: part.metadata as {
          searchQuery: string
          searchResults: number
          processingTime: number
          shouldSuggestContact?: boolean
          messageCount?: number
          originalQuery?: string
          rewriteMethod?: string
          nodeExecutions?: number
          totalTokens?: number
          confidence?: 'high' | 'medium' | 'low'
        }
      }

    case 'data-error':
      return { type: 'error', error: part.error as string }

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────

// 사용자 친화적 에러 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 네트워크 에러를 친절한 메시지로 변환
function handleFetchError(error: unknown): never {
  if (error instanceof TypeError) {
    // 네트워크 연결 실패
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', undefined, true)
    }
    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      throw new ApiError('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.', undefined, true)
    }
  }
  throw error
}

// HTTP 상태 코드별 에러 처리
function handleHttpError(status: number, _body: string): never {
  switch (status) {
    case 429:
      throw new ApiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429, true)
    case 503:
      throw new ApiError('서버가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.', 503, true)
    case 500:
      throw new ApiError('서버 내부 오류가 발생했습니다.', 500, false)
    default:
      throw new ApiError(`요청 실패: ${status}`, status, false)
  }
}

// API 응답의 실제 구조 (persona-api에서 반환)
interface ApiChatResponse {
  success: boolean
  data: {
    answer: string
    sources?: Array<{
      id: string
      content: string
      metadata: {
        type: string
        title?: string
        category?: string
      }
    }>
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    metadata: {
      searchQuery: string
      searchResults: number
      processingTime: number
    }
  }
  error?: string
}

// CLI에서 사용하는 정규화된 응답
export interface ChatResponse {
  answer: string
  sources?: Array<{
    type: string
    title: string
    content: string
  }>
  processingTime: number
  shouldSuggestContact?: boolean
}

export interface SearchResult {
  type: string
  filename: string
  content: string
  score?: number
}

export interface StatusResponse {
  status: string
  timestamp: string
  rag_engine?: {
    status: string
    total_documents: number
    collections: string[]
  }
  redis?: {
    status: string
  }
  memory?: {
    used: string
    total: string
  }
}

// Discriminated Union: 각 이벤트 타입에 맞는 필드만 허용
type Source = {
  id: string
  content: string
  metadata: { type: string; title?: string }
}

// Progress 아이템 (RAG 파이프라인 진행 상태 with detail)
export type ProgressItem = {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  detail?: string // thinking 내용 통합
}

export type StreamEvent =
  | { type: 'session'; sessionId: string }
  | {
      type: 'status'
      tool: string
      message: string
      icon: string
      phase?: 'started' | 'progress' | 'completed'
      details?: Record<string, unknown>
    }
  | {
      type: 'tool_call'
      tool: 'search_documents' | 'collect_contact'
      phase: 'started' | 'executing' | 'completed' | 'error'
      displayName: string
      icon: string
      metadata?: { query?: string; resultCount?: number; error?: string }
    }
  | { type: 'sources'; sources: Source[] }
  | { type: 'content'; content: string }
  | { type: 'clarification'; suggestedQuestions: string[] }
  | { type: 'escalation'; reason: string; uncertainty: number }
  | { type: 'followup'; suggestedQuestions: string[] }
  | { type: 'progress'; items: ProgressItem[] }
  | {
      type: 'done'
      metadata: {
        searchQuery: string
        searchResults: number
        processingTime: number
        shouldSuggestContact?: boolean
        messageCount?: number
        originalQuery?: string
        rewriteMethod?: string
        nodeExecutions?: number
        totalTokens?: number
        confidence?: 'high' | 'medium' | 'low'
      }
    }
  | { type: 'error'; error: string }

export class PersonaApiClient {
  private abortController: AbortController | null = null
  private deviceId: string

  constructor(private baseUrl: string) {
    this.deviceId = getDeviceId()
  }

  /**
   * 공통 헤더 (Device ID 포함)
   */
  private getHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      'X-Device-ID': this.deviceId
    }
    if (contentType) {
      headers['Content-Type'] = contentType
    }
    return headers
  }

  // 현재 스트리밍 요청 취소
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * Health check with retry for cold start
   * fly.io auto_start_machines 사용 시 machine 시작에 시간이 걸림
   */
  async checkHealth(maxRetries = 3, retryDelayMs = 2000): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃

        const response = await fetch(`${this.baseUrl}/health`, {
          headers: this.getHeaders(),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          return // 성공
        }

        lastError = new Error(`Health check failed: ${response.status}`)
      } catch (error) {
        if (error instanceof Error) {
          lastError = error
        }
      }

      // 마지막 시도가 아니면 대기 후 재시도
      if (attempt < maxRetries) {
        await this.sleep(retryDelayMs)
      }
    }

    throw lastError || new Error('Health check failed after retries')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async chat(message: string): Promise<ChatResponse> {
    let response: Response

    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ message })
      })
    } catch (error) {
      handleFetchError(error)
    }

    if (!response.ok) {
      const body = await response.text()
      handleHttpError(response.status, body)
    }

    const apiResponse: ApiChatResponse = await response.json()

    if (!apiResponse.success || !apiResponse.data) {
      throw new ApiError(apiResponse.error || 'Invalid API response')
    }

    // API 응답을 CLI 형식으로 정규화
    return {
      answer: apiResponse.data.answer,
      sources: apiResponse.data.sources?.map((source) => ({
        type: source.metadata.type,
        title: source.metadata.title || source.id,
        content: source.content
      })),
      processingTime: apiResponse.data.metadata.processingTime
    }
  }

  /**
   * AI SDK v2 Data Stream Protocol을 사용하는 스트리밍 채팅
   * v1 SSE 대신 AI SDK 포맷 사용으로 Blog UI와 동일한 엔드포인트 공유
   */
  async *chatStream(message: string, sessionId?: string): AsyncGenerator<StreamEvent> {
    // 이전 요청 취소
    this.abort()
    this.abortController = new AbortController()

    let response: Response

    try {
      // v2 엔드포인트 사용 (AI SDK Data Stream Protocol)
      response = await fetch(`${this.baseUrl}/api/v2/chat/stream`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ message, sessionId }),
        signal: this.abortController.signal
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // 취소된 요청은 조용히 종료
      }
      handleFetchError(error)
    }

    if (!response.ok) {
      const body = await response.text()
      handleHttpError(response.status, body)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ApiError('스트리밍 응답을 받을 수 없습니다.')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          // AI SDK Data Stream Protocol 파싱
          // 포맷: `{type_id}:{json}\n` (예: `0:"hello"`, `2:[{...}]`)
          const event = parseDataStreamLine(line)
          if (event) {
            yield event
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // 취소된 요청은 조용히 종료
      }
      throw error
    } finally {
      reader.releaseLock()
      this.abortController = null
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    let response: Response

    try {
      response = await fetch(`${this.baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`, {
        headers: this.getHeaders()
      })
    } catch (error) {
      handleFetchError(error)
    }

    if (!response.ok) {
      const body = await response.text()
      handleHttpError(response.status, body)
    }

    const result = await response.json()
    // API 응답 구조: { success, data: { results: [...] } }
    return result.data?.results || result.results || []
  }

  async getStatus(): Promise<StatusResponse> {
    let response: Response

    try {
      response = await fetch(`${this.baseUrl}/api/v1/status`, {
        headers: this.getHeaders()
      })
    } catch (error) {
      handleFetchError(error)
    }

    if (!response.ok) {
      const body = await response.text()
      handleHttpError(response.status, body)
    }

    return response.json()
  }

  /**
   * HITL: Response Feedback 제출
   * Privacy: rating만 수집 (대화 내용, 코드 포함 안함)
   */
  async submitFeedback(rating: 1 | 2 | 3 | null, sessionId?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/feedback`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ rating, sessionId })
      })

      if (!response.ok) {
        console.warn('Feedback submission failed:', response.status)
      }
    } catch (error) {
      // 피드백 실패해도 사용자 경험에 영향 없음
      console.warn('Feedback submission error:', error)
    }
  }

  /**
   * HITL: 응답 수정 피드백 제출
   */
  async submitCorrection(
    originalQuery: string,
    originalResponse: string,
    correctionMessage: string,
    sessionId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/correction`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({
          originalQuery,
          originalResponse,
          correctionMessage,
          sessionId
        })
      })

      return await response.json()
    } catch (error) {
      console.warn('Correction submission error:', error)
      return { success: false, message: '수정 피드백 전송 실패' }
    }
  }
}
