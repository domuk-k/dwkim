import pino from 'pino'
import { env } from '../config/env'

export interface ChatLogEntry {
  requestId: string
  timestamp: string
  clientIp: string
  userAgent?: string
  request: {
    message: string
    historyLength: number
  }
  response?: {
    answerPreview: string // 첫 100자
    sourcesCount: number
    processingTimeMs: number
  }
  error?: string
  engine: 'deepagent' | 'rag' | 'mock'
}

// 로거 생성
function createChatLogger() {
  const baseOptions: pino.LoggerOptions = {
    name: 'chat',
    level: env.LOG_LEVEL
  }

  // Production + Logtail: Better Stack으로 전송
  if (env.NODE_ENV === 'production' && env.LOGTAIL_TOKEN) {
    console.log('Chat logger: Better Stack enabled')
    try {
      let logtailErrorLogged = false
      const transport = pino.transport({
        targets: [
          // stdout (Fly.io 기본 로깅용)
          { target: 'pino/file', options: { destination: 1 } },
          // Better Stack
          {
            target: '@logtail/pino',
            options: { sourceToken: env.LOGTAIL_TOKEN }
          }
        ]
      })

      transport.on('error', (err: Error) => {
        if (!logtailErrorLogged) {
          logtailErrorLogged = true
          console.warn('Chat logger: Logtail transport error (will not repeat):', err.message)
        }
      })

      return pino(baseOptions, transport)
    } catch (err) {
      console.warn(
        'Chat logger: Logtail transport initialization failed, falling back to stdout:',
        err instanceof Error ? err.message : err
      )
      return pino(baseOptions)
    }
  }

  // Development: pretty print
  if (env.NODE_ENV !== 'production') {
    return pino({
      ...baseOptions,
      transport: { target: 'pino-pretty', options: { colorize: true } }
    })
  }

  // Production without Logtail: JSON to stdout
  return pino(baseOptions)
}

export const chatLogger = createChatLogger()

// 간편 로깅 함수들
export function logChatRequest(entry: Omit<ChatLogEntry, 'timestamp' | 'response'>) {
  chatLogger.info({
    type: 'chat_request',
    ...entry,
    timestamp: new Date().toISOString()
  })
}

export function logChatResponse(entry: ChatLogEntry) {
  chatLogger.info({
    type: 'chat_response',
    ...entry
  })
}

export function logChatError(requestId: string, clientIp: string, message: string, error: unknown) {
  chatLogger.error({
    type: 'chat_error',
    requestId,
    clientIp,
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  })
}

// 요청 ID 생성
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
