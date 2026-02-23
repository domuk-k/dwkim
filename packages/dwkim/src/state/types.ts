import type { ProgressItem, StreamEvent } from '../utils/personaApiClient.js'

// ─────────────────────────────────────────────────────────────
// Message & Source Types
// ─────────────────────────────────────────────────────────────

type SourcesEvent = Extract<StreamEvent, { type: 'sources' }>

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Message {
  id: number
  role: 'user' | 'assistant' | 'system' | 'banner'
  content: string
  sources?: SourcesEvent['sources']
  processingTime?: number
  shouldSuggestContact?: boolean
  confidence?: ConfidenceLevel
}

// ─────────────────────────────────────────────────────────────
// Tool Call State (Loading sub-state)
// ─────────────────────────────────────────────────────────────

export interface ToolCallState {
  tool: string
  displayName: string
  icon: string
  phase: 'started' | 'executing' | 'completed' | 'error'
  query?: string
  resultCount?: number
}

export interface LoadingState {
  icon: string
  message: string
  toolCalls: ToolCallState[]
}

// ─────────────────────────────────────────────────────────────
// App State (discriminated union on `mode`)
// ─────────────────────────────────────────────────────────────

interface BaseState {
  messages: Message[]
  sessionId: string | undefined
  nextMessageId: number
  // HITL tracking
  feedbackResponseCount: number
  hideFeedbackForSession: boolean
  hideEmailForSession: boolean
  lastExchange: { query: string; response: string } | null
  // UI
  expandedSourcesMsgId: number | null
}

export type AppState = BaseState &
  (
    | { mode: 'connecting' }
    | { mode: 'welcome'; selectedStarterIdx: number }
    | { mode: 'idle'; input: string; suggestedQuestions: string[]; selectedSuggestionIdx: number }
    | {
        mode: 'loading'
        loadingState: LoadingState
        streamContent: string
        progressItems: ProgressItem[]
        escalationReason: string
        pendingSuggestions: string[]
      }
    | {
        mode: 'emailInput'
        emailInput: string
        escalation: { show: boolean; reason: string }
      }
    | { mode: 'feedback' }
    | { mode: 'feedbackConfirmed' }
    | { mode: 'exitFeedback' }
    | { mode: 'error'; errorMessage: string }
  )

// ─────────────────────────────────────────────────────────────
// App Events
// ─────────────────────────────────────────────────────────────

export type AppEvent =
  // Lifecycle
  | { type: 'HEALTH_OK' }
  | { type: 'HEALTH_FAIL'; error: string }
  // Input
  | { type: 'INPUT_CHANGE'; value: string }
  | { type: 'SUBMIT'; value: string }
  // Welcome
  | { type: 'STARTER_UP' }
  | { type: 'STARTER_DOWN' }
  | { type: 'STARTER_SELECT'; index: number }
  | { type: 'WELCOME_DISMISS' }
  // Streaming
  | { type: 'STREAM_SESSION'; sessionId: string }
  | { type: 'STREAM_STATUS'; loadingState: LoadingState }
  | { type: 'STREAM_TOOL_CALL'; loadingState: LoadingState }
  | { type: 'STREAM_SOURCES'; sources: SourcesEvent['sources'] }
  | { type: 'STREAM_PROGRESS'; items: ProgressItem[] }
  | { type: 'STREAM_CONTENT'; fullContent: string }
  | { type: 'STREAM_CLARIFICATION'; questions: string[] }
  | { type: 'STREAM_FOLLOWUP'; questions: string[] }
  | { type: 'STREAM_ESCALATION'; reason: string }
  | {
      type: 'STREAM_DONE'
      fullContent: string
      sources: SourcesEvent['sources']
      processingTime: number
      shouldSuggestContact: boolean
      confidence?: ConfidenceLevel
    }
  | { type: 'STREAM_ERROR'; error: string }
  | { type: 'STREAM_CANCEL' }
  // Suggested questions
  | { type: 'SUGGESTION_UP' }
  | { type: 'SUGGESTION_DOWN' }
  | { type: 'SUGGESTION_SELECT'; question: string }
  | { type: 'SUGGESTION_DISMISS' }
  // Sources panel
  | { type: 'TOGGLE_SOURCES' }
  // Email
  | { type: 'EMAIL_CHANGE'; value: string }
  | { type: 'EMAIL_SUBMIT_SUCCESS'; message: string }
  | { type: 'EMAIL_SUBMIT_ERROR'; message: string }
  | { type: 'EMAIL_DISMISS' }
  // Feedback
  | { type: 'FEEDBACK_RATE'; rating: 1 | 2 | 3 }
  | { type: 'FEEDBACK_SKIP' }
  | { type: 'FEEDBACK_DISABLE' }
  | { type: 'FEEDBACK_CONFIRMED_DONE' }
  // Exit feedback
  | { type: 'EXIT_FEEDBACK_RATE'; rating: 1 | 2 | 3 | null }
  | { type: 'EXIT_FEEDBACK_SHOW' }
  // Commands
  | { type: 'CMD_HELP'; helpText: string }
  | { type: 'CMD_STATUS_OK'; statusText: string }
  | { type: 'CMD_STATUS_FAIL' }
  | { type: 'CMD_CLEAR' }
  // Correction
  | { type: 'CORRECTION_SUCCESS'; message: string }
  | { type: 'CORRECTION_FAIL'; message: string }

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const STARTER_QUESTIONS = [
  '어떤 경력을 가지고 있나요?',
  '주로 어떤 기술 스택을 사용하나요?',
  '오픈소스 활동에 대해 알려주세요'
]

export const CORRECTION_PATTERNS = [
  /틀렸/,
  /아니야/,
  /아닌데/,
  /잘못/,
  /수정해/,
  /고쳐/,
  /오류야/,
  /맞지\s*않/,
  /정확하지\s*않/,
  /incorrect/i,
  /wrong/i,
  /fix/i,
  /correct/i
]

export function isCorrection(msg: string): boolean {
  return CORRECTION_PATTERNS.some((p) => p.test(msg))
}
