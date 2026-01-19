import type { IRedisClient } from '../infra/redis'
import { chatLogger } from './chatLogger'

export interface UXLogEntry {
  id: string
  timestamp: string
  deviceId?: string
  sessionId: string
  clientIp: string

  // 요청
  userMessage: string
  rewrittenQuery?: string
  /** 쿼리 재작성 방법: rule(규칙 기반), llm(LLM 기반), none(재작성 안함) */
  rewriteMethod: 'rule' | 'llm' | 'none'
  historyLength: number

  // 응답
  answerPreview: string // 첫 500자
  answerLength: number
  sourcesCount: number
  sourceIds: string[]

  // 메트릭
  processingTimeMs: number
  nodeExecutions?: number
  totalTokens?: number

  // A2UI
  clarificationAsked?: boolean
  suggestedQuestions?: string[]
}

export interface UXLogStats {
  totalLogs: number
  last24Hours: number
  avgProcessingTimeMs: number
  topQueries: Array<{ query: string; count: number }>
}

export class UXLogService {
  private redis: IRedisClient
  private readonly LOG_KEY = 'persona:ux_logs'
  private readonly MAX_LOGS = 100

  constructor(redis: IRedisClient) {
    this.redis = redis
  }

  /**
   * UX 로그 저장 (circular buffer)
   */
  async logInteraction(entry: UXLogEntry): Promise<void> {
    try {
      await this.redis.lpush(this.LOG_KEY, JSON.stringify(entry))
      await this.redis.ltrim(this.LOG_KEY, 0, this.MAX_LOGS - 1)

      // chatLogger에도 기록 (Better Stack으로 전송됨)
      chatLogger.info({
        type: 'ux_interaction',
        ...entry
      })
    } catch (error) {
      chatLogger.error({
        type: 'ux_log_error',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * 최근 로그 조회
   */
  async getRecentLogs(limit = 30): Promise<UXLogEntry[]> {
    const logs = await this.redis.lrange(this.LOG_KEY, 0, limit - 1)
    return logs.map((log) => JSON.parse(log) as UXLogEntry)
  }

  /**
   * ID로 로그 조회
   */
  async getLogById(id: string): Promise<UXLogEntry | null> {
    const logs = await this.redis.lrange(this.LOG_KEY, 0, this.MAX_LOGS - 1)
    for (const log of logs) {
      const entry = JSON.parse(log) as UXLogEntry
      if (entry.id === id) {
        return entry
      }
    }
    return null
  }

  /**
   * 세션별 로그 조회
   */
  async getLogsBySession(sessionId: string): Promise<UXLogEntry[]> {
    const logs = await this.redis.lrange(this.LOG_KEY, 0, this.MAX_LOGS - 1)
    return logs
      .map((log) => JSON.parse(log) as UXLogEntry)
      .filter((entry) => entry.sessionId === sessionId)
  }

  /**
   * 간단한 통계
   */
  async getStats(): Promise<UXLogStats> {
    const logs = await this.getRecentLogs(this.MAX_LOGS)
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    const last24Hours = logs.filter((log) => new Date(log.timestamp).getTime() > oneDayAgo)

    const avgProcessingTime =
      logs.length > 0 ? logs.reduce((sum, log) => sum + log.processingTimeMs, 0) / logs.length : 0

    // 쿼리 빈도 (간단한 집계)
    const queryCount = new Map<string, number>()
    for (const log of logs) {
      const query = log.userMessage.slice(0, 50) // 첫 50자로 그룹화
      queryCount.set(query, (queryCount.get(query) || 0) + 1)
    }

    const topQueries = Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query, count]) => ({ query, count }))

    return {
      totalLogs: logs.length,
      last24Hours: last24Hours.length,
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      topQueries
    }
  }
}

// 싱글톤 인스턴스 (server.ts에서 초기화)
let uxLogServiceInstance: UXLogService | null = null

export function initUXLogService(redis: IRedisClient): UXLogService {
  uxLogServiceInstance = new UXLogService(redis)
  return uxLogServiceInstance
}

export function getUXLogService(): UXLogService {
  if (!uxLogServiceInstance) {
    throw new Error('UXLogService not initialized. Call initUXLogService first.')
  }
  return uxLogServiceInstance
}
