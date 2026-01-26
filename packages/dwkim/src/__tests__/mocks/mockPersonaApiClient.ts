import type { PersonaApiClient, StreamEvent } from '../../utils/personaApiClient.js'

interface MockClientOptions {
  healthCheck?: boolean
  streamEvents?: StreamEvent[]
  /** 이벤트 간 지연 (ms). React가 중간 렌더링할 시간을 확보. 기본값 0. */
  eventDelay?: number
  statusResponse?: { status: string; rag_engine?: { total_documents: number } }
}

/**
 * PersonaApiClient의 핵심 메서드만 mock
 * ChatView에서 사용하는 메서드: checkHealth, chatStream, abort, submitFeedback, submitCorrection, getStatus
 */
export function createMockClient(opts: MockClientOptions = {}): PersonaApiClient {
  const { healthCheck = true, streamEvents = [], eventDelay = 0, statusResponse } = opts

  const client = {
    checkHealth: async () => {
      if (!healthCheck) throw new Error('API down')
    },
    chatStream: async function* (_message: string, _sessionId?: string) {
      for (const event of streamEvents) {
        if (eventDelay > 0) {
          await new Promise((r) => setTimeout(r, eventDelay))
        }
        yield event
      }
    },
    abort: () => {},
    submitFeedback: async () => {},
    submitCorrection: async () => ({ success: true, message: '수정 반영됨' }),
    getStatus: async () => statusResponse ?? { status: 'ok', timestamp: new Date().toISOString() }
  }

  return client as unknown as PersonaApiClient
}
