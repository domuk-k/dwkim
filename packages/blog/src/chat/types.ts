/**
 * Chat UI Types
 *
 * persona-api v2 타입 정의 및 Chat UI 전용 타입
 */

// ─────────────────────────────────────────────────────────────
// Document Types (from persona-api)
// ─────────────────────────────────────────────────────────────

export interface Document {
  id: string
  content: string
  metadata: {
    type: 'resume' | 'faq' | 'blog' | 'knowledge' | 'cogni' | 'post'
    title?: string
    category?: string
    source?: string
    pubDate?: string
    keywords?: string[]
    chunkIndex?: number
    totalChunks?: number
  }
  score?: number
}

// ─────────────────────────────────────────────────────────────
// AI SDK Custom Data Parts (from persona-api v2)
// ─────────────────────────────────────────────────────────────

/**
 * Session 시작 이벤트 (Transient)
 * - transient: true → UI 상태만, 메시지에 저장 안 됨
 */
export interface SessionDataPart {
  type: 'data-session'
  sessionId: string
  transient?: true
}

export interface ProgressItem {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  detail?: string
}

/**
 * Progress 이벤트 (Transient)
 * - transient: true → 로딩 중에만 표시, 메시지에 저장 안 됨
 */
export interface ProgressDataPart {
  type: 'data-progress'
  items: ProgressItem[]
  transient?: true
}

export interface SourcesDataPart {
  type: 'data-sources'
  sources: Document[]
}

export interface ClarificationDataPart {
  type: 'data-clarification'
  suggestedQuestions: string[]
}

/**
 * Escalation 이벤트 (Transient)
 * - transient: true → 알림성 데이터, 메시지에 저장 안 됨
 */
export interface EscalationDataPart {
  type: 'data-escalation'
  reason: string
  uncertainty: number
  transient?: true
}

export interface FollowupDataPart {
  type: 'data-followup'
  suggestedQuestions: string[]
}

export interface DoneMetadata {
  searchQuery: string
  searchResults: number
  processingTime: number
  shouldSuggestContact?: boolean
  messageCount?: number
  originalQuery?: string
  rewriteMethod?: string
  nodeExecutions?: number
  totalTokens?: number
  confidence?: 'high' | 'medium' | 'low'
}

/**
 * Done 이벤트 (Transient)
 * - transient: true → 메타데이터, 메시지에 저장 안 됨
 */
export interface DoneDataPart {
  type: 'data-done'
  metadata: DoneMetadata
  transient?: true
}

export interface ErrorDataPart {
  type: 'data-error'
  error: string
}

export type CustomDataPart =
  | SessionDataPart
  | ProgressDataPart
  | SourcesDataPart
  | ClarificationDataPart
  | EscalationDataPart
  | FollowupDataPart
  | DoneDataPart
  | ErrorDataPart

// ─────────────────────────────────────────────────────────────
// Blog Context Types
// ─────────────────────────────────────────────────────────────

export interface BlogContext {
  type: 'post' | 'index' | 'page'
  title?: string
  slug?: string
  description?: string
  keywords?: string[]
}

// ─────────────────────────────────────────────────────────────
// Chat State Types
// ─────────────────────────────────────────────────────────────

export interface ChatState {
  sessionId: string | null
  sources: Document[]
  progress: ProgressItem[]
  suggestedQuestions: string[]
  suggestionType: 'clarification' | 'followup' | null
  metadata: DoneMetadata | null
  escalation: { reason: string; uncertainty: number } | null
}

export const initialChatState: ChatState = {
  sessionId: null,
  sources: [],
  progress: [],
  suggestedQuestions: [],
  suggestionType: null,
  metadata: null,
  escalation: null
}
