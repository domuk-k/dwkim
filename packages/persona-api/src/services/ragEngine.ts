import { VectorStore, Document } from './vectorStore';
import { LLMService } from './llmService';
import type { ChatMessage } from './llmService';

export interface RAGResponse {
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

export interface RAGStreamEvent {
  type: 'sources' | 'content' | 'done' | 'error';
  sources?: Document[];
  content?: string;
  metadata?: RAGResponse['metadata'];
  error?: string;
}

export class RAGEngine {
  private vectorStore: VectorStore;
  private llmService: LLMService;
  private maxSearchResults: number;
  private contextWindow: number;

  constructor() {
    this.vectorStore = new VectorStore();
    this.llmService = new LLMService();
    this.maxSearchResults = parseInt(process.env.MAX_SEARCH_RESULTS || '5');
    this.contextWindow = parseInt(process.env.CONTEXT_WINDOW || '4000');
  }

  async initialize(): Promise<void> {
    try {
      await this.vectorStore.initialize();
      console.log('RAG Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAG Engine:', error);
      throw error;
    }
  }

  async processQuery(
    query: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      console.log('RAG Engine processing query:', query);

      // 1. 다양성 검색으로 관련 문서 찾기 (중복 청크 제거)
      console.log('Searching for relevant documents...');
      const searchResults = await this.vectorStore.searchDiverse(
        query,
        this.maxSearchResults
      );
      console.log(`Found ${searchResults.length} diverse documents`);

      // 2. 컨텍스트 생성
      console.log('Building context...');
      const context = this.buildContext(searchResults, query);
      console.log('Context built, length:', context.length);

      // 3. LLM으로 답변 생성
      console.log('Generating response with LLM...');
      const messages: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: query },
      ];

      const llmResponse = await this.llmService.chat(messages, context);
      console.log('LLM response received, content length:', llmResponse.content.length);

      // 4. 응답 구성
      const processingTime = Date.now() - startTime;

      return {
        answer: llmResponse.content,
        sources: searchResults,
        usage: llmResponse.usage,
        metadata: {
          searchQuery: query,
          searchResults: searchResults.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error('RAG processing failed:', error);
      throw new Error('Failed to process query with RAG engine');
    }
  }

  async *processQueryStream(
    query: string,
    conversationHistory: ChatMessage[] = []
  ): AsyncGenerator<RAGStreamEvent> {
    const startTime = Date.now();

    try {
      console.log('RAG Engine streaming query:', query);

      // 1. 다양성 검색 (중복 청크 제거)
      const searchResults = await this.vectorStore.searchDiverse(
        query,
        this.maxSearchResults
      );

      // 소스 먼저 전송
      yield { type: 'sources', sources: searchResults };

      // 2. 컨텍스트 생성
      const context = this.buildContext(searchResults, query);

      // 3. LLM 스트리밍
      const messages: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: query },
      ];

      for await (const chunk of this.llmService.chatStream(messages, context)) {
        if (chunk.type === 'content' && chunk.content) {
          yield { type: 'content', content: chunk.content };
        } else if (chunk.type === 'error') {
          yield { type: 'error', error: chunk.error };
          return;
        }
      }

      const processingTime = Date.now() - startTime;
      yield {
        type: 'done',
        metadata: {
          searchQuery: query,
          searchResults: searchResults.length,
          processingTime,
        },
      };
    } catch (error) {
      console.error('RAG streaming failed:', error);
      yield { type: 'error', error: 'Failed to process streaming query' };
    }
  }

  private buildContext(documents: Document[], query: string): string {
    if (documents.length === 0) {
      return '관련된 문서를 찾을 수 없습니다. 일반적인 지식으로 답변하겠습니다.';
    }

    let context = `사용자 질문: ${query}\n\n관련 문서들:\n`;
    let totalLength = context.length;

    for (const doc of documents) {
      const docContext = `[${doc.metadata.type}] ${doc.metadata.title || '제목 없음'}\n${doc.content}\n\n`;

      // 컨텍스트 윈도우 제한 확인
      if (totalLength + docContext.length > this.contextWindow) {
        break;
      }

      context += docContext;
      totalLength += docContext.length;
    }

    return context.trim();
  }

  async addDocument(document: Document): Promise<void> {
    try {
      await this.vectorStore.addDocument(document);
    } catch (error) {
      console.error('Failed to add document to RAG engine:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await this.vectorStore.deleteDocument(id);
    } catch (error) {
      console.error('Failed to delete document from RAG engine:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, topK: number = 5): Promise<Document[]> {
    try {
      return await this.vectorStore.searchDiverse(query, topK);
    } catch (error) {
      console.error('Document search failed:', error);
      throw error;
    }
  }

  async getEngineStatus(): Promise<{
    vectorStore: boolean;
    llmService: boolean;
    modelInfo: { model: string; maxTokens: number };
  }> {
    try {
      const modelInfo = this.llmService.getModelInfo();

      return {
        vectorStore: true, // 초기화 성공 시 true
        llmService: true, // 생성자에서 API 키 검증
        modelInfo,
      };
    } catch (error) {
      console.error('Failed to get engine status:', error);
      throw error;
    }
  }
}
