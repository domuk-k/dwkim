import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import fastifyRedis from '@fastify/redis';
import Redis from 'ioredis';

import healthRoutes from './routes/health';
import chatRoutes from './routes/chat';
import { RateLimiter } from './middleware/rateLimit';
import { AbuseDetection } from './middleware/abuseDetection';

export async function createServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // CORS 설정
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
  });

  // Redis 연결
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  await fastify.register(fastifyRedis, { client: redis });

  // Rate Limiting
  await fastify.register(rateLimit, {
    redis,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
    errorResponseBuilder: (request, context) => ({
      code: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      expiresIn: context.after,
    }),
  });

  // 커스텀 미들웨어 등록
  const rateLimiter = new RateLimiter(redis, {
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 최대 100개 요청
  });

  const abuseDetection = new AbuseDetection(redis, {
    suspiciousPatterns: [/script/i, /<.*>/, /javascript:/i, /on\w+\s*=/i],
    maxConsecutiveErrors: 5,
    blockDuration: 30 * 60 * 1000, // 30분
  });

  // 미들웨어 적용
  fastify.addHook('preHandler', async (request, reply) => {
    const clientIp = request.ip;

    // Rate limiting 체크
    const rateLimitResult = await rateLimiter.checkLimit(clientIp);
    if (!rateLimitResult.allowed) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    // Abuse detection 체크
    const abuseResult = await abuseDetection.checkAbuse(request, reply);
    if (!abuseResult) {
      // checkAbuse에서 이미 응답을 보냈으므로 여기서는 return만
      return;
    }
  });

  // Swagger 설정
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Persona API',
        description: '개인화된 RAG+LLM 기반 챗봇 API',
        version: '1.0.0',
        contact: {
          name: 'dwkim',
          email: 'dwkim@example.com',
        },
      },
      host: process.env.API_HOST || 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'Health', description: '헬스체크 관련 엔드포인트' },
        { name: 'Chat', description: '채팅 관련 엔드포인트' },
        { name: 'Search', description: '문서 검색 엔드포인트' },
        { name: 'System', description: '시스템 관리 엔드포인트' },
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // 라우트 등록
  await fastify.register(healthRoutes, { prefix: '/health' });
  await fastify.register(chatRoutes, { prefix: '/api/v1' });

  // 전역 에러 핸들러
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: '입력 데이터 검증에 실패했습니다.',
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: '서버 내부 오류가 발생했습니다.',
    });
  });

  // 404 핸들러
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: '요청한 리소스를 찾을 수 없습니다.',
      path: request.url,
    });
  });

  return fastify;
}

// Export build function for testing
export { createServer as build };
