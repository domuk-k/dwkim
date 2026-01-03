import { getVectorStore, initVectorStore, Document } from './vectorStore';
import { LLMService } from './llmService';
import type { ChatMessage } from './llmService';
import { getQueryRewriter } from './queryRewriter';
import { getSEUService, type SEUResult } from './seuService';
import { initBM25Engine } from './bm25Engine';

// SEU(Semantic Embedding Uncertainty) 사용 여부
// 기본 활성화 (모호함 감지에 필수, AMBIGUOUS_PATTERNS 대체)
const ENABLE_SEU = process.env.ENABLE_SEU !== 'false';

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

// ─────────────────────────────────────────────────────────────
// RAGStreamEvent - Discriminated Union
// type 필드로 각 이벤트의 정확한 타입 추론 가능
// ─────────────────────────────────────────────────────────────

type RAGStreamMetadata = RAGResponse['metadata'] & {
  shouldSuggestContact?: boolean;
  messageCount?: number;
  originalQuery?: string;
  rewriteMethod?: string;
  /** SEU 결과 (ENABLE_SEU=true일 때만) */
  seuResult?: SEUResult;
};

interface RAGSourcesEvent {
  type: 'sources';
  sources: Document[];
}

interface RAGContentEvent {
  type: 'content';
  content: string;
}

interface RAGDoneEvent {
  type: 'done';
  metadata: RAGStreamMetadata;
}

interface RAGErrorEvent {
  type: 'error';
  error: string;
}

/** A2UI: 모호한 쿼리에 대한 명확화 요청 */
interface RAGClarificationEvent {
  type: 'clarification';
  suggestedQuestions: string[];
}

/** 현재 처리 단계 표시 (thinking process) */
interface RAGThinkingEvent {
  type: 'thinking';
  step: string;
  detail?: string;
}

/** 진행 상황 표시 (todo-like progress) */
export interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

interface RAGProgressEvent {
  type: 'progress';
  items: ProgressItem[];
}

export type RAGStreamEvent =
  | RAGSourcesEvent
  | RAGContentEvent
  | RAGDoneEvent
  | RAGErrorEvent
  | RAGClarificationEvent
  | RAGThinkingEvent
  | RAGProgressEvent;

/**
 * 모호함 감지 (텍스트 기반 + SEU)
 *
 * Phase 1: 텍스트 기반 (패턴 매칭, 길이 threshold)
 * Phase 2: SEU (Semantic Embedding Uncertainty) - 다중 응답 cosine similarity
 *
 * 분포 기반 감지(max_score < 1.5 * mean_score)는 TF-IDF에서만 유효.
 * Dense embedding(Voyage)은 모든 쿼리에서 비슷한 ratio(1.1-1.3)를 보여 부적합.
 *
 * @see https://www.pinecone.io/learn/semantic-search/ (TF-IDF vs Embeddings)
 * @see https://arxiv.org/html/2509.22272 (Query Ambiguity Detection)
 */
function shouldAskClarification(
  isTextAmbiguous: boolean,
  seuResult?: SEUResult
): boolean {
  // Phase 1: 텍스트 기반 모호함
  if (isTextAmbiguous) return true;

  // Phase 2: SEU 기반 모호함 (선택적)
  if (seuResult?.isUncertain) {
    console.log(`SEU detected uncertainty: ${seuResult.uncertainty.toFixed(2)}`);
    return true;
  }

  return false;
}

export class RAGEngine {
  private llmService: LLMService;
  private maxSearchResults: number;
  private contextWindow: number;

  constructor() {
    this.llmService = new LLMService();
    this.maxSearchResults = parseInt(process.env.MAX_SEARCH_RESULTS || '5');
    this.contextWindow = parseInt(process.env.CONTEXT_WINDOW || '4000');
  }

  async initialize(): Promise<void> {
    try {
      // VectorStore 싱글턴 초기화
      await initVectorStore();
      console.log('RAG Engine: VectorStore initialized');

      // BM25 엔진 초기화 (Hybrid Search용)
      try {
        const vectorStore = getVectorStore();
        const documents = await vectorStore.getAllDocuments();
        if (documents.length > 0) {
          await initBM25Engine(documents);
          console.log('RAG Engine: BM25 initialized with corpus');
        } else {
          console.warn('RAG Engine: No documents for BM25, will use dense-only search');
        }
      } catch (bm25Error) {
        console.warn('RAG Engine: BM25 initialization failed, will use dense-only:', bm25Error);
      }

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

      // 0. Query Rewriting (대명사 치환, 짧은 쿼리 확장)
      const queryRewriter = getQueryRewriter();
      const rewriteResult = queryRewriter.rewrite(query, conversationHistory);
      const searchQuery = rewriteResult.rewritten;

      if (rewriteResult.method !== 'none') {
        console.log(`Query rewritten: "${query}" → "${searchQuery}" [${rewriteResult.changes.join(', ')}]`);
      }

      // 1. Hybrid 검색 (Dense + Sparse with RRF)
      console.log('Searching for relevant documents (Hybrid)...');
      const vectorStore = getVectorStore();
      const searchResults = await vectorStore.searchHybrid(
        searchQuery,  // 재작성된 쿼리로 검색
        this.maxSearchResults
      );
      console.log(`Found ${searchResults.length} hybrid results`);

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
          searchQuery: searchQuery,
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

    // Progress 상태 관리
    const progress: ProgressItem[] = [
      { id: 'rewrite', label: '쿼리 분석', status: 'pending' },
      { id: 'search', label: '문서 검색', status: 'pending' },
      { id: 'context', label: '컨텍스트 구성', status: 'pending' },
      { id: 'generate', label: '답변 생성', status: 'pending' },
    ];

    const updateProgress = (id: string, status: ProgressItem['status']): ProgressItem[] => {
      const item = progress.find(p => p.id === id);
      if (item) item.status = status;
      return [...progress];
    };

    try {
      console.log('RAG Engine streaming query:', query);

      // 0. Query Rewriting
      yield { type: 'progress', items: updateProgress('rewrite', 'in_progress') };
      yield { type: 'thinking', step: '쿼리 분석', detail: '대명사 치환 및 검색 최적화' };

      const queryRewriter = getQueryRewriter();
      const rewriteResult = queryRewriter.rewrite(query, conversationHistory);
      const searchQuery = rewriteResult.rewritten;

      if (rewriteResult.method !== 'none') {
        console.log(`Query rewritten: "${query}" → "${searchQuery}" [${rewriteResult.changes.join(', ')}]`);
        yield { type: 'thinking', step: '쿼리 재작성', detail: `"${query}" → "${searchQuery}"` };
      }
      yield { type: 'progress', items: updateProgress('rewrite', 'completed') };

      // 1. Hybrid 검색 (Dense + Sparse with RRF)
      yield { type: 'progress', items: updateProgress('search', 'in_progress') };
      yield { type: 'thinking', step: '하이브리드 검색', detail: 'Dense + Sparse (RRF 융합)' };

      const vectorStore = getVectorStore();
      const searchResults = await vectorStore.searchHybrid(
        searchQuery,  // 재작성된 쿼리로 검색
        this.maxSearchResults
      );

      yield { type: 'thinking', step: '검색 완료', detail: `${searchResults.length}건 발견` };
      yield { type: 'progress', items: updateProgress('search', 'completed') };

      // 소스 먼저 전송
      yield { type: 'sources', sources: searchResults };

      // 2. 컨텍스트 생성
      yield { type: 'progress', items: updateProgress('context', 'in_progress') };
      const context = this.buildContext(searchResults, query);
      yield { type: 'progress', items: updateProgress('context', 'completed') };

      // 2.5. A2UI: 모호한 쿼리 감지 → 추천 질문 제공
      // Phase 1: 텍스트 기반 (항상)
      // Phase 2: SEU 기반 (ENABLE_SEU=true일 때만)
      let seuResult: SEUResult | undefined;

      if (ENABLE_SEU && !rewriteResult.needsClarification) {
        // 텍스트 기반으로 모호하지 않을 때만 SEU 실행 (latency 최적화)
        yield { type: 'thinking', step: 'SEU 분석', detail: '의미적 모호성 측정' };
        console.log('Running SEU uncertainty measurement...');
        const seuService = getSEUService();
        seuResult = await seuService.measureUncertainty(query, context);
      }

      const isAmbiguous = shouldAskClarification(
        rewriteResult.needsClarification ?? false,
        seuResult
      );

      if (isAmbiguous) {
        const reason = rewriteResult.needsClarification ? 'text-based' : 'SEU';
        console.log(`[A2UI:Clarification] Ambiguous query detected (${reason}), query="${query}"`);
        yield { type: 'thinking', step: '모호성 감지', detail: '추천 질문 생성 중' };
        const suggestions = await queryRewriter.generateSuggestedQuestions(query);
        console.log(`[A2UI:Clarification] Generated suggestions: ${JSON.stringify(suggestions)}`);
        yield {
          type: 'clarification',
          suggestedQuestions: suggestions,
        };
        // 추천 질문을 보냈지만 기본 답변도 계속 제공
      }

      // 3. LLM 스트리밍
      yield { type: 'progress', items: updateProgress('generate', 'in_progress') };
      yield { type: 'thinking', step: '답변 생성', detail: 'LLM 스트리밍' };

      const messages: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: query },
      ];

      for await (const chunk of this.llmService.chatStream(messages, context)) {
        if (chunk.type === 'content' && chunk.content) {
          yield { type: 'content', content: chunk.content };
        } else if (chunk.type === 'error' && chunk.error) {
          yield { type: 'error', error: chunk.error };
          return;
        }
      }

      yield { type: 'progress', items: updateProgress('generate', 'completed') };

      const processingTime = Date.now() - startTime;
      yield {
        type: 'done',
        metadata: {
          searchQuery: searchQuery,
          searchResults: searchResults.length,
          processingTime,
          originalQuery: query !== searchQuery ? query : undefined,
          rewriteMethod: rewriteResult.method !== 'none' ? rewriteResult.method : undefined,
          seuResult,
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
      const vectorStore = getVectorStore();
      await vectorStore.addDocument(document);
    } catch (error) {
      console.error('Failed to add document to RAG engine:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      const vectorStore = getVectorStore();
      await vectorStore.deleteDocument(id);
    } catch (error) {
      console.error('Failed to delete document from RAG engine:', error);
      throw error;
    }
  }

  async searchDocuments(query: string, topK: number = 5): Promise<Document[]> {
    try {
      const vectorStore = getVectorStore();
      return await vectorStore.searchHybrid(query, topK);
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
