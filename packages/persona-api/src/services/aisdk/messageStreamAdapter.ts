/**
 * Message Stream Adapter
 *
 * RAGStreamEvent → AI SDK Data Stream Protocol 변환
 * LangGraph의 streamMode: 'custom' 이벤트를 AI SDK 포맷으로 변환
 *
 * @see https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
 */

import type { ChatStreamEvent } from '../chatService'
import { type CustomDataPart, DATA_STREAM_TYPES } from './types'

// ─────────────────────────────────────────────────────────────
// Stream Protocol Helpers
// ─────────────────────────────────────────────────────────────

/**
 * AI SDK Data Stream 포맷으로 인코딩
 */
function encodeDataStreamPart(type: string, data: unknown): string {
  return `${type}:${JSON.stringify(data)}\n`
}

/**
 * 텍스트 파트 인코딩
 */
function encodeText(content: string): string {
  return encodeDataStreamPart(DATA_STREAM_TYPES.TEXT, content)
}

/**
 * 커스텀 데이터 파트 인코딩
 */
function encodeData(data: CustomDataPart): string {
  return encodeDataStreamPart(DATA_STREAM_TYPES.DATA, [data])
}

/**
 * 에러 파트 인코딩
 */
function encodeError(error: string): string {
  return encodeDataStreamPart(DATA_STREAM_TYPES.ERROR, error)
}

/**
 * 완료 메시지 인코딩
 */
function encodeFinish(finishReason: string = 'stop'): string {
  return encodeDataStreamPart(DATA_STREAM_TYPES.FINISH, {
    finishReason,
    usage: { promptTokens: 0, completionTokens: 0 }
  })
}

// ─────────────────────────────────────────────────────────────
// Event Converter
// ─────────────────────────────────────────────────────────────

/**
 * ChatStreamEvent를 AI SDK Data Stream 포맷으로 변환
 */
export function convertToDataStreamPart(event: ChatStreamEvent): string {
  switch (event.type) {
    // session 이벤트 → data-session (transient - UI 상태만)
    case 'session':
      return encodeData({
        type: 'data-session',
        sessionId: event.sessionId,
        transient: true
      })

    // content 이벤트 → text part
    case 'content':
      return encodeText(event.content)

    // sources 이벤트 → data-sources (커스텀 Document 타입 유지)
    case 'sources':
      return encodeData({
        type: 'data-sources',
        sources: event.sources
      })

    // progress 이벤트 → data-progress (transient - UI 상태만, 메시지에 저장 안 됨)
    case 'progress':
      return encodeData({
        type: 'data-progress',
        items: event.items,
        transient: true
      })

    // clarification 이벤트 → data-clarification
    case 'clarification':
      return encodeData({
        type: 'data-clarification',
        suggestedQuestions: event.suggestedQuestions
      })

    // escalation 이벤트 → data-escalation (transient - 알림성 데이터)
    case 'escalation':
      return encodeData({
        type: 'data-escalation',
        reason: event.reason,
        uncertainty: event.uncertainty,
        transient: true
      })

    // followup 이벤트 → data-followup
    case 'followup':
      return encodeData({
        type: 'data-followup',
        suggestedQuestions: event.suggestedQuestions
      })

    // done 이벤트 → data-done + finish (transient - 메타데이터)
    case 'done':
      return (
        encodeData({
          type: 'data-done',
          metadata: event.metadata,
          transient: true
        }) + encodeFinish('stop')
      )

    // error 이벤트 → error part
    case 'error':
      return encodeError(event.error)

    default:
      console.warn('[messageStreamAdapter] Unknown event type:', (event as { type: string }).type)
      return ''
  }
}

// ─────────────────────────────────────────────────────────────
// Stream Transformer
// ─────────────────────────────────────────────────────────────

/**
 * ChatStreamEvent 제너레이터를 AI SDK Data Stream으로 변환
 */
export async function* transformToDataStream(
  eventStream: AsyncGenerator<ChatStreamEvent>
): AsyncGenerator<string> {
  try {
    for await (const event of eventStream) {
      const part = convertToDataStreamPart(event)
      if (part) {
        yield part
      }
    }
  } catch (error) {
    console.error('[messageStreamAdapter] Stream error:', error)
    yield encodeError('스트림 처리 중 오류가 발생했습니다.')
    yield encodeFinish('error')
  }
}

/**
 * ReadableStream 생성 (Response body용)
 */
export function createDataStreamResponse(
  eventStream: AsyncGenerator<ChatStreamEvent>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of eventStream) {
          const part = convertToDataStreamPart(event)
          if (part) {
            controller.enqueue(encoder.encode(part))
          }
        }
        controller.close()
      } catch (error) {
        console.error('[messageStreamAdapter] ReadableStream error:', error)
        controller.enqueue(encoder.encode(encodeError('스트림 처리 중 오류가 발생했습니다.')))
        controller.enqueue(encoder.encode(encodeFinish('error')))
        controller.close()
      }
    }
  })
}
