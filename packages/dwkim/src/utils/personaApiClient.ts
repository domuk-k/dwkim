export interface ChatResponse {
  answer: string;
  sources?: Array<{
    type: string;
    filename: string;
    content: string;
    score?: number;
  }>;
  timestamp: string;
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

export class PersonaApiClient {
  constructor(private baseUrl: string) {}

  async checkHealth(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
  }

  async chat(message: string): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ChatResponse>;
  }

  async search(query: string): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/search?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search request failed: ${response.status} - ${error}`);
    }

    const result = await response.json() as { results?: SearchResult[] };
    return result.results || [];
  }

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/status`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<StatusResponse>;
  }
}