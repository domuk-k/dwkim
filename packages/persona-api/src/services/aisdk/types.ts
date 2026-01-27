/**
 * AI SDK Custom Data Part Types
 *
 * RAGStreamEvent → AI SDK UIMessageStream 변환을 위한 타입 정의
 * @see https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol
 */

import type { ConfidenceLevel, ProgressItem, SEUResult } from '../personaAgent'
import type { Document } from '../vectorStore'

// ─────────────────────────────────────────────────────────────
// Custom Data Part Types (AI SDK 확장)
// ─────────────────────────────────────────────────────────────

/**
 * Session 시작 이벤트 (Transient)
 * - 클라이언트에서 세션 ID 추적용
 * - transient: true → UI 상태만, 메시지에 저장 안 됨
 */
export interface SessionDataPart {
  type: 'data-session'
  sessionId: string
  transient: true
}

/**
 * Progress 이벤트 (Transient)
 * - UI에서 진행 상태 표시용
 * - transient: true → 스트림 종료 후 메시지에 포함되지 않음
 */
export interface ProgressDataPart {
  type: 'data-progress'
  items: ProgressItem[]
  transient: true
}

/**
 * Clarification 이벤트 (A2UI)
 * - 모호한 질문에 대한 추천 질문
 */
export interface ClarificationDataPart {
  type: 'data-clarification'
  suggestedQuestions: string[]
}

/**
 * Escalation 이벤트 (Transient)
 * - 높은 불확실성으로 인한 에스컬레이션 알림
 * - transient: true → 알림성 데이터, 메시지에 저장 안 됨
 */
export interface EscalationDataPart {
  type: 'data-escalation'
  reason: string
  uncertainty: number
  transient: true
}

/**
 * Followup 이벤트
 * - 응답 후 추천 팔로업 질문
 */
export interface FollowupDataPart {
  type: 'data-followup'
  suggestedQuestions: string[]
}

/**
 * Done 이벤트 (Transient)
 * - 스트림 완료 메타데이터
 * - transient: true → 메타데이터, 메시지에 저장 안 됨
 */
export interface DoneDataPart {
  type: 'data-done'
  metadata: {
    searchQuery: string
    searchResults: number
    processingTime: number
    shouldSuggestContact?: boolean
    messageCount?: number
    originalQuery?: string
    rewriteMethod?: string
    seuResult?: SEUResult
    nodeExecutions?: number
    totalTokens?: number
    confidence?: ConfidenceLevel
  }
  transient: true
}

/**
 * Error 이벤트
 * - 스트림 중 발생한 에러
 */
export interface ErrorDataPart {
  type: 'data-error'
  error: string
}

/**
 * Sources 이벤트
 * - AI SDK의 source part와 유사하지만 커스텀 Document 타입 사용
 */
export interface SourcesDataPart {
  type: 'data-sources'
  sources: Document[]
}

// ─────────────────────────────────────────────────────────────
// Union Type
// ─────────────────────────────────────────────────────────────

export type CustomDataPart =
  | SessionDataPart
  | ProgressDataPart
  | ClarificationDataPart
  | EscalationDataPart
  | FollowupDataPart
  | DoneDataPart
  | ErrorDataPart
  | SourcesDataPart

// ─────────────────────────────────────────────────────────────
// AI SDK Data Stream Part Format
// ─────────────────────────────────────────────────────────────

/**
 * AI SDK Data Stream Protocol 포맷
 * @see https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
 *
 * 포맷: `{type_id}:{json}\n`
 * - 0: text
 * - 2: data (custom parts)
 * - 8: message_annotation (sources)
 * - e: error
 * - d: finish_message
 */
export const DATA_STREAM_TYPES = {
  TEXT: '0',
  DATA: '2',
  MESSAGE_ANNOTATION: '8',
  ERROR: 'e',
  FINISH: 'd'
} as const
