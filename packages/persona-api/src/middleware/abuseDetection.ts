import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';

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
  /window\./gi,
];

// 금지된 단어들
const FORBIDDEN_WORDS = [
  'hack',
  'exploit',
  'inject',
  'sql',
  'xss',
  'csrf',
  'admin',
  'root',
  'password',
  'token',
  'key',
  'delete',
  'drop',
  'truncate',
  'alter',
  'create',
];

export class AbuseDetector {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  private getClientIP(request: FastifyRequest): string {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    return Array.isArray(ip) ? ip[0] : ip;
  }

  private async isBlacklisted(ip: string): Promise<boolean> {
    try {
      const result = await this.redis.sismember('abuse:blacklist', ip);
      return result === 1;
    } catch (error) {
      console.error('Blacklist check failed:', error);
      return false;
    }
  }

  private async recordSuspiciousActivity(
    ip: string,
    type: string,
    reason: string
  ): Promise<void> {
    try {
      const key = `abuse:${ip}`;
      const count = await this.redis.incr(key);

      // 1시간 후 만료
      if (count === 1) {
        await this.redis.expire(key, 3600);
      }

      // 5회 이상 의심스러운 활동 시 블랙리스트에 추가
      if (count >= 5) {
        await this.redis.sadd('abuse:blacklist', ip);
        await this.redis.expire('abuse:blacklist', 24 * 3600); // 24시간 블랙리스트
        console.error('IP added to blacklist:', { ip, type, reason, count });
      }

      console.warn('Suspicious activity recorded:', {
        ip,
        type,
        reason,
        count,
      });
    } catch (error) {
      console.error('Failed to record suspicious activity:', error);
    }
  }

  private validateInput(input: string): { isValid: boolean; reason?: string } {
    // 길이 검증
    if (!input || input.trim().length === 0) {
      return { isValid: false, reason: '입력이 비어있습니다' };
    }

    if (input.length > 1000) {
      return { isValid: false, reason: '입력이 너무 깁니다 (최대 1000자)' };
    }

    // 금지어 검증
    const lowerInput = input.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (lowerInput.includes(word)) {
        return {
          isValid: false,
          reason: `금지된 단어가 포함되어 있습니다: ${word}`,
        };
      }
    }

    // 패턴 검증
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, reason: '금지된 패턴이 감지되었습니다' };
      }
    }

    // 특수 문자 비율 검증 (스팸 방지)
    const specialCharRatio =
      (input.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length /
      input.length;
    if (specialCharRatio > 0.3) {
      return { isValid: false, reason: '특수 문자가 너무 많습니다' };
    }

    return { isValid: true };
  }

  async checkAbuse(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<boolean> {
    const clientIP = this.getClientIP(request);

    try {
      // 블랙리스트 확인
      const isBlacklisted = await this.isBlacklisted(clientIP);
      if (isBlacklisted) {
        console.warn('Blocked request from blacklisted IP:', { ip: clientIP });
        reply.status(403).send({ error: 'Access denied' });
        return false;
      }

      // 입력 검증 (POST 요청의 경우)
      if (request.method === 'POST' && request.body) {
        const body = JSON.stringify(request.body);
        const validationResult = this.validateInput(body);

        if (!validationResult.isValid) {
          await this.recordSuspiciousActivity(
            clientIP,
            'invalid_input',
            validationResult.reason!
          );
          reply.status(400).send({ error: validationResult.reason });
          return false;
        }
      }

      // User-Agent 검증
      const userAgent = request.headers['user-agent'] || '';
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(userAgent)) {
          await this.recordSuspiciousActivity(
            clientIP,
            'suspicious_user_agent',
            pattern.source
          );
          reply.status(400).send({ error: 'Invalid request' });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Abuse detection error:', error);
      return true; // 오류 시 요청 허용 (서비스 가용성 우선)
    }
  }
}

// Fastify 플러그인으로 등록
export async function abuseDetectionPlugin(fastify: FastifyInstance) {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const abuseDetector = new AbuseDetector(redis);

  fastify.addHook('preHandler', async (request, reply) => {
    const isAllowed = await abuseDetector.checkAbuse(request, reply);
    if (!isAllowed) {
      return; // 요청 차단
    }
  });
}
