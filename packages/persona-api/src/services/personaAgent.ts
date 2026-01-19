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

import {
  Annotation,
  END,
  type LangGraphRunnableConfig,
  START,
  StateGraph
} from '@langchain/langgraph'
import { env } from '../config/env'
import { initBM25Engine } from './bm25Engine'
import { generationLLM, utilityLLM } from './llmInstances'
import type { ChatMessage } from './llmService'
import { getQueryRewriter } from './queryRewriter'
import { getSEUService } from './seuService'
import { type Document, getVectorStore, initVectorStore } from './vectorStore'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RAGResponse {
  answer: string
  sources: Document[]
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

export interface SEUResult {
  uncertainty: number
  avgSimilarity: number
  responses: string[]
  isUncertain: boolean
  shouldEscalate: boolean
}

type RAGStreamMetadata = RAGResponse['metadata'] & {
  shouldSuggestContact?: boolean
  messageCount?: number
  originalQuery?: string
  rewriteMethod?: string
  seuResult?: SEUResult
  nodeExecutions?: number
  totalTokens?: number
}

export interface ProgressItem {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  detail?: string
}

// Discriminated Union for SSE Events
interface RAGSourcesEvent {
  type: 'sources'
  sources: Document[]
}
interface RAGContentEvent {
  type: 'content'
  content: string
}
interface RAGDoneEvent {
  type: 'done'
  metadata: RAGStreamMetadata
}
interface RAGErrorEvent {
  type: 'error'
  error: string
}
interface RAGClarificationEvent {
  type: 'clarification'
  suggestedQuestions: string[]
}
interface RAGEscalationEvent {
  type: 'escalation'
  reason: string
  uncertainty: number
}
interface RAGFollowupEvent {
  type: 'followup'
  suggestedQuestions: string[]
}
interface RAGProgressEvent {
  type: 'progress'
  items: ProgressItem[]
}

export type RAGStreamEvent =
  | RAGSourcesEvent
  | RAGContentEvent
  | RAGDoneEvent
  | RAGErrorEvent
  | RAGClarificationEvent
  | RAGEscalationEvent
  | RAGFollowupEvent
  | RAGProgressEvent

// ─────────────────────────────────────────────────────────────
// State Schema (LangGraph Annotation Pattern)
// ─────────────────────────────────────────────────────────────

const PersonaStateAnnotation = Annotation.Root({
  // Input
  query: Annotation<string>,
  conversationHistory: Annotation<ChatMessage[]>({
    reducer: (_, b) => b, // 덮어쓰기
    default: () => []
  }),

  // Query Processing
  rewrittenQuery: Annotation<string | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),
  rewriteMethod: Annotation<'rule' | 'llm' | 'none' | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),
  needsClarification: Annotation<boolean>({
    reducer: (_, b) => b,
    default: () => false
  }),

  // Search Results
  sources: Annotation<Document[]>({
    reducer: (_, b) => b,
    default: () => []
  }),
  context: Annotation<string>({
    reducer: (_, b) => b,
    default: () => ''
  }),

  // SEU Analysis
  seuResult: Annotation<SEUResult | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),

  // Output
  answer: Annotation<string>({
    reducer: (_, b) => b,
    default: () => ''
  }),
  clarificationQuestions: Annotation<string[] | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),
  followupQuestions: Annotation<string[] | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),

  // Metrics
  metrics: Annotation<{
    nodeExecutions: number
    totalTokens: number
    startTime: number
  }>({
    reducer: (_, b) => b,
    default: () => ({ nodeExecutions: 0, totalTokens: 0, startTime: 0 })
  }),

  // Progress
  progress: Annotation<ProgressItem[]>({
    reducer: (_, b) => b,
    default: () => []
  })
})

type PersonaState = typeof PersonaStateAnnotation.State

// ─────────────────────────────────────────────────────────────
// Shared LLM Instances (Exported for DI)
// ─────────────────────────────────────────────────────────────

const ENABLE_SEU = env.ENABLE_SEU === 'true'

// LLM 인스턴스는 llmInstances.ts에서 import (순환 의존성 방지)
// 하위 호환성을 위해 re-export
export { generationLLM, utilityLLM }

// ─────────────────────────────────────────────────────────────
// Progress Helpers
// ─────────────────────────────────────────────────────────────

function updateProgress(
  progress: ProgressItem[],
  id: string,
  status: ProgressItem['status'],
  detail?: string
): ProgressItem[] {
  return progress.map((p) => (p.id === id ? { ...p, status, detail: detail ?? p.detail } : p))
}

function initProgress(): ProgressItem[] {
  return [
    { id: 'rewrite', label: '쿼리 분석', status: 'pending' },
    { id: 'search', label: '문서 검색', status: 'pending' },
    { id: 'context', label: '컨텍스트 구성', status: 'pending' },
    { id: 'generate', label: '답변 생성', status: 'pending' }
  ]
}

// ─────────────────────────────────────────────────────────────
// Context Builder
// ─────────────────────────────────────────────────────────────

export function buildContext(documents: Document[], query: string): string {
  if (documents.length === 0) {
    return '관련된 문서를 찾을 수 없습니다. 일반적인 지식으로 답변하겠습니다.'
  }

  let context = `사용자 질문: ${query}\n\n관련 문서들:\n`
  let totalLength = context.length

  for (const doc of documents) {
    const docContext = `[${doc.metadata.type}] ${doc.metadata.title || '제목 없음'}\n${doc.content}\n\n`

    if (totalLength + docContext.length > env.CONTEXT_WINDOW) {
      break
    }

    context += docContext
    totalLength += docContext.length
  }

  return context.trim()
}

// ─────────────────────────────────────────────────────────────
// Nodes (Pure Functions + Error Resilience)
// ─────────────────────────────────────────────────────────────

/**
 * rewriteNode - 쿼리 재작성 (대명사 치환, 확장)
 */
async function rewriteNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(
    state.progress,
    'rewrite',
    'in_progress',
    '대명사 치환 및 검색 최적화'
  )
  config.writer?.({ type: 'progress', items: progress })

  try {
    // 정적 import 사용 (TTFT 최적화)
    const queryRewriter = getQueryRewriter()
    const result = queryRewriter.rewrite(state.query, state.conversationHistory)

    if (result.method !== 'none') {
      console.log(
        `[rewriteNode] "${state.query}" → "${result.rewritten}" [${result.changes.join(', ')}]`
      )
      config.writer?.({
        type: 'progress',
        items: updateProgress(
          progress,
          'rewrite',
          'in_progress',
          `"${state.query}" → "${result.rewritten}"`
        )
      })
    }

    const completedProgress = updateProgress(progress, 'rewrite', 'completed')
    config.writer?.({ type: 'progress', items: completedProgress })

    return {
      rewrittenQuery: result.rewritten,
      rewriteMethod: result.method as 'rule' | 'llm' | 'none',
      needsClarification: result.needsClarification ?? false,
      progress: completedProgress,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  } catch (error) {
    console.error('[rewriteNode] Error:', error)
    const skippedProgress = updateProgress(progress, 'rewrite', 'skipped', '쿼리 분석 실패')
    config.writer?.({ type: 'progress', items: skippedProgress })

    return {
      rewrittenQuery: state.query, // 원본 쿼리 사용
      rewriteMethod: 'none',
      needsClarification: false,
      progress: skippedProgress,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }
}

/**
 * searchNode - Hybrid Search (Dense + BM25 + RRF)
 */
async function searchNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(
    state.progress,
    'search',
    'in_progress',
    'Dense + Sparse (RRF 융합)'
  )
  config.writer?.({ type: 'progress', items: progress })

  try {
    const searchQuery = state.rewrittenQuery || state.query
    const vectorStore = getVectorStore()
    const sources = await vectorStore.searchHybrid(searchQuery, env.MAX_SEARCH_RESULTS)

    const completedProgress = updateProgress(
      progress,
      'search',
      'completed',
      `${sources.length}건 발견`
    )
    config.writer?.({ type: 'progress', items: completedProgress })

    // Sources 이벤트 즉시 전송
    config.writer?.({ type: 'sources', sources: sources as Document[] })

    // Context 생성
    const contextProgress = updateProgress(completedProgress, 'context', 'in_progress')
    config.writer?.({ type: 'progress', items: contextProgress })

    const context = buildContext(sources as Document[], state.query)
    const contextCompleted = updateProgress(contextProgress, 'context', 'completed')
    config.writer?.({ type: 'progress', items: contextCompleted })

    return {
      sources: sources as Document[],
      context,
      progress: contextCompleted,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  } catch (error) {
    console.error('[searchNode] Error:', error)
    const skippedProgress = updateProgress(progress, 'search', 'skipped', '검색 실패')
    config.writer?.({ type: 'progress', items: skippedProgress })

    return {
      sources: [],
      context: '검색 중 오류가 발생했습니다. 일반적인 지식으로 답변하겠습니다.',
      progress: skippedProgress,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }
}

/**
 * analyzeNode - SEU 불확실성 측정 및 명확화 필요 여부 결정
 */
async function analyzeNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  let seuResult: SEUResult | undefined

  try {
    // SEU 측정 (텍스트 기반으로 모호하지 않을 때만)
    if (ENABLE_SEU && !state.needsClarification) {
      const progress = updateProgress(
        state.progress,
        'context',
        'in_progress',
        '의미적 모호성 측정 (SEU)'
      )
      config.writer?.({ type: 'progress', items: progress })

      console.log('[analyzeNode] Running SEU uncertainty measurement...')
      const seuService = getSEUService()
      seuResult = await seuService.measureUncertainty(state.query, state.context)
    }
  } catch (error) {
    console.warn('[analyzeNode] SEU measurement failed, skipping:', error)
  }

  // 최종 모호함 판단
  const needsClarification = state.needsClarification || (seuResult?.isUncertain ?? false)

  return {
    seuResult,
    needsClarification,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1
    }
  }
}

/**
 * clarifyNode - A2UI 추천 질문 생성
 */
async function clarifyNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  try {
    const reason = state.needsClarification && !state.seuResult?.isUncertain ? 'text-based' : 'SEU'
    console.log(`[clarifyNode] Ambiguous query detected (${reason}), query="${state.query}"`)

    const progress = updateProgress(state.progress, 'context', 'in_progress', '추천 질문 생성 중')
    config.writer?.({ type: 'progress', items: progress })

    const queryRewriter = getQueryRewriter()
    const suggestions = await queryRewriter.generateSuggestedQuestions(state.query, state.context)

    console.log(`[clarifyNode] Generated suggestions: ${JSON.stringify(suggestions)}`)
    config.writer?.({
      type: 'clarification',
      suggestedQuestions: suggestions
    })

    // Escalation 체크 (SEU가 매우 높을 때)
    if (state.seuResult?.shouldEscalate) {
      console.log(
        `[clarifyNode] High uncertainty (${state.seuResult.uncertainty}), emitting escalation`
      )
      config.writer?.({
        type: 'escalation',
        reason: '이 질문은 정확한 답변을 위해 직접 연락드리고 싶어요.',
        uncertainty: state.seuResult.uncertainty
      })
    }

    return {
      clarificationQuestions: suggestions,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  } catch (error) {
    console.warn('[clarifyNode] Failed to generate clarification questions:', error)
    return {
      clarificationQuestions: [],
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }
}

/**
 * generateNode - LLM 스트리밍 응답 생성
 */
async function generateNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const progress = updateProgress(state.progress, 'generate', 'in_progress', 'LLM 스트리밍')
  config.writer?.({ type: 'progress', items: progress })

  try {
    const messages: ChatMessage[] = [
      ...state.conversationHistory,
      { role: 'user', content: state.query }
    ]

    let fullAnswer = ''
    let tokenCount = 0

    for await (const chunk of generationLLM.chatStream(messages, state.context)) {
      if (chunk.type === 'content' && chunk.content) {
        fullAnswer += chunk.content
        tokenCount += 1
        config.writer?.({ type: 'content', content: chunk.content })
      } else if (chunk.type === 'error' && chunk.error) {
        config.writer?.({ type: 'error', error: chunk.error })
        return {
          answer: '',
          progress: updateProgress(progress, 'generate', 'skipped', 'LLM 오류'),
          metrics: state.metrics
        }
      }
    }

    const completedProgress = updateProgress(progress, 'generate', 'completed')
    config.writer?.({ type: 'progress', items: completedProgress })

    return {
      answer: fullAnswer,
      progress: completedProgress,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1,
        totalTokens: state.metrics.totalTokens + tokenCount
      }
    }
  } catch (error) {
    console.error('[generateNode] Error:', error)
    config.writer?.({ type: 'error', error: 'LLM 응답 생성 중 오류가 발생했습니다.' })

    return {
      answer: '',
      progress: updateProgress(progress, 'generate', 'skipped', 'LLM 오류'),
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }
}

/**
 * followupNode - 팔로업 질문 생성
 */
async function followupNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  try {
    const queryRewriter = getQueryRewriter()
    const followupQuestions = await queryRewriter.generateFollowupQuestions(
      state.query,
      state.context
    )

    if (followupQuestions.length > 0) {
      console.log(
        `[followupNode] Generated followup questions: ${JSON.stringify(followupQuestions)}`
      )
      config.writer?.({
        type: 'followup',
        suggestedQuestions: followupQuestions
      })
    }

    return {
      followupQuestions,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  } catch (error) {
    console.warn('[followupNode] Followup question generation failed:', error)
    return {
      followupQuestions: [],
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }
}

/**
 * doneNode - 최종 메타데이터 emit (그래프 종료 직전)
 */
async function doneNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const processingTime = Date.now() - state.metrics.startTime

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
      totalTokens: state.metrics.totalTokens
    }
  })

  return {
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Graph Definition
// ─────────────────────────────────────────────────────────────

function createPersonaGraph() {
  const graph = new StateGraph(PersonaStateAnnotation)
    .addNode('rewrite', rewriteNode)
    .addNode('search', searchNode)
    .addNode('analyze', analyzeNode)
    // A2UI 비활성화: clarify/followup 노드 제거
    .addNode('generate', generateNode)
    .addNode('done', doneNode)

    // 순차 흐름: rewrite → search → analyze → generate → done
    .addEdge(START, 'rewrite')
    .addEdge('rewrite', 'search')
    .addEdge('search', 'analyze')
    .addEdge('analyze', 'generate')
    .addEdge('generate', 'done')
    .addEdge('done', END)

  return graph.compile()
}

// ─────────────────────────────────────────────────────────────
// PersonaEngine Class - 기존 인터페이스 유지
// ─────────────────────────────────────────────────────────────

export class PersonaEngine {
  private graph: ReturnType<typeof createPersonaGraph> | null = null

  async initialize(): Promise<void> {
    try {
      await initVectorStore()
      console.log('RAG Engine: VectorStore initialized')

      // BM25 엔진 초기화
      try {
        const vectorStore = getVectorStore()
        const documents = await vectorStore.getAllDocuments()
        if (documents.length > 0) {
          await initBM25Engine(documents)
          console.log('RAG Engine: BM25 initialized with corpus')
        } else {
          console.warn('RAG Engine: No documents for BM25, will use dense-only search')
        }
      } catch (bm25Error) {
        console.warn('RAG Engine: BM25 initialization failed, will use dense-only:', bm25Error)
      }

      this.graph = createPersonaGraph()
      console.log('RAG Engine initialized successfully (LangGraph StateGraph)')
    } catch (error) {
      console.error('Failed to initialize RAG Engine:', error)
      throw error
    }
  }

  async processQuery(query: string, conversationHistory: ChatMessage[] = []): Promise<RAGResponse> {
    if (!this.graph) throw new Error('RAGEngine not initialized')

    const startTime = Date.now()

    const input: PersonaState = {
      query,
      conversationHistory,
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
      followupQuestions: undefined
    }

    const result = (await this.graph.invoke(input)) as PersonaState

    return {
      answer: result.answer || '',
      sources: result.sources,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: result.metrics?.totalTokens || 0
      },
      metadata: {
        searchQuery: result.rewrittenQuery || query,
        searchResults: result.sources?.length || 0,
        processingTime: Date.now() - startTime
      }
    }
  }

  async *processQueryStream(
    query: string,
    conversationHistory: ChatMessage[] = []
  ): AsyncGenerator<RAGStreamEvent> {
    if (!this.graph) {
      yield { type: 'error', error: 'RAGEngine not initialized' }
      return
    }

    const startTime = Date.now()

    const input: PersonaState = {
      query,
      conversationHistory,
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
      followupQuestions: undefined
    }

    console.log('[RAGEngine] Starting stream with query:', query)

    try {
      // streamMode: "custom" - config.writer 이벤트 수신
      for await (const event of await this.graph.stream(input, {
        streamMode: 'custom'
      })) {
        yield event as RAGStreamEvent
      }
    } catch (error) {
      console.error('[RAGEngine] Stream error:', error)
      yield { type: 'error', error: 'Failed to process streaming query' }
    }
  }

  async addDocument(document: Document): Promise<void> {
    const vectorStore = getVectorStore()
    await vectorStore.addDocument(document)
  }

  async deleteDocument(id: string): Promise<void> {
    const vectorStore = getVectorStore()
    await vectorStore.deleteDocument(id)
  }

  async searchDocuments(query: string, topK = 5): Promise<Document[]> {
    const vectorStore = getVectorStore()
    return await vectorStore.searchHybrid(query, topK)
  }

  async getEngineStatus() {
    return {
      vectorStore: true,
      llmService: true,
      modelInfo: {
        generation: generationLLM.getModelInfo(),
        utility: utilityLLM.getModelInfo()
      }
    }
  }
}
