import { icons, profile } from '../ui/data.js'
import type { AppEvent, AppState, Message } from './types.js'
import { STARTER_QUESTIONS } from './types.js'

// ─────────────────────────────────────────────────────────────
// Pure transition function: (state, event) → state
// ─────────────────────────────────────────────────────────────

function nextId(state: AppState): { id: number; nextMessageId: number } {
  const id = state.nextMessageId
  return { id, nextMessageId: id + 1 }
}

function addMessage(
  state: AppState,
  msg: Omit<Message, 'id'>
): Pick<AppState, 'messages' | 'nextMessageId'> {
  const { id, nextMessageId } = nextId(state)
  return {
    messages: [...state.messages, { ...msg, id }],
    nextMessageId
  }
}

export function transition(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    // ─── Lifecycle ──────────────────────────────────────
    case 'HEALTH_OK': {
      const banner = nextId(state)
      const system = nextId({ ...state, nextMessageId: banner.nextMessageId })
      return {
        ...state,
        mode: 'welcome',
        selectedStarterIdx: 0,
        messages: [
          {
            id: banner.id,
            role: 'banner',
            content: `${profile.name} · ${profile.title}\n${profile.bio}`
          },
          { id: system.id, role: 'system', content: '/help 도움말 · Ctrl+C 종료' }
        ],
        nextMessageId: system.nextMessageId
      }
    }

    case 'HEALTH_FAIL':
      return {
        ...state,
        mode: 'error',
        errorMessage: event.error
      }

    // ─── Welcome ────────────────────────────────────────
    case 'STARTER_UP': {
      if (state.mode !== 'welcome') return state
      return {
        ...state,
        mode: 'welcome',
        selectedStarterIdx: Math.max(0, state.selectedStarterIdx - 1)
      }
    }

    case 'STARTER_DOWN': {
      if (state.mode !== 'welcome') return state
      return {
        ...state,
        mode: 'welcome',
        selectedStarterIdx: Math.min(STARTER_QUESTIONS.length - 1, state.selectedStarterIdx + 1)
      }
    }

    case 'STARTER_SELECT': {
      if (state.mode !== 'welcome') return state
      const question = STARTER_QUESTIONS[event.index]
      const patch = addMessage(state, { role: 'user', content: question })
      return {
        ...state,
        ...patch,
        mode: 'loading',
        loadingState: { icon: '⏳', message: '처리 중...', toolCalls: [] },
        streamContent: '',
        progressItems: [],
        escalationReason: '',
        pendingSuggestions: []
      }
    }

    case 'WELCOME_DISMISS':
      if (state.mode !== 'welcome') return state
      return {
        ...state,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }

    // ─── Input ──────────────────────────────────────────
    case 'INPUT_CHANGE':
      if (state.mode !== 'idle') return state
      return {
        ...state,
        mode: 'idle',
        input: event.value,
        suggestedQuestions: state.suggestedQuestions,
        selectedSuggestionIdx: state.selectedSuggestionIdx
      }

    case 'SUBMIT': {
      if (state.mode !== 'idle') return state
      const trimmed = event.value.trim()
      if (!trimmed) return state
      const patch = addMessage(state, { role: 'user', content: trimmed })
      return {
        ...state,
        ...patch,
        mode: 'loading',
        loadingState: { icon: '⏳', message: '처리 중...', toolCalls: [] },
        streamContent: '',
        progressItems: [],
        escalationReason: '',
        pendingSuggestions: []
      }
    }

    // ─── Streaming ──────────────────────────────────────
    case 'STREAM_SESSION':
      if (state.mode !== 'loading') return state
      return { ...state, sessionId: event.sessionId }

    case 'STREAM_STATUS':
      if (state.mode !== 'loading') return state
      return { ...state, loadingState: event.loadingState }

    case 'STREAM_TOOL_CALL':
      if (state.mode !== 'loading') return state
      return { ...state, loadingState: event.loadingState }

    case 'STREAM_SOURCES':
      // Sources are stored and attached when STREAM_DONE fires
      return state

    case 'STREAM_PROGRESS':
      if (state.mode !== 'loading') return state
      return { ...state, progressItems: event.items }

    case 'STREAM_CONTENT':
      if (state.mode !== 'loading') return state
      return { ...state, streamContent: event.fullContent, progressItems: [] }

    case 'STREAM_CLARIFICATION':
      if (state.mode !== 'loading') return state
      return { ...state, pendingSuggestions: event.questions }

    case 'STREAM_FOLLOWUP':
      if (state.mode !== 'loading') return state
      return { ...state, pendingSuggestions: event.questions }

    case 'STREAM_ESCALATION':
      if (state.mode !== 'loading') return state
      return { ...state, escalationReason: event.reason }

    case 'STREAM_DONE': {
      if (state.mode !== 'loading') return state
      const patch = addMessage(state, {
        role: 'assistant',
        content: event.fullContent,
        sources: event.sources,
        processingTime: event.processingTime,
        shouldSuggestContact: event.shouldSuggestContact,
        confidence: event.confidence
      })

      const newCount = state.feedbackResponseCount + 1
      const shouldShowFeedback =
        newCount % 3 === 0 &&
        !event.shouldSuggestContact &&
        !state.escalationReason &&
        !state.hideFeedbackForSession

      const shouldShowEmail =
        (event.shouldSuggestContact || !!state.escalationReason) && !state.hideEmailForSession

      // Determine next mode
      if (shouldShowEmail) {
        return {
          ...state,
          ...patch,
          mode: 'emailInput',
          emailInput: '',
          escalation: {
            show: !!state.escalationReason,
            reason: state.escalationReason
          },
          feedbackResponseCount: newCount,
          lastExchange: {
            query: patch.messages[patch.messages.length - 2]?.content || '',
            response: event.fullContent
          }
        }
      }

      if (shouldShowFeedback) {
        return {
          ...state,
          ...patch,
          mode: 'feedback',
          feedbackResponseCount: newCount,
          lastExchange: {
            query: patch.messages[patch.messages.length - 2]?.content || '',
            response: event.fullContent
          }
        }
      }

      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: state.pendingSuggestions,
        selectedSuggestionIdx: 0,
        feedbackResponseCount: newCount,
        lastExchange: {
          query: patch.messages[patch.messages.length - 2]?.content || '',
          response: event.fullContent
        }
      }
    }

    case 'STREAM_ERROR': {
      if (state.mode !== 'loading') return state
      const patch = addMessage(state, { role: 'system', content: `${icons.error} ${event.error}` })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }
    }

    case 'STREAM_CANCEL': {
      if (state.mode !== 'loading') return state
      const patch = addMessage(state, { role: 'system', content: '⏹ 취소됨' })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }
    }

    // ─── Suggestions ────────────────────────────────────
    case 'SUGGESTION_UP':
      if (state.mode !== 'idle') return state
      return { ...state, selectedSuggestionIdx: Math.max(0, state.selectedSuggestionIdx - 1) }

    case 'SUGGESTION_DOWN':
      if (state.mode !== 'idle') return state
      return {
        ...state,
        selectedSuggestionIdx: Math.min(
          state.suggestedQuestions.length - 1,
          state.selectedSuggestionIdx + 1
        )
      }

    case 'SUGGESTION_SELECT':
      if (state.mode !== 'idle') return state
      return { ...state, input: event.question, suggestedQuestions: [], selectedSuggestionIdx: 0 }

    case 'SUGGESTION_DISMISS':
      if (state.mode !== 'idle') return state
      return { ...state, suggestedQuestions: [], selectedSuggestionIdx: 0 }

    // ─── Sources panel ──────────────────────────────────
    case 'TOGGLE_SOURCES': {
      if (state.mode !== 'idle') return state
      const lastWithSources = [...state.messages]
        .reverse()
        .find((m) => m.role === 'assistant' && m.sources && m.sources.length > 0)
      if (!lastWithSources) return state
      return {
        ...state,
        expandedSourcesMsgId:
          state.expandedSourcesMsgId === lastWithSources.id ? null : lastWithSources.id
      }
    }

    // ─── Email ──────────────────────────────────────────
    case 'EMAIL_CHANGE':
      if (state.mode !== 'emailInput') return state
      return { ...state, emailInput: event.value }

    case 'EMAIL_SUBMIT_SUCCESS': {
      if (state.mode !== 'emailInput') return state
      const patch = addMessage(state, {
        role: 'system',
        content: `${icons.check} ${event.message}`
      })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }
    }

    case 'EMAIL_SUBMIT_ERROR': {
      if (state.mode !== 'emailInput') return state
      const patch = addMessage(state, {
        role: 'system',
        content: `${icons.error} ${event.message}`
      })
      return { ...state, ...patch }
    }

    case 'EMAIL_DISMISS': {
      if (state.mode !== 'emailInput') return state
      const patch = addMessage(state, {
        role: 'system',
        content: `${icons.info} 이번 세션에서 이메일 안내를 숨겨요.`
      })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0,
        hideEmailForSession: true
      }
    }

    // ─── Feedback ───────────────────────────────────────
    case 'FEEDBACK_RATE':
      if (state.mode !== 'feedback') return state
      return { ...state, mode: 'feedbackConfirmed' }

    case 'FEEDBACK_SKIP':
      if (state.mode !== 'feedback') return state
      return { ...state, mode: 'idle', input: '', suggestedQuestions: [], selectedSuggestionIdx: 0 }

    case 'FEEDBACK_DISABLE':
      if (state.mode !== 'feedback') return state
      return {
        ...state,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0,
        hideFeedbackForSession: true
      }

    case 'FEEDBACK_CONFIRMED_DONE':
      if (state.mode !== 'feedbackConfirmed') return state
      return { ...state, mode: 'idle', input: '', suggestedQuestions: [], selectedSuggestionIdx: 0 }

    // ─── Exit feedback ──────────────────────────────────
    case 'EXIT_FEEDBACK_SHOW':
      return { ...state, mode: 'exitFeedback' }

    case 'EXIT_FEEDBACK_RATE':
      // Side effect (exit) handled by app.ts
      return state

    // ─── Commands ───────────────────────────────────────
    case 'CMD_HELP': {
      const patch = addMessage(state, { role: 'system', content: event.helpText })
      return { ...state, ...patch }
    }

    case 'CMD_STATUS_OK': {
      const patch = addMessage(state, { role: 'system', content: event.statusText })
      return { ...state, ...patch }
    }

    case 'CMD_STATUS_FAIL': {
      const patch = addMessage(state, { role: 'system', content: `${icons.error} 상태 조회 실패` })
      return { ...state, ...patch }
    }

    case 'CMD_CLEAR': {
      const { id, nextMessageId } = nextId(state)
      return {
        ...state,
        messages: [{ id, role: 'system', content: `${icons.check} 초기화 완료` }],
        nextMessageId,
        sessionId: undefined,
        expandedSourcesMsgId: null
      }
    }

    // ─── Correction ─────────────────────────────────────
    case 'CORRECTION_SUCCESS': {
      const patch = addMessage(state, {
        role: 'system',
        content: `${icons.check} ${event.message}`
      })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }
    }

    case 'CORRECTION_FAIL': {
      const patch = addMessage(state, {
        role: 'system',
        content: `${icons.error} ${event.message}`
      })
      return {
        ...state,
        ...patch,
        mode: 'idle',
        input: '',
        suggestedQuestions: [],
        selectedSuggestionIdx: 0
      }
    }

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────

export function createInitialState(): AppState {
  return {
    mode: 'connecting',
    messages: [],
    sessionId: undefined,
    nextMessageId: 1,
    feedbackResponseCount: 0,
    hideFeedbackForSession: false,
    hideEmailForSession: false,
    lastExchange: null,
    expandedSourcesMsgId: null
  }
}
