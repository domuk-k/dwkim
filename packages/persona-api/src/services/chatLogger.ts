import pino from 'pino';

export interface ChatLogEntry {
  requestId: string;
  timestamp: string;
  clientIp: string;
  userAgent?: string;
  request: {
    message: string;
    historyLength: number;
  };
  response?: {
    answerPreview: string; // 첫 100자
    sourcesCount: number;
    processingTimeMs: number;
  };
  error?: string;
  engine: 'deepagent' | 'rag' | 'mock';
}

// 콘솔 로깅만 (Fly.io가 자동 수집)
export const chatLogger = pino({
  name: 'chat',
  level: process.env.LOG_LEVEL || 'info',
  // production에서는 JSON, dev에서는 pretty
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

// 간편 로깅 함수들
export function logChatRequest(entry: Omit<ChatLogEntry, 'timestamp' | 'response'>) {
  chatLogger.info({
    type: 'chat_request',
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

export function logChatResponse(entry: ChatLogEntry) {
  chatLogger.info({
    type: 'chat_response',
    ...entry,
  });
}

export function logChatError(
  requestId: string,
  clientIp: string,
  message: string,
  error: unknown
) {
  chatLogger.error({
    type: 'chat_error',
    requestId,
    clientIp,
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });
}

// 요청 ID 생성
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
