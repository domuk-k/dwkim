import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';

export interface RateLimitOptions {
  windowMs: number; // 시간 윈도우 (밀리초)
  max: number; // 최대 요청 수
  message?: string; // 차단 메시지
  keyGenerator?: (request: FastifyRequest) => string; // 키 생성 함수
}

export class RateLimiter {
  private redis: Redis;
  private options: RateLimitOptions;

  constructor(redis: Redis, options: RateLimitOptions) {
    this.redis = redis;
    this.options = {
      message: 'Rate limit exceeded. Please try again later.',
      keyGenerator: (request: FastifyRequest) => {
        const ip =
          request.ip || request.headers['x-forwarded-for'] || 'unknown';
        return Array.isArray(ip) ? ip[0] : ip;
      },
      ...options,
    };
  }

  async checkLimit(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<boolean> {
    try {
      const key = this.options.keyGenerator!(request);
      const windowKey = `rate_limit:${key}:${Math.floor(Date.now() / this.options.windowMs)}`;

      // 현재 요청 수 확인
      const currentCount = await this.redis.incr(windowKey);

      // 첫 번째 요청이면 만료 시간 설정
      if (currentCount === 1) {
        await this.redis.expire(
          windowKey,
          Math.ceil(this.options.windowMs / 1000)
        );
      }

      // 제한 초과 체크
      if (currentCount > this.options.max) {
        const ttl = await this.redis.ttl(windowKey);

        reply.status(429).send({
          error: 'Too Many Requests',
          message: this.options.message,
          retryAfter: ttl,
        });

        return false;
      }

      // 헤더에 남은 요청 수 정보 추가
      reply.header('X-RateLimit-Limit', this.options.max);
      reply.header(
        'X-RateLimit-Remaining',
        Math.max(0, this.options.max - currentCount)
      );
      reply.header(
        'X-RateLimit-Reset',
        Math.floor(Date.now() / this.options.windowMs) * this.options.windowMs +
          this.options.windowMs
      );

      return true;
    } catch (error) {
      // Redis 오류 시 rate limit 우회 (서비스 가용성 우선)
      console.error('Rate limit check failed:', error);
      return true;
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
    const minuteCheck = await perMinuteLimiter.checkLimit(request, reply);
    if (!minuteCheck) return;

    // 시간당 제한 체크
    const hourCheck = await perHourLimiter.checkLimit(request, reply);
    if (!hourCheck) return;
  });
}
