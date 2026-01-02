import { Redis } from 'ioredis';

interface RateLimitOptions {
  windowMs: number; // 시간 윈도우 (밀리초)
  max: number; // 최대 요청 수
  message?: string; // 차단 메시지
  statusCode?: number; // HTTP 상태 코드
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  statusCode?: number;
  message?: string;
  limit?: number;
}

export class RateLimiter {
  private redis: Redis;
  private options: RateLimitOptions;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;
  private circuitOpenUntil = 0;
  private readonly circuitResetMs = 30000; // 30초 후 circuit 재시도

  // In-memory fallback (Redis 장애 시)
  private memoryStore = new Map<string, { count: number; resetTime: number }>();

  constructor(redis: Redis, options: RateLimitOptions) {
    this.redis = redis;
    this.options = {
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      ...options,
    };
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil > Date.now()) {
      return true;
    }
    // Circuit이 닫혔으면 상태 리셋
    if (this.circuitOpenUntil > 0) {
      this.consecutiveFailures = 0;
      this.circuitOpenUntil = 0;
    }
    return false;
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.circuitOpenUntil = Date.now() + this.circuitResetMs;
      console.warn('RateLimiter: Circuit opened due to consecutive Redis failures');
    }
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  private checkMemoryLimit(identifier: string, now: number): RateLimitResult {
    const entry = this.memoryStore.get(identifier);

    if (!entry || entry.resetTime < now) {
      // 새 윈도우 시작
      this.memoryStore.set(identifier, {
        count: 1,
        resetTime: now + this.options.windowMs
      });
      return {
        allowed: true,
        remaining: this.options.max - 1,
        resetTime: now + this.options.windowMs,
        limit: this.options.max,
      };
    }

    if (entry.count >= this.options.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        statusCode: this.options.statusCode,
        message: this.options.message,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.options.max - entry.count,
      resetTime: entry.resetTime,
      limit: this.options.max,
    };
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Circuit이 열려있으면 memory fallback 사용
    if (this.isCircuitOpen()) {
      console.debug('RateLimiter: Using memory fallback (circuit open)');
      return this.checkMemoryLimit(identifier, now);
    }

    try {
      // Redis에서 현재 윈도우의 요청 수 가져오기
      const requests = await this.redis.zrangebyscore(key, windowStart, '+inf');

      if (requests.length >= this.options.max) {
        // 윈도우의 첫 번째 요청 시간 확인
        const firstRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime =
          firstRequest.length > 0
            ? parseInt(firstRequest[1]) + this.options.windowMs
            : now + this.options.windowMs;

        this.recordSuccess();
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
          statusCode: this.options.statusCode,
          message: this.options.message,
        };
      }

      // 새 요청 추가
      await this.redis.zadd(key, now, now.toString());
      await this.redis.expire(key, Math.ceil(this.options.windowMs / 1000));

      this.recordSuccess();
      return {
        allowed: true,
        remaining: this.options.max - requests.length - 1,
        resetTime: now + this.options.windowMs,
        limit: this.options.max,
      };
    } catch (error) {
      console.error('Rate limiting Redis error:', error);
      this.recordFailure();
      // Redis 오류 시 memory fallback 사용 (fail-open 대신)
      return this.checkMemoryLimit(identifier, now);
    }
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Graceful shutdown 시 memory 데이터를 Redis로 동기화
   */
  async syncToRedis(): Promise<void> {
    if (this.memoryStore.size === 0) {
      console.log('RateLimiter: No memory data to sync');
      return;
    }

    const now = Date.now();
    let synced = 0;

    for (const [identifier, entry] of this.memoryStore.entries()) {
      // 만료되지 않은 항목만 동기화
      if (entry.resetTime > now) {
        try {
          const key = `rate_limit:${identifier}`;
          const ttl = Math.ceil((entry.resetTime - now) / 1000);

          // 현재 카운트만큼 Redis에 기록
          for (let i = 0; i < entry.count; i++) {
            await this.redis.zadd(key, now - i, (now - i).toString());
          }
          await this.redis.expire(key, ttl);
          synced++;
        } catch (error) {
          console.error(`RateLimiter: Failed to sync ${identifier}:`, error);
        }
      }
    }

    console.log(`RateLimiter: Synced ${synced}/${this.memoryStore.size} entries to Redis`);
    this.memoryStore.clear();
  }

  async getLimitInfo(identifier: string): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    try {
      const requests = await this.redis.zrangebyscore(key, windowStart, '+inf');
      const resetTime = now + this.options.windowMs;

      return {
        current: requests.length,
        limit: this.options.max,
        remaining: Math.max(0, this.options.max - requests.length),
        resetTime,
      };
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
      return {
        current: 0,
        limit: this.options.max,
        remaining: this.options.max,
        resetTime: now + this.options.windowMs,
      };
    }
  }
}
