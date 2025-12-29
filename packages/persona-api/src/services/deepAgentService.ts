import { createDeepAgent } from 'deepagents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { VectorStore, Document } from './vectorStore';

// 시스템 프롬프트를 파일에서 읽어옴
function loadSystemPrompt(): string {
  try {
    const promptPath = join(__dirname, '../../data/systemPrompt.md');
    return readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.warn('Failed to load systemPrompt.md, using fallback');
    return `나는 김동욱이에요. 질문에 답변해드릴게요.`;
  }
}

export interface AgentResponse {
  answer: string;
  sources: Document[];
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
}

export interface AgentStreamEvent {
  type: 'sources' | 'content' | 'done' | 'error';
  sources?: Document[];
  content?: string;
  metadata?: AgentResponse['metadata'];
  error?: string;
}

// 도구 사용 가이드 (시스템 프롬프트에 추가)
const TOOL_GUIDE = `

## 도구 사용
- search_documents: 나의 이력서, 경험, 생각, FAQ 등을 검색해요.
- 질문에 답하기 전에 관련 문서를 먼저 검색하세요.
`;

export class DeepAgentService {
  private vectorStore: VectorStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private agent: any = null;
  private model: ChatGoogleGenerativeAI | null = null;

  constructor() {
    this.vectorStore = new VectorStore();

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'DeepAgentService requires GOOGLE_API_KEY or GEMINI_API_KEY environment variable'
      );
    }

    this.model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash',
      apiKey,
      temperature: 0.7,
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.vectorStore.initialize();

      // RAG 검색 도구 생성 (타입 재귀 방지를 위해 any 사용)
      const vectorStore = this.vectorStore;
      const searchDocuments = new DynamicStructuredTool({
        name: 'search_documents',
        description: 'dwkim의 이력서, 경험, 생각, FAQ 등 개인 문서를 검색합니다. 사용자 질문에 답하기 전에 관련 정보를 검색하세요.',
        schema: z.object({
          query: z.string().describe('검색 쿼리 (한국어 또는 영어)'),
          topK: z.number().optional().describe('검색 결과 수 (기본값 5)'),
        }),
        func: async (input: { query: string; topK?: number }): Promise<string> => {
          try {
            const results = await vectorStore.search(input.query, input.topK ?? 5);
            if (results.length === 0) {
              return '관련 문서를 찾지 못했습니다.';
            }

            return results
              .map((doc, i) =>
                `[${i + 1}] [${doc.metadata.type}] ${doc.metadata.title || '제목 없음'}\n${doc.content}`
              )
              .join('\n\n---\n\n');
          } catch (error) {
            console.error('Search failed:', error);
            return '검색 중 오류가 발생했습니다.';
          }
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Deep Agent 생성 (LangGraph 타입 재귀 방지)
      const systemPrompt = loadSystemPrompt() + TOOL_GUIDE;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.agent = (createDeepAgent as any)({
        model: this.model,
        tools: [searchDocuments],
        systemPrompt,
      });

      console.log('DeepAgentService initialized with Gemini 2.0 Flash (gemini-2.0-flash)');
    } catch (error) {
      console.error('Failed to initialize DeepAgentService:', error);
      throw error;
    }
  }

  async processQuery(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    if (!this.agent) {
      throw new Error('DeepAgentService not initialized');
    }

    try {
      // 메시지 구성
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: query },
      ];

      // Agent 실행
      const result = await this.agent.invoke({ messages });

      // 마지막 assistant 메시지 추출
      const lastMessage = result.messages?.[result.messages.length - 1];
      const answer = typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content);

      // 검색 결과에서 sources 추출 (도구 호출 결과에서)
      const sources = await this.extractSourcesFromResult(query);

      const processingTime = Date.now() - startTime;

      return {
        answer,
        sources,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          searchQuery: query,
          searchResults: sources.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error('DeepAgent query failed:', error);
      throw new Error('Failed to process query with DeepAgent');
    }
  }

  async *processQueryStream(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): AsyncGenerator<AgentStreamEvent> {
    const startTime = Date.now();

    if (!this.agent) {
      yield { type: 'error', error: 'DeepAgentService not initialized' };
      return;
    }

    try {
      // 먼저 sources 검색
      const sources = await this.vectorStore.search(query, 5);
      yield { type: 'sources', sources };

      // 메시지 구성
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        { role: 'user' as const, content: query },
      ];

      // Agent 스트리밍 실행
      const stream = await this.agent.stream({ messages });

      for await (const chunk of stream) {
        // 스트림에서 컨텐츠 추출
        if (chunk && typeof chunk === 'object') {
          const entries = Object.entries(chunk);
          for (const [, value] of entries) {
            if (value && typeof value === 'object' && 'content' in value) {
              const content = value.content;
              if (typeof content === 'string' && content.length > 0) {
                yield { type: 'content', content };
              }
            }
          }
        }
      }

      const processingTime = Date.now() - startTime;
      yield {
        type: 'done',
        metadata: {
          searchQuery: query,
          searchResults: sources.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error('DeepAgent streaming failed:', error);
      yield { type: 'error', error: 'Failed to process streaming query' };
    }
  }

  private async extractSourcesFromResult(query: string): Promise<Document[]> {
    // Agent 결과에서 직접 sources를 추출하기 어려우므로,
    // 별도로 검색을 수행하여 반환
    try {
      return await this.vectorStore.search(query, 5);
    } catch {
      return [];
    }
  }

  async getStatus(): Promise<{
    initialized: boolean;
    model: string;
    vectorStore: boolean;
  }> {
    return {
      initialized: this.agent !== null,
      model: 'gemini-2.0-flash',
      vectorStore: true,
    };
  }
}
