import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Redis } from 'ioredis'

// 금지된 패턴들
const FORBIDDEN_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /union\s+select/gi,
  /drop\s+table/gi,
  /exec\s+sp_/gi,
  /eval\s*\(/gi,
  /document\./gi,
  /window\./gi
]

// 금지된 단어들 (실제 악의적인 것만)
const FORBIDDEN_WORDS = [
  'hack',
  'exploit',
  'sql injection',
  'xss attack',
  'csrf token',
  'drop table',
  'delete from',
  'truncate table',
  'union select'
]

interface AbuseDetectionOptions {
  suspiciousPatterns: RegExp[]
  maxConsecutiveErrors: number
  blockDuration: number // 밀리초
  errorThreshold?: number
}

export interface AbuseResult {
  blocked: boolean
  reason?: string
  blockExpiry?: number
}

export class AbuseDetection {
  private redis: Redis
  private options: Required<AbuseDetectionOptions>

  // Circuit breaker state
  private consecutiveFailures = 0
  private readonly maxConsecutiveFailures = 3
  private circuitOpenUntil = 0
  private readonly circuitResetMs = 30000 // 30초

  // In-memory fallback
  private memoryBlacklist = new Set<string>()
  private memorySuspiciousCount = new Map<string, number>()

  constructor(redis: Redis, options: AbuseDetectionOptions) {
    this.redis = redis
    this.options = {
      errorThreshold: 10,
      ...options
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil > Date.now()) {
      return true
    }
    if (this.circuitOpenUntil > 0) {
      this.consecutiveFailures = 0
      this.circuitOpenUntil = 0
    }
    return false
  }

  private recordRedisFailure(): void {
    this.consecutiveFailures++
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.circuitOpenUntil = Date.now() + this.circuitResetMs
      console.warn('AbuseDetection: Circuit opened due to consecutive Redis failures')
    }
  }

  private recordRedisSuccess(): void {
    this.consecutiveFailures = 0
  }

  private isMemoryBlacklisted(ip: string): boolean {
    return this.memoryBlacklist.has(ip)
  }

  private recordMemorySuspiciousActivity(ip: string): void {
    const count = (this.memorySuspiciousCount.get(ip) || 0) + 1
    this.memorySuspiciousCount.set(ip, count)
    if (count >= 5) {
      this.memoryBlacklist.add(ip)
      console.warn('AbuseDetection: IP added to memory blacklist:', ip)
    }
  }

  private getClientIP(request: FastifyRequest): string {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown'
    return Array.isArray(ip) ? ip[0] : ip
  }

  private async isBlacklisted(ip: string): Promise<boolean> {
    // Circuit이 열려있으면 memory fallback
    if (this.isCircuitOpen()) {
      return this.isMemoryBlacklisted(ip)
    }

    try {
      const result = await this.redis.sismember('abuse:blacklist', ip)
      this.recordRedisSuccess()
      return result === 1
    } catch (error) {
      console.error('Blacklist check failed:', error)
      this.recordRedisFailure()
      // Redis 실패 시 memory blacklist 확인
      return this.isMemoryBlacklisted(ip)
    }
  }

  private async recordSuspiciousActivity(ip: string, type: string, reason: string): Promise<void> {
    // Circuit이 열려있으면 memory fallback
    if (this.isCircuitOpen()) {
      this.recordMemorySuspiciousActivity(ip)
      console.warn('Suspicious activity recorded (memory):', { ip, type, reason })
      return
    }

    try {
      const key = `abuse:${ip}`
      const count = await this.redis.incr(key)

      // 1시간 후 만료
      if (count === 1) {
        await this.redis.expire(key, 3600)
      }

      // 5회 이상 의심스러운 활동 시 블랙리스트에 추가
      if (count >= 5) {
        await this.redis.sadd('abuse:blacklist', ip)
        await this.redis.expire('abuse:blacklist', 24 * 3600) // 24시간 블랙리스트
        this.memoryBlacklist.add(ip) // memory에도 동기화
        console.error('IP added to blacklist:', { ip, type, reason, count })
      }

      this.recordRedisSuccess()
      console.warn('Suspicious activity recorded:', {
        ip,
        type,
        reason,
        count
      })
    } catch (error) {
      console.error('Failed to record suspicious activity:', error)
      this.recordRedisFailure()
      // Redis 실패해도 memory에는 기록
      this.recordMemorySuspiciousActivity(ip)
    }
  }

  private validateInput(input: string): { isValid: boolean; reason?: string } {
    // 길이 검증
    if (!input || input.trim().length === 0) {
      return { isValid: false, reason: '입력이 비어있습니다' }
    }

    if (input.length > 1000) {
      return { isValid: false, reason: '입력이 너무 깁니다 (최대 1000자)' }
    }

    // 금지어 검증
    const lowerInput = input.toLowerCase()
    for (const word of FORBIDDEN_WORDS) {
      if (lowerInput.includes(word)) {
        return {
          isValid: false,
          reason: `금지된 단어가 포함되어 있습니다: ${word}`
        }
      }
    }

    // 패턴 검증 (XSS/SQL Injection)
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: '금지된 패턴이 감지되었습니다' }
      }
    }

    // 특수 문자 비율 검증 (실제 스팸성 문자만)
    const spamCharRatio =
      (input.match(/[!@#$%^&*]{3,}|[<>]{2,}|[=]{3,}/g) || []).length / input.length
    if (spamCharRatio > 0.1) {
      return { isValid: false, reason: '스팸성 문자가 감지되었습니다' }
    }

    return { isValid: true }
  }

  async checkAbuse(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const clientIP = this.getClientIP(request)
    const url = request.url || ''

    // /sync/* 경로는 내부 사용이므로 입력 길이 검증 건너뛰기
    const isSyncRoute = url.startsWith('/sync/') || url.startsWith('/api/v1/sync/')

    try {
      // 블랙리스트 확인 (sync 경로도 블랙리스트는 확인)
      const isBlacklisted = await this.isBlacklisted(clientIP)
      if (isBlacklisted && !isSyncRoute) {
        console.warn('Blocked request from blacklisted IP:', { ip: clientIP })
        reply.status(403).send({ error: 'Access denied' })
        return false
      }

      // 입력 검증 (POST 요청의 경우, sync 경로 제외)
      if (request.method === 'POST' && request.body && !isSyncRoute) {
        const body = JSON.stringify(request.body)
        const validationResult = this.validateInput(body)

        if (!validationResult.isValid) {
          await this.recordSuspiciousActivity(clientIP, 'invalid_input', validationResult.reason!)
          reply.status(400).send({ error: validationResult.reason })
          return false
        }
      }

      // User-Agent 검증
      const userAgent = request.headers['user-agent'] || ''
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(userAgent)) {
          await this.recordSuspiciousActivity(clientIP, 'suspicious_user_agent', pattern.source)
          reply.status(400).send({ error: 'Invalid request' })
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Abuse detection error:', error)
      this.recordRedisFailure()
      // Redis 완전 실패 시에도 memory blacklist 확인 (fail-open 방지)
      if (this.isMemoryBlacklisted(clientIP)) {
        console.warn('Blocked request from memory blacklisted IP:', { ip: clientIP })
        reply.status(403).send({ error: 'Access denied' })
        return false
      }
      // 입력 검증은 Redis 없이도 동작 가능
      if (request.method === 'POST' && request.body) {
        const body = JSON.stringify(request.body)
        const validationResult = this.validateInput(body)
        if (!validationResult.isValid) {
          this.recordMemorySuspiciousActivity(clientIP)
          reply.status(400).send({ error: validationResult.reason })
          return false
        }
      }
      return true // 기본 검증 통과 시에만 허용
    }
  }

  /**
   * Graceful shutdown 시 memory 데이터를 Redis로 동기화
   */
  async syncToRedis(): Promise<void> {
    if (this.memoryBlacklist.size === 0 && this.memorySuspiciousCount.size === 0) {
      console.log('AbuseDetection: No memory data to sync')
      return
    }

    let synced = 0

    // Blacklist 동기화
    for (const ip of this.memoryBlacklist) {
      try {
        await this.redis.sadd('abuse:blacklist', ip)
        synced++
      } catch (error) {
        console.error(`AbuseDetection: Failed to sync blacklist ${ip}:`, error)
      }
    }

    // Suspicious count 동기화
    for (const [ip, count] of this.memorySuspiciousCount.entries()) {
      try {
        const key = `abuse:${ip}`
        await this.redis.incrby(key, count)
        await this.redis.expire(key, 3600) // 1시간
        synced++
      } catch (error) {
        console.error(`AbuseDetection: Failed to sync count ${ip}:`, error)
      }
    }

    console.log(`AbuseDetection: Synced ${synced} entries to Redis`)
    this.memoryBlacklist.clear()
    this.memorySuspiciousCount.clear()
  }

  async recordViolation(identifier: string, reason: string): Promise<void> {
    try {
      const errorKey = `abuse_errors:${identifier}`
      const totalErrorKey = `abuse_total_errors:${identifier}`

      // 연속 오류 수 증가
      await this.redis.incr(errorKey)
      await this.redis.expire(errorKey, 3600) // 1시간 만료

      // 전체 오류 수 증가
      await this.redis.incr(totalErrorKey)
      await this.redis.expire(totalErrorKey, 86400) // 24시간 만료

      // 위반 기록
      const violationKey = `abuse_violations:${identifier}`
      await this.redis.lpush(
        violationKey,
        JSON.stringify({
          timestamp: Date.now(),
          reason
        })
      )
      await this.redis.ltrim(violationKey, 0, 99) // 최근 100개만 유지
      await this.redis.expire(violationKey, 86400) // 24시간 만료
    } catch (error) {
      console.error('Failed to record violation:', error)
    }
  }

  async blockIdentifier(identifier: string, reason: string): Promise<void> {
    try {
      const blockKey = `abuse_block:${identifier}`
      await this.redis.setex(blockKey, Math.ceil(this.options.blockDuration / 1000), reason)

      console.log(`Blocked identifier ${identifier} for ${this.options.blockDuration}ms: ${reason}`)
    } catch (error) {
      console.error('Failed to block identifier:', error)
    }
  }

  async unblockIdentifier(identifier: string): Promise<void> {
    try {
      const blockKey = `abuse_block:${identifier}`
      await this.redis.del(blockKey)

      console.log(`Unblocked identifier: ${identifier}`)
    } catch (error) {
      console.error('Failed to unblock identifier:', error)
    }
  }

  async getAbuseInfo(identifier: string): Promise<{
    isBlocked: boolean
    blockExpiry?: number
    consecutiveErrors: number
    totalErrors: number
    recentViolations: any[]
  }> {
    try {
      const blockKey = `abuse_block:${identifier}`
      const errorKey = `abuse_errors:${identifier}`
      const totalErrorKey = `abuse_total_errors:${identifier}`
      const violationKey = `abuse_violations:${identifier}`

      const [isBlocked, blockExpiry, consecutiveErrors, totalErrors, violations] =
        await Promise.all([
          this.redis.get(blockKey),
          this.redis.ttl(blockKey),
          this.redis.get(errorKey),
          this.redis.get(totalErrorKey),
          this.redis.lrange(violationKey, 0, 9) // 최근 10개 위반
        ])

      return {
        isBlocked: !!isBlocked,
        blockExpiry: isBlocked && blockExpiry > 0 ? Date.now() + blockExpiry * 1000 : undefined,
        consecutiveErrors: consecutiveErrors ? parseInt(consecutiveErrors, 10) : 0,
        totalErrors: totalErrors ? parseInt(totalErrors, 10) : 0,
        recentViolations: violations.map((v) => JSON.parse(v))
      }
    } catch (error) {
      console.error('Failed to get abuse info:', error)
      return {
        isBlocked: false,
        consecutiveErrors: 0,
        totalErrors: 0,
        recentViolations: []
      }
    }
  }

  async resetAbuseCounters(identifier: string): Promise<void> {
    try {
      const errorKey = `abuse_errors:${identifier}`
      const totalErrorKey = `abuse_total_errors:${identifier}`

      await this.redis.del(errorKey)
      await this.redis.del(totalErrorKey)

      console.log(`Reset abuse counters for identifier: ${identifier}`)
    } catch (error) {
      console.error('Failed to reset abuse counters:', error)
    }
  }
}

interface AbuseDetectionPluginOptions {
  redis: Redis
}

// Fastify 플러그인으로 등록
export async function abuseDetectionPlugin(
  fastify: FastifyInstance,
  options: AbuseDetectionPluginOptions
) {
  const abuseDetector = new AbuseDetection(options.redis, {
    suspiciousPatterns: FORBIDDEN_PATTERNS,
    maxConsecutiveErrors: 10,
    blockDuration: 3600000, // 1 hour
    errorThreshold: 10
  })

  fastify.addHook('preHandler', async (request, reply) => {
    const isAllowed = await abuseDetector.checkAbuse(request, reply)
    if (!isAllowed) {
      return // 요청 차단
    }
  })
}
