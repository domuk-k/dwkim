/**
 * Message Stream Adapter
 *
 * RAGStreamEvent → AI SDK UI Message Stream 변환
 * LangGraph의 streamMode: 'custom' 이벤트를 AI SDK v6 포맷으로 변환
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessageStreamWriter
} from 'ai'
import type { ChatStreamEvent } from '../chatService'

// 텍스트 블록 ID
const TEXT_BLOCK_ID = 'main-text'

// ─────────────────────────────────────────────────────────────
// Event Converter (UI Message Stream 형식)
// ─────────────────────────────────────────────────────────────

/**
 * ChatStreamEvent를 UI Message Stream 형식으로 변환하여 writer에 쓰기
 */
function writeEventToStream(
  event: ChatStreamEvent,
  writer: UIMessageStreamWriter,
  textStarted: { value: boolean }
): void {
  switch (event.type) {
    // session 이벤트 → data-session (transient)
    case 'session':
      writer.write({
        type: 'data-session',
        data: { sessionId: event.sessionId },
        transient: true
      })
      break

    // content 이벤트 → text-start (if not started) + text-delta
    case 'content':
      if (!textStarted.value) {
        writer.write({
          type: 'text-start',
          id: TEXT_BLOCK_ID
        })
        textStarted.value = true
      }
      writer.write({
        type: 'text-delta',
        id: TEXT_BLOCK_ID,
        delta: event.content
      })
      break

    // sources 이벤트 → data-sources
    case 'sources':
      writer.write({
        type: 'data-sources',
        data: { sources: event.sources }
      })
      break

    // progress 이벤트 → data-progress (transient)
    case 'progress':
      writer.write({
        type: 'data-progress',
        data: { items: event.items },
        transient: true
      })
      break

    // clarification 이벤트 → data-clarification
    case 'clarification':
      writer.write({
        type: 'data-clarification',
        data: { suggestedQuestions: event.suggestedQuestions }
      })
      break

    // escalation 이벤트 → data-escalation (transient)
    case 'escalation':
      writer.write({
        type: 'data-escalation',
        data: {
          reason: event.reason,
          uncertainty: event.uncertainty
        },
        transient: true
      })
      break

    // followup 이벤트 → data-followup
    case 'followup':
      writer.write({
        type: 'data-followup',
        data: { suggestedQuestions: event.suggestedQuestions }
      })
      break

    // done 이벤트 → text-end (if started) + data-done (transient)
    case 'done':
      if (textStarted.value) {
        writer.write({
          type: 'text-end',
          id: TEXT_BLOCK_ID
        })
      }
      writer.write({
        type: 'data-done',
        data: { metadata: event.metadata },
        transient: true
      })
      break

    // error 이벤트 → error
    case 'error':
      writer.write({
        type: 'error',
        errorText: event.error
      })
      break

    default:
      console.warn('[messageStreamAdapter] Unknown event type:', (event as { type: string }).type)
  }
}

// ─────────────────────────────────────────────────────────────
// Stream Creator
// ─────────────────────────────────────────────────────────────

/**
 * ChatStreamEvent 제너레이터를 AI SDK UI Message Stream Response로 변환
 */
export function createStreamResponse(eventStream: AsyncGenerator<ChatStreamEvent>): Response {
  const textStarted = { value: false }

  return createUIMessageStreamResponse({
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    },
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        // Start message
        writer.write({ type: 'start' })

        try {
          for await (const event of eventStream) {
            writeEventToStream(event, writer, textStarted)
          }

          // Finish message
          writer.write({ type: 'finish', finishReason: 'stop' })
        } catch (error) {
          console.error('[messageStreamAdapter] Stream error:', error)
          writer.write({
            type: 'error',
            errorText: '스트림 처리 중 오류가 발생했습니다.'
          })
        }
      }
    })
  })
}

// Legacy export for backwards compatibility
export const createDataStreamResponse = (eventStream: AsyncGenerator<ChatStreamEvent>) =>
  createStreamResponse(eventStream)
