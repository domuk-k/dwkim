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

export interface StreamEvent {
  type: 'sources' | 'content' | 'done' | 'error';
  sources?: Array<{
    id: string;
    content: string;
    metadata: { type: string; title?: string };
  }>;
  content?: string;
  metadata?: { searchQuery: string; searchResults: number; processingTime: number };
  error?: string;
}

export class PersonaApiClient {
  constructor(private baseUrl: string) {}

  async checkHealth(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  async chat(message: string): Promise<ChatResponse> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  async *chatStream(message: string): AsyncGenerator<StreamEvent> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
    } catch (error) {
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
    } finally {
      reader.releaseLock();
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`);
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
      response = await fetch(`${this.baseUrl}/api/v1/status`);
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