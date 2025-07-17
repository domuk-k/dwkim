import type { FastifyInstance } from 'fastify';
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

  constructor(redis: Redis, options: RateLimitOptions) {
    this.redis = redis;
    this.options = {
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      ...options,
    };
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

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

      return {
        allowed: true,
        remaining: this.options.max - requests.length - 1,
        resetTime: now + this.options.windowMs,
        limit: this.options.max,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Redis 오류 시 기본적으로 허용
      return {
        allowed: true,
        remaining: this.options.max,
        resetTime: now + this.options.windowMs,
        limit: this.options.max,
      };
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

// Fastify 플러그인으로 등록
export async function rateLimitPlugin(fastify: FastifyInstance) {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  // 분당 제한
  const perMinuteLimiter = new RateLimiter(redis, {
    windowMs: 60 * 1000, // 1분
    max: parseInt(process.env.RATE_LIMIT_MAX || '10'),
    message: '분당 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  });

  // 시간당 제한
  const perHourLimiter = new RateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1시간
    max: parseInt(process.env.RATE_LIMIT_HOURLY_MAX || '100'),
    message: '시간당 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
  });

  // 미들웨어 등록
  fastify.addHook('preHandler', async (request, reply) => {
    // 분당 제한 체크
    const minuteCheck = await perMinuteLimiter.checkLimit(
      request.ip || 'unknown'
    );
    if (!minuteCheck.allowed) {
      reply.status(minuteCheck.statusCode || 429).send({
        error: 'Too Many Requests',
        message: minuteCheck.message,
        retryAfter: minuteCheck.retryAfter,
      });
      return;
    }

    // 시간당 제한 체크
    const hourCheck = await perHourLimiter.checkLimit(request.ip || 'unknown');
    if (!hourCheck.allowed) {
      reply.status(hourCheck.statusCode || 429).send({
        error: 'Too Many Requests',
        message: hourCheck.message,
        retryAfter: hourCheck.retryAfter,
      });
      return;
    }

    // 헤더에 남은 요청 수 정보 추가
    reply.header('X-RateLimit-Limit', hourCheck.limit);
    reply.header('X-RateLimit-Remaining', hourCheck.remaining);
    reply.header('X-RateLimit-Reset', hourCheck.resetTime);
  });
}
