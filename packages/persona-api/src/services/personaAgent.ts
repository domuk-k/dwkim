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
import { getDeviceService } from './deviceService'
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

export type ConfidenceLevel = 'high' | 'medium' | 'low'

type RAGStreamMetadata = RAGResponse['metadata'] & {
  shouldSuggestContact?: boolean
  messageCount?: number
  originalQuery?: string
  rewriteMethod?: string
  seuResult?: SEUResult
  nodeExecutions?: number
  totalTokens?: number
  confidence?: ConfidenceLevel
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
  deviceId: Annotation<string | undefined>({
    reducer: (_, b) => b,
    default: () => undefined
  }),

  // Query Classification
  queryComplexity: Annotation<'simple' | 'complex'>({
    reducer: (_, b) => b,
    default: () => 'complex' as const
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

/**
 * 문서 타입별 신뢰도 우선순위
 * - resume: 공식 이력서 (가장 신뢰)
 * - 100-questions: 직접 작성한 100문 100답
 * - blog/knowledge: 블로그 글, 지식 문서
 */
const SOURCE_PRIORITY: Record<string, number> = {
  resume: 1,
  '100-questions': 2,
  knowledge: 3,
  blog: 4
}

function getSourcePriority(type: string): number {
  return SOURCE_PRIORITY[type] ?? 5
}

export function buildContext(documents: Document[], query: string): string {
  if (documents.length === 0) {
    return '관련된 문서를 찾을 수 없습니다. 일반적인 지식으로 답변하겠습니다.'
  }

  // 우선순위별 정렬 (resume > 100-questions > knowledge > blog)
  const sortedDocs = [...documents].sort(
    (a, b) => getSourcePriority(a.metadata.type) - getSourcePriority(b.metadata.type)
  )

  let context = `사용자 질문: ${query}\n\n## 관련 컨텍스트 (신뢰도 순)\n\n`
  let totalLength = context.length
  let currentType = ''

  for (const doc of sortedDocs) {
    // 타입이 바뀌면 섹션 구분
    if (doc.metadata.type !== currentType) {
      currentType = doc.metadata.type
      const sectionHeader = `### [${currentType}]\n`
      if (totalLength + sectionHeader.length > env.CONTEXT_WINDOW) break
      context += sectionHeader
      totalLength += sectionHeader.length
    }

    const docContext = `**${doc.metadata.title || '제목 없음'}**\n${doc.content}\n\n`

    if (totalLength + docContext.length > env.CONTEXT_WINDOW) {
      break
    }

    context += docContext
    totalLength += docContext.length
  }

  // 인용 가능한 소스 레이블 목록 (LLM이 인용에 사용)
  const TYPE_LABELS: Record<string, string> = {
    resume: '이력서',
    faq: '100문100답',
    experience: '경험',
    thoughts: '생각',
    about: '소개',
    knowledge: '지식'
  }

  const citationLabels = sortedDocs
    .map((doc) => {
      const type = doc.metadata.type
      const title = doc.metadata.title
      const typeLabel = TYPE_LABELS[type]
      if (typeLabel && !title) return `[${typeLabel}]`
      if ((type === 'blog' || type === 'post') && title) return `[블로그: ${title}]`
      if (title) return `[${typeLabel || type}: ${title}]`
      return `[${typeLabel || type}]`
    })
    .filter((v, i, a) => a.indexOf(v) === i) // dedupe

  if (citationLabels.length > 0) {
    context += `\n---\n인용 가능한 출처: ${citationLabels.join(', ')}\n`
  }

  return context.trim()
}

// ─────────────────────────────────────────────────────────────
// Query Classification (Fast-Path Routing)
// ─────────────────────────────────────────────────────────────

const GREETING_PATTERNS = [
  /^(안녕|하이|헬로|ㅎㅇ|반가워|반갑습니다)/i,
  /^(hi|hello|hey|howdy|sup|yo)\b/i
]
const THANKS_PATTERNS = [
  /^(고마워|감사|ㄱㅅ|고맙습니다|감사합니다|땡큐|쌩큐)/i,
  /^(thanks?|thank you|thx|ty)\b/i
]
const FAREWELL_PATTERNS = [
  /^(잘\s*가|바이|안녕히|다음에|수고)/i,
  /^(bye|goodbye|see you|later|cya)\b/i
]

type SimpleCategory = 'greeting' | 'thanks' | 'farewell'

function classifySimpleQuery(query: string): SimpleCategory | null {
  const trimmed = query.trim()
  // 긴 메시지는 단순 쿼리가 아님 (한국어 10자, 영문 30자 기준)
  if (trimmed.length > 30) return null

  if (GREETING_PATTERNS.some((p) => p.test(trimmed))) return 'greeting'
  if (THANKS_PATTERNS.some((p) => p.test(trimmed))) return 'thanks'
  if (FAREWELL_PATTERNS.some((p) => p.test(trimmed))) return 'farewell'
  return null
}

const SIMPLE_RESPONSES: Record<SimpleCategory, string[]> = {
  greeting: [
    '안녕하세요! 저는 김동욱의 AI 프로필 에이전트예요. 커리어, 기술 스택, 프로젝트 등 궁금한 게 있으시면 편하게 물어보세요!',
    '반갑습니다! 동욱의 경력, 스킬, 블로그 글 등에 대해 답변해 드릴 수 있어요. 뭐가 궁금하세요?'
  ],
  thanks: [
    '도움이 됐다니 기쁩니다! 더 궁금한 것이 있으시면 언제든 물어보세요.',
    '천만에요! 동욱에 대해 더 알고 싶은 게 있으시면 편하게 질문해 주세요.'
  ],
  farewell: [
    '감사합니다! 좋은 하루 되세요. 언제든 다시 찾아와 주세요!',
    '방문해 주셔서 감사해요! 다음에 또 궁금한 게 생기면 편하게 오세요.'
  ]
}

function getSimpleResponse(category: SimpleCategory): string {
  const responses = SIMPLE_RESPONSES[category]
  return responses[Math.floor(Math.random() * responses.length)]
}

// ─────────────────────────────────────────────────────────────
// Nodes (Pure Functions + Error Resilience)
// ─────────────────────────────────────────────────────────────

/**
 * classifyNode - 쿼리 복잡도 분류 (fast-path 라우팅)
 * 인사/감사/작별 → directResponse (LLM 호출 없이 즉시 응답)
 * 나머지 → 전체 RAG 파이프라인
 */
async function classifyNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const category = classifySimpleQuery(state.query)

  if (category) {
    console.log(`[classifyNode] Simple query detected: "${state.query}" → ${category}`)
    return {
      queryComplexity: 'simple' as const,
      metrics: {
        ...state.metrics,
        nodeExecutions: state.metrics.nodeExecutions + 1
      }
    }
  }

  return {
    queryComplexity: 'complex' as const,
    progress: initProgress(),
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1
    }
  }
}

/**
 * directResponseNode - 단순 쿼리에 대한 즉시 응답 (LLM 호출 없음)
 */
async function directResponseNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const category = classifySimpleQuery(state.query)
  const answer = getSimpleResponse(category || 'greeting')

  config.writer?.({ type: 'content', content: answer })

  return {
    answer,
    metrics: {
      ...state.metrics,
      nodeExecutions: state.metrics.nodeExecutions + 1
    }
  }
}

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
    // SEU 결과가 있으면 전달하여 AI 해석 기반 구체적 질문 생성
    const suggestions = await queryRewriter.generateSuggestedQuestions(
      state.query,
      state.context,
      state.seuResult
        ? { uncertainty: state.seuResult.uncertainty, responses: state.seuResult.responses }
        : undefined
    )

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

    // 크로스 세션 개인화: DeviceService에서 힌트 주입
    let contextWithPersonalization = state.context
    if (state.deviceId) {
      try {
        const deviceService = getDeviceService()
        const hints = await deviceService?.getPersonalizationHints(state.deviceId)
        if (hints && (hints.isReturning || hints.interests.length > 0)) {
          const personalizationNote = [
            hints.isReturning ? `이 사용자는 ${hints.visitCount}번째 방문입니다.` : '',
            hints.interests.length > 0 ? `관심 분야: ${hints.interests.join(', ')}` : ''
          ]
            .filter(Boolean)
            .join(' ')

          if (personalizationNote) {
            contextWithPersonalization = `[사용자 정보] ${personalizationNote}\n\n${state.context}`
          }
        }
      } catch (error) {
        console.warn('[generateNode] Personalization hints failed:', error)
      }
    }

    let fullAnswer = ''
    let tokenCount = 0

    for await (const chunk of generationLLM.chatStream(messages, contextWithPersonalization)) {
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
 * computeConfidence - 소스 수 + SEU 결과로 신뢰도 산출
 *
 * - 소스 3개 이상 + SEU 불확실하지 않음 → high
 * - 소스 1개 이상 또는 SEU 불확실 → medium
 * - 소스 0개 → low
 */
function computeConfidence(state: PersonaState): ConfidenceLevel {
  const sourceCount = state.sources?.length || 0
  const isUncertain = state.seuResult?.isUncertain ?? false

  if (sourceCount >= 3 && !isUncertain) return 'high'
  if (sourceCount >= 1) return isUncertain ? 'medium' : 'high'
  return 'low'
}

/**
 * doneNode - 최종 메타데이터 emit (그래프 종료 직전)
 */
async function doneNode(
  state: PersonaState,
  config: LangGraphRunnableConfig
): Promise<Partial<PersonaState>> {
  const processingTime = Date.now() - state.metrics.startTime

  // Confidence 산출: 소스 수 + SEU 결과 조합
  const confidence = computeConfidence(state)

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
      confidence
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
    .addNode('classify', classifyNode)
    .addNode('directResponse', directResponseNode)
    .addNode('rewrite', rewriteNode)
    .addNode('search', searchNode)
    .addNode('analyze', analyzeNode)
    .addNode('clarify', clarifyNode)
    .addNode('generate', generateNode)
    .addNode('followup', followupNode)
    .addNode('done', doneNode)

    // 엔트리: 쿼리 분류
    .addEdge(START, 'classify')

    // 복잡도 기반 분기: simple → directResponse, complex → RAG 파이프라인
    .addConditionalEdges('classify', (state) => {
      return state.queryComplexity === 'simple' ? 'directResponse' : 'rewrite'
    })
    .addEdge('directResponse', 'done')

    // 복잡 쿼리: 기존 RAG 순차 흐름
    .addEdge('rewrite', 'search')
    .addEdge('search', 'analyze')

    // 조건부 분기: analyze 후 clarify 또는 generate
    .addConditionalEdges('analyze', (state) => {
      return state.needsClarification ? 'clarify' : 'generate'
    })

    // clarify 후에도 generate 실행 (clarification 제공 후 답변)
    .addEdge('clarify', 'generate')

    // generate → followup (clarification 아닌 경우) 또는 done (clarification인 경우)
    .addConditionalEdges('generate', (state) => {
      return state.needsClarification ? 'done' : 'followup'
    })
    .addEdge('followup', 'done')

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

  async processQuery(
    query: string,
    conversationHistory: ChatMessage[] = [],
    deviceId?: string
  ): Promise<RAGResponse> {
    if (!this.graph) throw new Error('RAGEngine not initialized')

    const startTime = Date.now()

    const input: PersonaState = {
      query,
      conversationHistory,
      deviceId,
      queryComplexity: 'complex',
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
    conversationHistory: ChatMessage[] = [],
    deviceId?: string
  ): AsyncGenerator<RAGStreamEvent> {
    if (!this.graph) {
      yield { type: 'error', error: 'RAGEngine not initialized' }
      return
    }

    const startTime = Date.now()

    const input: PersonaState = {
      query,
      conversationHistory,
      deviceId,
      queryComplexity: 'complex',
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
