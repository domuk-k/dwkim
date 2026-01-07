/**
 * Persona Agent - LangGraph StateGraph 기반 결정론적 노드 그래프
 *
 * ragEngine.ts의 절차적 파이프라인을 LangGraph 노드로 재구성
 * - 각 노드는 순수 함수: (state, config) => Partial<State>
 * - config.writer로 실시간 스트리밍 이벤트 emit
 * - streamMode: "custom"으로 SSE 스트림 연동
 *
 * @see https://github.com/langchain-ai/langgraph/blob/main/docs/docs/how-tos/streaming.md
 */

import { StateGraph, START, END } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { z } from 'zod';

import { getVectorStore, initVectorStore, Document } from './vectorStore';
import { LLMService, type ChatMessage } from './llmService';
import { getQueryRewriter } from './queryRewriter';
import { getSEUService, type SEUResult } from './seuService';
import { initBM25Engine } from './bm25Engine';
import { env } from '../config/env';
import { filterOutput, logOutputFiltered } from '../guardrails';

// ─────────────────────────────────────────────────────────────
// Types (ragEngine.ts에서 유지)
// ─────────────────────────────────────────────────────────────

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

type RAGStreamMetadata = RAGResponse['metadata'] & {
  shouldSuggestContact?: boolean;
  messageCount?: number;
  originalQuery?: string;
  rewriteMethod?: string;
  seuResult?: SEUResult;
  /** LangGraph 노드 실행 횟수 */
  nodeExecutions?: number;
  /** LLM 토큰 사용량 */
  totalTokens?: number;
};

export interface ProgressItem {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  detail?: string;
}

// Discriminated Union
interface RAGSourcesEvent { type: 'sources'; sources: Document[]; }
interface RAGContentEvent { type: 'content'; content: string; }
interface RAGDoneEvent { type: 'done'; metadata: RAGStreamMetadata; }
interface RAGErrorEvent { type: 'error'; error: string; }
interface RAGClarificationEvent { type: 'clarification'; suggestedQuestions: string[]; }
interface RAGEscalationEvent { type: 'escalation'; reason: string; uncertainty: number; }
interface RAGFollowupEvent { type: 'followup'; suggestedQuestions: string[]; }
interface RAGProgressEvent { type: 'progress'; items: ProgressItem[]; }

export type RAGStreamEvent =
  | RAGSourcesEvent
  | RAGContentEvent
  | RAGDoneEvent
  | RAGErrorEvent
  | RAGClarificationEvent
  | RAGEscalationEvent
  | RAGFollowupEvent
  | RAGProgressEvent;

// ─────────────────────────────────────────────────────────────
// State Schema (Zod)
// ─────────────────────────────────────────────────────────────

const SourceSchema = z.object({
  content: z.string(),
  metadata: z.record(z.unknown()),
  score: z.number().optional(),
});

const PersonaStateSchema = z.object({
  // Input
  query: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).default([]),

  // Query Processing
  rewrittenQuery: z.string().optional(),
  rewriteMethod: z.enum(['rule', 'llm', 'none']).optional(),
  needsClarification: z.boolean().default(false),

  // Search Results
  sources: z.array(SourceSchema).default([]),
  context: z.string().default(''),

  // SEU Analysis
  seuResult: z.object({
    uncertainty: z.number(),
    avgSimilarity: z.number(),
    responses: z.array(z.string()),
    isUncertain: z.boolean(),
    shouldEscalate: z.boolean(),
  }).optional(),

  // Output
  answer: z.string().default(''),
  clarificationQuestions: z.array(z.string()).optional(),
  followupQuestions: z.array(z.string()).optional(),

  // Metrics
  metrics: z.object({
    nodeExecutions: z.number().default(0),
    totalTokens: z.number().default(0),
    startTime: z.number().default(0),
  }).default({ nodeExecutions: 0, totalTokens: 0, startTime: 0 }),

  // Progress
  progress: z.array(z.object({
    id: z.string(),
    label: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    detail: z.string().optional(),
  })).default([]),
});

type PersonaState = z.infer<typeof PersonaStateSchema>;

// ─────────────────────────────────────────────────────────────
// Shared Resources
// ─────────────────────────────────────────────────────────────

const ENABLE_SEU = env.ENABLE_SEU === 'true';
const llmService = new LLMService();

// Progress 헬퍼
function updateProgress(
  progress: ProgressItem[],
  id: string,
  status: ProgressItem['status'],
  detail?: string
): ProgressItem[] {
  return progress.map(p =>
    p.id === id ? { ...p, status, detail: detail ?? p.detail } : p
  );
}

function initProgress(): ProgressItem[] {
  return [
    { id: 'rewrite', label: '쿼리 분석', status: 'pending' },
    { id: 'search', label: '문서 검색', status: 'pending' },
    { id: 'context', label: '컨텍스트 구성', status: 'pending' },
    { id: 'generate', label: '답변 생성', status: 'pending' },
  ];
}

// ─────────────────────────────────────────────────────────────
// Nodes (Pure Functions + config.writer)
// ─────────────────────────────────────────────────────────────

/**
 * rewriteNode - 쿼리 재작성 (대명사 치환, 확장)
 */
async function rewriteNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(state.progress, 'rewrite', 'in_progress', '대명사 치환 및 검색 최적화');
  config.writer?.({ type: 'progress', items: progress });

  const queryRewriter = getQueryRewriter();
  const result = queryRewriter.rewrite(
    state.query,
    state.conversationHistory as ChatMessage[]
  );

  if (result.method !== 'none') {
    console.log(`[rewriteNode] "${state.query}" → "${result.rewritten}" [${result.changes.join(', ')}]`);
    config.writer?.({
      type: 'progress',
      items: updateProgress(progress, 'rewrite', 'in_progress', `"${state.query}" → "${result.rewritten}"`),
    });
  }

  const completedProgress = updateProgress(progress, 'rewrite', 'completed');
  config.writer?.({ type: 'progress', items: completedProgress });

  return {
    rewrittenQuery: result.rewritten,
    rewriteMethod: result.method as 'rule' | 'llm' | 'none',
    needsClarification: result.needsClarification ?? false,
    progress: completedProgress,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

/**
 * searchNode - Hybrid Search (Dense + BM25 + RRF)
 */
async function searchNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(state.progress, 'search', 'in_progress', 'Dense + Sparse (RRF 융합)');
  config.writer?.({ type: 'progress', items: progress });

  const searchQuery = state.rewrittenQuery || state.query;
  const vectorStore = getVectorStore();
  const sources = await vectorStore.searchHybrid(searchQuery, env.MAX_SEARCH_RESULTS);

  const completedProgress = updateProgress(progress, 'search', 'completed', `${sources.length}건 발견`);
  config.writer?.({ type: 'progress', items: completedProgress });

  // Sources 이벤트 즉시 전송
  config.writer?.({ type: 'sources', sources: sources as Document[] });

  // Context 생성
  const contextProgress = updateProgress(completedProgress, 'context', 'in_progress');
  config.writer?.({ type: 'progress', items: contextProgress });

  const context = buildContext(sources as Document[], state.query);
  const contextCompleted = updateProgress(contextProgress, 'context', 'completed');
  config.writer?.({ type: 'progress', items: contextCompleted });

  return {
    sources: sources as Document[],
    context,
    progress: contextCompleted,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

/**
 * analyzeNode - SEU 불확실성 측정 및 명확화 필요 여부 결정
 */
async function analyzeNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  let seuResult: SEUResult | undefined;

  // SEU 측정 (텍스트 기반으로 모호하지 않을 때만)
  if (ENABLE_SEU && !state.needsClarification) {
    const progress = updateProgress(state.progress, 'context', 'in_progress', '의미적 모호성 측정 (SEU)');
    config.writer?.({ type: 'progress', items: progress });

    console.log('[analyzeNode] Running SEU uncertainty measurement...');
    const seuService = getSEUService();
    seuResult = await seuService.measureUncertainty(state.query, state.context);
  }

  // 최종 모호함 판단
  const needsClarification = state.needsClarification || (seuResult?.isUncertain ?? false);

  return {
    seuResult,
    needsClarification,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

/**
 * clarifyNode - A2UI 추천 질문 생성
 */
async function clarifyNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const reason = state.needsClarification && !state.seuResult?.isUncertain ? 'text-based' : 'SEU';
  console.log(`[clarifyNode] Ambiguous query detected (${reason}), query="${state.query}"`);

  const progress = updateProgress(state.progress, 'context', 'in_progress', '추천 질문 생성 중');
  config.writer?.({ type: 'progress', items: progress });

  const queryRewriter = getQueryRewriter();
  const suggestions = await queryRewriter.generateSuggestedQuestions(state.query, state.context);

  console.log(`[clarifyNode] Generated suggestions: ${JSON.stringify(suggestions)}`);
  config.writer?.({
    type: 'clarification',
    suggestedQuestions: suggestions,
  });

  // Escalation 체크 (SEU가 매우 높을 때)
  if (state.seuResult?.shouldEscalate) {
    console.log(`[clarifyNode] High uncertainty (${state.seuResult.uncertainty}), emitting escalation`);
    config.writer?.({
      type: 'escalation',
      reason: '이 질문은 정확한 답변을 위해 직접 연락드리고 싶어요.',
      uncertainty: state.seuResult.uncertainty,
    });
  }

  return {
    clarificationQuestions: suggestions,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

/**
 * generateNode - LLM 스트리밍 응답 생성
 */
async function generateNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(state.progress, 'generate', 'in_progress', 'LLM 스트리밍');
  config.writer?.({ type: 'progress', items: progress });

  const messages: ChatMessage[] = [
    ...state.conversationHistory as ChatMessage[],
    { role: 'user', content: state.query },
  ];

  let fullAnswer = '';
  let tokenCount = 0;

  for await (const chunk of llmService.chatStream(messages, state.context)) {
    if (chunk.type === 'content' && chunk.content) {
      fullAnswer += chunk.content;
      tokenCount += 1; // 추정 (실제 토큰 수는 LLM 응답에서 가져와야 함)
      config.writer?.({ type: 'content', content: chunk.content });
    } else if (chunk.type === 'error' && chunk.error) {
      config.writer?.({ type: 'error', error: chunk.error });
      return { answer: '', metrics: state.metrics };
    }
  }

  const completedProgress = updateProgress(progress, 'generate', 'completed');
  config.writer?.({ type: 'progress', items: completedProgress });

  return {
    answer: fullAnswer,
    progress: completedProgress,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
      totalTokens: state.metrics.totalTokens + tokenCount,
    },
  };
}

/**
 * followupNode - 팔로업 질문 생성
 */
async function followupNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  try {
    const queryRewriter = getQueryRewriter();
    const followupQuestions = queryRewriter.generateFollowupQuestions(
      state.query,
      state.context
    );

    if (followupQuestions.length > 0) {
      console.log(`[followupNode] Generated followup questions: ${JSON.stringify(followupQuestions)}`);
      config.writer?.({
        type: 'followup',
        suggestedQuestions: followupQuestions,
      });
    }

    return {
      followupQuestions,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1,
      },
    };
  } catch (error) {
    console.warn('[followupNode] Followup question generation failed:', error);
    return {
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1,
      },
    };
  }
}

/**
 * outputGuardNode - 응답 필터링 가드레일
 *
 * LLM 응답에서 민감 정보 감지 및 마스킹
 * - llmService의 스트리밍 필터링과 별도로 최종 검증
 * - 그래프 노드로 명시적 파이프라인 포함
 */
async function outputGuardNode(
  state: PersonaState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  if (!state.answer) {
    return { metrics: { ...state.metrics, nodeExecutions: state.metrics.nodeExecutions + 1 } };
  }

  const result = filterOutput(state.answer);

  if (result.filtered) {
    console.warn('[outputGuardNode] Sensitive content filtered:', result.detectedPatterns);
    logOutputFiltered('graph', result.detectedPatterns || []);
  }

  return {
    answer: result.sanitized,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

/**
 * doneNode - 최종 메타데이터 emit (그래프 종료 직전)
 */
async function doneNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const processingTime = Date.now() - state.metrics.startTime;

  config.writer?.({
    type: 'done',
    metadata: {
      searchQuery: state.rewrittenQuery || state.query,
      searchResults: state.sources?.length || 0,
      processingTime,
      originalQuery: state.query !== state.rewrittenQuery ? state.query : undefined,
      rewriteMethod: state.rewriteMethod !== 'none' ? state.rewriteMethod : undefined,
      seuResult: state.seuResult,
      nodeExecutions: state.metrics.nodeExecutions + 1,
      totalTokens: state.metrics.totalTokens,
    },
  });

  return {
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Context Builder (exported for testing)
// ─────────────────────────────────────────────────────────────

export function buildContext(documents: Document[], query: string): string {
  if (documents.length === 0) {
    return '관련된 문서를 찾을 수 없습니다. 일반적인 지식으로 답변하겠습니다.';
  }

  let context = `사용자 질문: ${query}\n\n관련 문서들:\n`;
  let totalLength = context.length;

  for (const doc of documents) {
    const docContext = `[${doc.metadata.type}] ${doc.metadata.title || '제목 없음'}\n${doc.content}\n\n`;

    if (totalLength + docContext.length > env.CONTEXT_WINDOW) {
      break;
    }

    context += docContext;
    totalLength += docContext.length;
  }

  return context.trim();
}

// ─────────────────────────────────────────────────────────────
// Graph Definition
// ─────────────────────────────────────────────────────────────

function createPersonaGraph() {
  const graph = new StateGraph(PersonaStateSchema as any)
    .addNode('rewrite', rewriteNode)
    .addNode('search', searchNode)
    .addNode('analyze', analyzeNode)
    .addNode('clarify', clarifyNode)
    .addNode('generate', generateNode)
    .addNode('outputGuard', outputGuardNode)  // 가드레일 노드 추가
    .addNode('followup', followupNode)
    .addNode('done', doneNode)

    // 순차 흐름
    .addEdge(START, 'rewrite')
    .addEdge('rewrite', 'search')
    .addEdge('search', 'analyze')

    // 조건부 분기: analyze 후 clarify 또는 generate
    .addConditionalEdges('analyze', (state) => {
      const s = state as PersonaState;
      return s.needsClarification ? 'clarify' : 'generate';
    })

    // clarify 후에도 generate 실행 (clarification 제공 후 답변)
    .addEdge('clarify', 'generate')

    // generate → outputGuard (모든 응답 필터링)
    .addEdge('generate', 'outputGuard')

    // outputGuard 후 followup 생성 (clarification이 없을 때만)
    .addConditionalEdges('outputGuard', (state) => {
      const s = state as PersonaState;
      return s.needsClarification ? 'done' : 'followup';
    })

    // followup → done → END
    .addEdge('followup', 'done')
    .addEdge('done', END);

  return graph.compile({
    // Production: 무한 루프 방지
    // recursionLimit: 10, // LangGraph v1에서 지원 확인 필요
  });
}

// ─────────────────────────────────────────────────────────────
// RAGEngine (Class) - 기존 인터페이스 유지
// ─────────────────────────────────────────────────────────────

export class PersonaEngine {
  private graph: ReturnType<typeof createPersonaGraph> | null = null;

  async initialize(): Promise<void> {
    try {
      await initVectorStore();
      console.log('RAG Engine: VectorStore initialized');

      // BM25 엔진 초기화
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

      this.graph = createPersonaGraph();
      console.log('RAG Engine initialized successfully (LangGraph StateGraph)');
    } catch (error) {
      console.error('Failed to initialize RAG Engine:', error);
      throw error;
    }
  }

  async processQuery(
    query: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<RAGResponse> {
    if (!this.graph) throw new Error('RAGEngine not initialized');

    const startTime = Date.now();

    const input: PersonaState = {
      query,
      conversationHistory: conversationHistory as PersonaState['conversationHistory'],
      progress: initProgress(),
      metrics: { nodeExecutions: 0, totalTokens: 0, startTime },
      sources: [],
      context: '',
      answer: '',
      needsClarification: false,
      rewrittenQuery: undefined,
      rewriteMethod: undefined,
      seuResult: undefined,
      clarificationQuestions: undefined,
      followupQuestions: undefined,
    };

    const result = await this.graph.invoke(input) as PersonaState;

    return {
      answer: result.answer || '',
      sources: result.sources as Document[],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: result.metrics?.totalTokens || 0 },
      metadata: {
        searchQuery: result.rewrittenQuery || query,
        searchResults: result.sources?.length || 0,
        processingTime: Date.now() - startTime,
      },
    };
  }

  async *processQueryStream(
    query: string,
    conversationHistory: ChatMessage[] = []
  ): AsyncGenerator<RAGStreamEvent> {
    if (!this.graph) {
      yield { type: 'error', error: 'RAGEngine not initialized' };
      return;
    }

    const startTime = Date.now();

    const input: PersonaState = {
      query,
      conversationHistory: conversationHistory as PersonaState['conversationHistory'],
      progress: initProgress(),
      metrics: { nodeExecutions: 0, totalTokens: 0, startTime },
      sources: [],
      context: '',
      answer: '',
      needsClarification: false,
      rewrittenQuery: undefined,
      rewriteMethod: undefined,
      seuResult: undefined,
      clarificationQuestions: undefined,
      followupQuestions: undefined,
    };

    console.log('[RAGEngine] Starting stream with query:', query);

    try {
      // streamMode: "custom" - config.writer 이벤트 수신
      // doneNode가 'done' 이벤트를 emit하므로 별도 처리 불필요
      for await (const event of await this.graph.stream(input, {
        streamMode: 'custom',
      })) {
        yield event as RAGStreamEvent;
      }
    } catch (error) {
      console.error('[RAGEngine] Stream error:', error);
      yield { type: 'error', error: 'Failed to process streaming query' };
    }
  }

  async addDocument(document: Document): Promise<void> {
    const vectorStore = getVectorStore();
    await vectorStore.addDocument(document);
  }

  async deleteDocument(id: string): Promise<void> {
    const vectorStore = getVectorStore();
    await vectorStore.deleteDocument(id);
  }

  async searchDocuments(query: string, topK = 5): Promise<Document[]> {
    const vectorStore = getVectorStore();
    return await vectorStore.searchHybrid(query, topK);
  }

  async getEngineStatus() {
    return {
      vectorStore: true,
      llmService: true,
      modelInfo: llmService.getModelInfo(),
    };
  }
}
