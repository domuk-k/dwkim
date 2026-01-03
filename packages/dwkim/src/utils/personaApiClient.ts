import { getDeviceId } from './deviceId.js';

// 사용자 친화적 에러 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 네트워크 에러를 친절한 메시지로 변환
function handleFetchError(error: unknown): never {
  if (error instanceof TypeError) {
    // 네트워크 연결 실패
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      throw new ApiError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', undefined, true);
    }
    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      throw new ApiError('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.', undefined, true);
    }
  }
  throw error;
}

// HTTP 상태 코드별 에러 처리
function handleHttpError(status: number, body: string): never {
  switch (status) {
    case 429:
      throw new ApiError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.', 429, true);
    case 503:
      throw new ApiError('서버가 일시적으로 사용 불가합니다. 잠시 후 다시 시도해주세요.', 503, true);
    case 500:
      throw new ApiError('서버 내부 오류가 발생했습니다.', 500, false);
    default:
      throw new ApiError(`요청 실패: ${status}`, status, false);
  }
}

// API 응답의 실제 구조 (persona-api에서 반환)
interface ApiChatResponse {
  success: boolean;
  data: {
    answer: string;
    sources?: Array<{
      id: string;
      content: string;
      metadata: {
        type: string;
        title?: string;
        category?: string;
      };
    }>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    metadata: {
      searchQuery: string;
      searchResults: number;
      processingTime: number;
    };
  };
  error?: string;
}

// CLI에서 사용하는 정규화된 응답
export interface ChatResponse {
  answer: string;
  sources?: Array<{
    type: string;
    title: string;
    content: string;
  }>;
  processingTime: number;
  shouldSuggestContact?: boolean;
}

export interface SearchResult {
  type: string;
  filename: string;
  content: string;
  score?: number;
}

export interface StatusResponse {
  status: string;
  timestamp: string;
  rag_engine?: {
    status: string;
    total_documents: number;
    collections: string[];
  };
  redis?: {
    status: string;
  };
  memory?: {
    used: string;
    total: string;
  };
}

// Discriminated Union: 각 이벤트 타입에 맞는 필드만 허용
type Source = {
  id: string;
  content: string;
  metadata: { type: string; title?: string };
};

// Progress 아이템 (RAG 파이프라인 진행 상태)
export type ProgressItem = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
};

export type StreamEvent =
  | { type: 'session'; sessionId: string }
  | {
      type: 'status';
      tool: string;
      message: string;
      icon: string;
      phase?: 'started' | 'progress' | 'completed';
      details?: Record<string, unknown>;
    }
  | {
      type: 'tool_call';
      tool: 'search_documents' | 'collect_contact';
      phase: 'started' | 'executing' | 'completed' | 'error';
      displayName: string;
      icon: string;
      metadata?: { query?: string; resultCount?: number; error?: string };
    }
  | { type: 'sources'; sources: Source[] }
  | { type: 'content'; content: string }
  | { type: 'clarification'; suggestedQuestions: string[] }
  | { type: 'thinking'; step: string; detail?: string }
  | { type: 'progress'; items: ProgressItem[] }
  | {
      type: 'done';
      metadata: {
        searchQuery: string;
        searchResults: number;
        processingTime: number;
        shouldSuggestContact?: boolean;
        messageCount?: number;
        originalQuery?: string;
        rewriteMethod?: string;
      };
    }
  | { type: 'error'; error: string };

export class PersonaApiClient {
  private abortController: AbortController | null = null;
  private deviceId: string;

  constructor(private baseUrl: string) {
    this.deviceId = getDeviceId();
  }

  /**
   * 공통 헤더 (Device ID 포함)
   */
  private getHeaders(contentType?: string): HeadersInit {
    const headers: HeadersInit = {
      'X-Device-ID': this.deviceId,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    return headers;
  }

  // 현재 스트리밍 요청 취소
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async checkHealth(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  async chat(message: string): Promise<ChatResponse> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ message }),
      });
    } catch (error) {
      handleFetchError(error);
    }

    if (!response.ok) {
      const body = await response.text();
      handleHttpError(response.status, body);
    }

    const apiResponse: ApiChatResponse = await response.json();

    if (!apiResponse.success || !apiResponse.data) {
      throw new ApiError(apiResponse.error || 'Invalid API response');
    }

    // API 응답을 CLI 형식으로 정규화
    return {
      answer: apiResponse.data.answer,
      sources: apiResponse.data.sources?.map((source) => ({
        type: source.metadata.type,
        title: source.metadata.title || source.id,
        content: source.content,
      })),
      processingTime: apiResponse.data.metadata.processingTime,
    };
  }

  async *chatStream(message: string, sessionId?: string): AsyncGenerator<StreamEvent> {
    // 이전 요청 취소
    this.abort();
    this.abortController = new AbortController();

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat/stream`, {
        method: 'POST',
        headers: this.getHeaders('application/json'),
        body: JSON.stringify({ message, sessionId }),
        signal: this.abortController.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // 취소된 요청은 조용히 종료
      }
      handleFetchError(error);
    }

    if (!response.ok) {
      const body = await response.text();
      handleHttpError(response.status, body);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ApiError('스트리밍 응답을 받을 수 없습니다.');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));
              yield event;
            } catch {
              // JSON 파싱 실패 시 무시
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // 취소된 요청은 조용히 종료
      }
      throw error;
    } finally {
      reader.releaseLock();
      this.abortController = null;
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      handleFetchError(error);
    }

    if (!response.ok) {
      const body = await response.text();
      handleHttpError(response.status, body);
    }

    const result = await response.json();
    // API 응답 구조: { success, data: { results: [...] } }
    return result.data?.results || result.results || [];
  }

  async getStatus(): Promise<StatusResponse> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/status`, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      handleFetchError(error);
    }

    if (!response.ok) {
      const body = await response.text();
      handleHttpError(response.status, body);
    }

    return response.json();
  }
}